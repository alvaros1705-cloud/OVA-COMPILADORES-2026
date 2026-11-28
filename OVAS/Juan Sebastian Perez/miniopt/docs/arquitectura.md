# Arquitectura de MiniOpt

## 1. Vista general

MiniOpt es una aplicación estática de una sola página. El motor de optimización está separado de la interfaz y no depende del DOM, lo que permite ejecutarlo con `node --test` y reutilizarlo desde cualquier cliente.

```text
┌──────────────────────────────────────────────────────────────┐
│ index.html + css/miniopt.css                                 │
│   editor TAC · pestañas · métricas · diff · traza · ayuda    │
└──────────────────────────────┬───────────────────────────────┘
                               │ eventos
┌──────────────────────────────▼───────────────────────────────┐
│ js/ui.js                                                     │
│   lee opciones, invoca optimize()/nextStep(), dibuja         │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│ js/optimizer.js                                              │
│   pipeline · punto fijo · métricas · traza · paso a paso     │
└───────┬───────────────┬───────────────────┬──────────────────┘
        │               │                   │
┌───────▼──────┐ ┌──────▼───────┐ ┌─────────▼───────────────┐
│ tac/         │ │ passes/      │ │ interpreter.js          │
│ ir, parser,  │ │ CF, AS, CP,  │ │ equivalencia de salidas │
│ cfg          │ │ CPY, TC, DCE │ │ observables             │
└──────────────┘ └──────────────┘ └─────────────────────────┘
```

## 2. Módulos

| Módulo | Responsabilidad |
|---|---|
| `js/tac/ir.js` | Operandos, instrucciones, clonado, formato canónico, detección de temporales y pureza. |
| `js/tac/parser.js` | Lexer/parser tolerante de TAC; errores con línea; conserva comentarios y líneas vacías. |
| `js/tac/cfg.js` | Bloques básicos, aristas, variables, `use/def` y liveness. |
| `js/passes/folding.js` | Plegado de constantes con protección de división por cero. |
| `js/passes/algebraic.js` | Identidades algebraicas. |
| `js/passes/constant-propagation.js` | Dataflow directo de constantes sobre el CFG. |
| `js/passes/copy-propagation.js` | Propagación de copias local al bloque. |
| `js/passes/temp-coalescing.js` | Renombrado de temporales de un solo uso. |
| `js/passes/dce.js` | Eliminación de código muerto por liveness. |
| `js/optimizer.js` | Orquesta pases, punto fijo, opciones, métricas y modo paso a paso. |
| `js/interpreter.js` | Ejecutor TAC acotado y comparación de salidas observables. |
| `js/samples.js` | Programas de ejemplo y casos límite. |
| `js/ui.js` | Editor, pestañas, diff, traza, diagnóstico, portapapeles y descarga. |

## 3. Modelo de datos

Cada instrucción es un objeto plano con `kind`, `line` y los campos propios de su variante:

```js
{ kind: 'assign', line: 3, dest: 't2', op: '*', a: {type:'var',name:'t1'}, b: {type:'num',value:2,raw:'2'} }
{ kind: 'goto', line: 8, label: 'L1' }
{ kind: 'ifgoto', line: 5, mode: 'if', a: {...}, op: '<', b: {...}, label: 'L2' }
```

Variantes soportadas: `assign`, `unary`, `copy`, `load`, `store`, `label`, `goto`, `ifgoto`, `print`, `return`, `param`, `call`, `nop`, `unknown`.

Las instrucciones `unknown` conservan la línea original, se reportan como error y se tratan como opacas con efectos secundarios. Esto evita que una entrada mal formada rompa la aplicación o elimine código por accidente.

## 4. Pipeline de optimización

Orden de pases:

```text
1. Plegado de constantes          (CF)
2. Simplificación algebraica      (AS)
3. Propagación de constantes      (CP)
4. Coalescencia de temporales     (TC)
5. Propagación de copias         (CPY)
6. Eliminación de código muerto   (DCE)
```

El ciclo se repite hasta que una iteración completa no produce cambios, con un máximo de 50 iteraciones. Cada pase:

1. Clona el programa (no muta la entrada).
2. Devuelve `{program, changed, events, warnings}`.
3. Registra en `events` la regla, la línea, el antes, el después y la justificación.

El punto fijo permite que una transformación habilite otra: por ejemplo, plegar `t1 = 5 + 3` permite propagar `t1` y luego eliminar `t1` por DCE.

## 5. Análisis de flujo

### 5.1 Bloques básicos y CFG

Los líderes son la primera instrucción, cada etiqueta y la instrucción posterior a `goto`, `ifgoto` o `return`. Las aristas se obtienen del último salto de cada bloque y del fallthrough.

### 5.2 Liveness

Análisis hacia atrás:

```text
liveOut(b) = ∪ liveIn(s) para cada sucesor s
liveIn(b)  = use(b) ∪ (liveOut(b) − def(b))
```

Se itera hasta punto fijo. `call` y `unknown` usan todas las variables como conservadoras.

### 5.3 Propagación de constantes

Retículo por variable: `INDEFINIDO` (sin información) → `CONSTANTE(v)` → `NO_CONSTANTE`.

- En la entrada del bloque inicial el estado es vacío.
- En una unión de caminos se conserva un valor solo si **todos** los predecesores coinciden.
- Una redefinición elimina la variable del estado.
- `call` y `unknown` limpian todo el estado (barreras).
- `store` no afecta escalares en este modelo; los arreglos no se propagan.

La sustitución se aplica con el estado **antes** de cada instrucción, por lo que es válida en todas las rutas que llegan a ese punto.

### 5.4 Propagación de copias

Mapa local `destino → operando` dentro del bloque. Se elimina una entrada cuando se redefine el destino o cualquiera de los operandos que dependen de él. Al salir del bloque se descarta el mapa. Es conservadora por diseño.

### 5.5 Coalescencia de temporales

Para `x = t` con `t` temporal:

- `t` se usa exactamente una vez (la copia).
- La definición de `t` está en el mismo bloque, antes de la copia.
- No hay saltos, etiquetas, llamadas ni redefiniciones/lecturas de `x` entre la definición y la copia.

Entonces se renombra la definición a `x` y se elimina la copia.

### 5.6 Eliminación de código muerto

Se recorre cada bloque hacia atrás con el `liveOut` correspondiente. Se elimina una instrucción si:

- es pura (`assign`, `unary`, `copy`, `load`),
- define una variable que no está viva, y
- el destino es temporal **o** el modo agresivo está activo.

Nunca se eliminan `call`, `param`, `print`, `return`, `store`, `goto`, `ifgoto`, `label` ni `unknown`.

## 6. Verificación de equivalencia

`interpreter.js` ejecuta el TAC con un límite de 10.000 pasos. Modela:

- variables escalares (no inicializadas = 0),
- arreglos dispersos,
- `print`, `return`, `goto`, `ifgoto`, `ifFalse`,
- `call` y `unknown` como no verificables.

La comparación revisa:

1. la secuencia de `print`,
2. el valor de `return`,
3. las variables observables (las usadas en `print`/`return` y las variables de usuario definidas),
4. el estado de los arreglos.

Si hay llamadas o instrucciones opacas, el estado es `manual`. Si hay una diferencia, se enumeran los valores originales y optimizados.

## 7. Política de seguridad

| Situación | Comportamiento |
|---|---|
| División o módulo por cero | No se pliega; se conserva y se advierte. |
| Resultado `NaN`/`Infinity` | No se pliega. |
| Instrucción desconocida | Se conserva como opaca y se reporta. |
| Llamada a función | Se conserva; es barrera de propagación. |
| `print`, `return`, `param` | Se conservan. |
| `a[i] = x` | Se conserva. |
| Unión de caminos con valores distintos | No se propaga. |
| Variable de usuario muerta | Se conserva por defecto; el modo agresivo la elimina y la equivalencia lo detecta. |

## 8. Interfaz

- Editor con numeración, sincronización de scroll y tabulación de dos espacios.
- Selector de ejemplos con descripción pedagógica.
- Interruptores por pase y modo agresivo.
- Métricas: instrucciones antes/después, reducción, transformaciones y temporales.
- Pestañas: TAC optimizado, comparación, reglas aplicadas y equivalencia.
- Diagnóstico con errores y advertencias por línea.
- Botones de copiar y descargar.
- Atajos: `Ctrl/Cmd + Enter` para optimizar, `Tab` para indentar.
- Tema claro/oscuro sincronizado con el portal mediante `usb-ova-theme.js`.
- Límites de entrada: 2.000 líneas o 100.000 caracteres.

## 9. Integración con el portal

| Archivo | Cambio |
|---|---|
| `script.js` | Ruta `optimizador-tac` en `OVAS_ROUTES` y modal `details-ova-7-modal` en `OVA_MODAL_MAP`. |
| `portal.html` | Nav 07, tarjeta 07, modal `details-ova-7-modal`, contadores 6 → 7. |
| `js/learning-data.js` | Entrada de guía para la OVA 7. |
| `OVAS/README.md` | Listado de las siete OVAs. |

La herramienta se sirve desde `OVAS/Juan Sebastian Perez/miniopt/index.html` y se carga en el iframe existente. No requiere backend ni configuración adicional.

La OVA 06 corresponde a otra implementación de MiniOpt, desarrollada por Daihan Riveros en `OVAS/MiniOpt/`. Esta entrega se integró como OVA 07 para conservar ambas herramientas y no modificar el trabajo del otro equipo.

## 10. Decisiones y limitaciones

- **Sin backend:** GitHub Pages no ejecuta Python/Node; un backend habría añadido puntos de fallo y CORS.
- **Sin dependencias de runtime:** el motor y la UI usan APIs nativas.
- **Propagación de copias local:** se prioriza la seguridad sobre la agresividad.
- **Aritmética IEEE-754:** se documenta la precisión de JavaScript; no se redondea para “embellecer” resultados.
- **Llamadas opacas:** no se simula su efecto; la equivalencia se marca como manual.
- **Modelo sin alias:** no hay punteros ni objetos; los arreglos se modelan por nombre e índice.
- **Modo agresivo:** puede cambiar salidas observables; por eso está desactivado y la UI lo advierte.
