# Reglas de optimización y justificación

## 1. Criterio general

Toda transformación debe cumplir:

1. **Preservar las salidas observables:** `print`, `return`, variables observables y arreglos.
2. **Preservar el flujo de control:** etiquetas, saltos y condiciones no se alteran.
3. **No eliminar efectos secundarios:** llamadas, parámetros, impresiones, retornos y almacenamientos se conservan.
4. **Ante duda, conservar:** si una condición no puede garantizarse, la instrucción queda intacta.

## 2. Catálogo de reglas

### CF — Plegado de constantes

| Aspecto | Detalle |
|---|---|
| Patrón | `d = a op b` con `a` y `b` literales; `d = -a` con `a` literal. |
| Transformación | `d = valor`. |
| Operadores | `+ - * / %`, comparaciones `== != < <= > >=`, unario `- + !`. |
| Condición de seguridad | Divisor distinto de cero; resultado finito. |
| Si falla | Se conserva la instrucción y se emite una advertencia. |
| Justificación | La operación no depende de ninguna entrada en tiempo de ejecución; sustituirla por su valor preserva el resultado. |

Ejemplo: `t1 = 5 + 3` → `t1 = 8`.

### AS — Simplificación algebraica

| ID | Patrón | Resultado | Justificación |
|---|---|---|---|
| `AS-ADD-0` | `x + 0` | `x` | Elemento neutro de la suma. |
| `AS-0-ADD` | `0 + x` | `x` | Conmutatividad y neutro. |
| `AS-SUB-0` | `x - 0` | `x` | Restar cero no cambia el valor. |
| `AS-SUB-SELF` | `x - x` | `0` | Todo número menos sí mismo es cero. |
| `AS-MUL-1` | `x * 1` | `x` | Elemento neutro del producto. |
| `AS-1-MUL` | `1 * x` | `x` | Conmutatividad y neutro. |
| `AS-MUL-0` | `x * 0` o `0 * x` | `0` | Todo número por cero es cero. |
| `AS-DIV-1` | `x / 1` | `x` | Dividir por uno no cambia el valor. |

**Validez en este TAC:** leer una variable no produce efectos secundarios y el lenguaje no genera `NaN` (la división por cero no se pliega y el intérprete la reporta). Por eso `x * 0` y `x - x` pueden simplificarse sin evaluar `x`.

### CP — Propagación de constantes

| Aspecto | Detalle |
|---|---|
| Patrón | Un operando variable cuyo valor es constante en **todas** las rutas que llegan a la instrucción. |
| Transformación | Se sustituye la variable por el literal. |
| Condición de seguridad | Dataflow sobre el CFG; en uniones se exige que todos los predecesores coincidan. |
| Barreras | `call` y `unknown` limpian el estado. |
| Justificación | Si en todo camino posible la variable vale `v` antes de la instrucción, sustituirla por `v` no cambia el resultado. |

Ejemplo:

```text
t1 = 4
t2 = 6
t3 = t1 + t2
x = t3
```

→ `t3 = 4 + 6` → `x = 10`.

Contraejemplo (no se propaga):

```text
if c < 1 goto L1
a = 1
goto L2
L1:
a = 2
L2:
print a
```

En `L2` las rutas no coinciden; `a` no se sustituye.

### CPY — Propagación de copias

| Aspecto | Detalle |
|---|---|
| Patrón | `x = y` seguido de usos de `x` dentro del mismo bloque. |
| Transformación | Se reemplazan los usos de `x` por `y`. |
| Condición de seguridad | `y` no se redefine y el bloque no contiene llamadas/opacas que limpien el mapa. |
| Alcance | Local al bloque básico. |
| Justificación | Dentro del bloque, `x` e `y` contienen el mismo valor hasta que alguno se redefine. |

### TC — Coalescencia de temporales

| Aspecto | Detalle |
|---|---|
| Patrón | `t = ...` y luego `x = t`, con `t` temporal usado una sola vez. |
| Transformación | Se renombra la definición a `x` y se elimina `x = t`. |
| Condición de seguridad | Misma bloque, sin saltos/etiquetas/llamadas entre definición y copia, sin lecturas ni redefiniciones de `x` en ese intervalo. |
| Justificación | El temporal solo existe para transportar el valor; reutilizar `x` evita una instrucción sin cambiar el valor final. |

### DCE — Eliminación de código muerto

| Aspecto | Detalle |
|---|---|
| Patrón | Instrucción pura cuyo destino no está vivo después. |
| Transformación | Se elimina la instrucción. |
| Condición de seguridad | Liveness sobre el CFG; solo instrucciones puras. |
| Destinos | Temporales siempre; variables de usuario solo en modo agresivo. |
| Justificación | Si el valor no se usa en ningún camino posterior y no hay efectos secundarios, la instrucción no puede afectar las salidas observables. |

**¿Por qué se conservan las variables de usuario por defecto?** En el ejemplo del enunciado, `x = t3` es el resultado que el estudiante espera ver como `x = 16`. Si DCE eliminara `x` por no leerse, se perdería la salida didáctica. Por eso el modo conservador protege las variables de usuario y elimina solo temporales; el modo agresivo está disponible y la verificación de equivalencia advierte si cambia una salida.

## 3. Orden y punto fijo

El orden `CF → AS → CP → TC → CPY → DCE` se repite hasta que no hay cambios. La razón es que las reglas se habilitan entre sí:

1. CF convierte `t1 = 5 + 3` en `t1 = 8`.
2. CP propaga `t1` a `t2 = t1 * 2`, que queda `t2 = 8 * 2`.
3. CF/CP pliegan `t2` y propagan `x = t3`.
4. TC reutiliza el destino de un temporal que solo se copia.
5. CPY propaga copias restantes dentro del bloque.
6. DCE elimina los temporales que quedaron sin uso.

Resultado del ejemplo del enunciado:

```text
x = 16
```

## 4. Invariantes verificables

- El número de etiquetas se conserva.
- Las instrucciones con efectos secundarios se conservan.
- Todo salto conserva su etiqueta destino.
- Si el intérprete puede ejecutar ambos programas, `print`, `return`, variables observables y arreglos coinciden.
- Si no puede garantizarse, el estado es `manual` y no se afirma equivalencia.

## 5. Limitaciones

- No se modelan punteros, alias ni objetos.
- La propagación de copias no cruza bloques.
- Las llamadas no se interpretan.
- La aritmética es IEEE-754 de JavaScript; no se redondea el resultado.
- El modo agresivo puede cambiar el valor de una variable de usuario no leída; por eso está desactivado por defecto.
