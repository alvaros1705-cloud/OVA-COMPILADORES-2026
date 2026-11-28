# MiniOpt — Optimizador de código intermedio TAC

Herramienta web estática para la asignatura **Teoría de Compiladores** de la Universidad Simón Bolívar. Recibe instrucciones de tres direcciones (TAC), aplica optimizaciones seguras y muestra el código original frente al optimizado con la justificación de cada regla.

- **Reto:** 6 — Nuevo: Optimizador de código intermedio.
- **Autor:** Juan Sebastian Perez Galvis.
- **Fase:** 6 (optimización), posterior a la generación de TAC de la OVA 4.
- **Tecnología:** HTML5 + CSS + JavaScript (módulos ES), sin backend y sin dependencias de ejecución.

## Funcionalidades

1. **Plegado de constantes:** `t1 = 5 + 3` → `t1 = 8`.
2. **Propagación de constantes:** sustituye valores conocidos solo cuando todas las rutas coinciden.
3. **Simplificación algebraica:** `x + 0`, `x - 0`, `x * 1`, `x * 0`, `x / 1`, `x - x`.
4. **Eliminación de código muerto:** liveness sobre el CFG; nunca retira efectos secundarios.
5. **Coalescencia de temporales:** reutiliza el destino cuando un temporal se usa una sola vez.
6. **Comparación antes/después:** diff por líneas, métricas y tabla de reglas aplicadas.
7. **Verificación de equivalencia:** intérprete TAC acotado que compara `print`, `return`, variables observables y arreglos.

## Cómo ejecutarlo

Desde la raíz del repositorio:

```bash
python3 -m http.server 8000
```

Luego abra:

```text
http://localhost:8000/OVAS/Juan%20Sebastian%20Perez/miniopt/index.html
```

También funciona dentro del portal, en la tarjeta **OVA 07 — MiniOpt (Juan Sebastian)**. La OVA 06 corresponde a otra implementación de MiniOpt y se conserva como alternativa.

> Los módulos ES requieren servirse por HTTP; abrir el archivo con `file://` no es un entorno soportado.

## Pruebas

```bash
cd "OVAS/Juan Sebastian Perez/miniopt"
npm test
```

El proyecto no instala dependencias: usa el runner nativo de Node.js (`node --test`). Resultado esperado: **38 pruebas aprobadas**.

## Estructura

```text
miniopt/
  index.html
  css/miniopt.css
  js/
    tac/{ir,parser,cfg}.js
    passes/{folding,algebraic,constant-propagation,copy-propagation,temp-coalescing,dce}.js
    optimizer.js
    interpreter.js
    samples.js
    ui.js
  tests/*.test.js
  docs/
```

## Seguridad de las transformaciones

- Nunca se eliminan `call`, `param`, `print`, `return`, `a[i] = x`, etiquetas ni saltos.
- No se pliega una división o módulo por cero, ni resultados no finitos.
- Las llamadas y las instrucciones opacas actúan como barreras conservadoras.
- En uniones de caminos solo se propaga un valor si todas las rutas coinciden.
- Por defecto las variables de usuario se consideran salidas observables; el **modo agresivo** permite eliminarlas y la pestaña de equivalencia advierte cualquier diferencia.

## Documentación

- [Diagnóstico](docs/diagnostico.md)
- [Arquitectura](docs/arquitectura.md)
- [Reglas de optimización](docs/reglas-optimizacion.md)
- [Manual de usuario](docs/manual-usuario.md)
- [Matriz de pruebas](docs/matriz-pruebas.md)
- [Relación de cambios](docs/cambios.md)
- [Documento técnico](docs/documento-tecnico.md)
- [Guion de sustentación](docs/guion-sustentacion.md)
- [Checklist de entrega](docs/entrega.md)
- [Evidencias visuales](docs/evidencias/README.md)

## Limitaciones conocidas

- El lenguaje TAC es un subconjunto didáctico; no modela punteros, objetos ni alias.
- La propagación de copias es local al bloque básico.
- Las llamadas no se interpretan: la equivalencia se marca como verificación manual.
- El plegado usa aritmética IEEE-754 de JavaScript; `0.1 + 0.2` produce `0.30000000000000004` y se documenta en la interfaz.
- El modo agresivo de DCE puede eliminar una variable de usuario que no se lea; por eso está desactivado por defecto y la equivalencia lo detecta.
