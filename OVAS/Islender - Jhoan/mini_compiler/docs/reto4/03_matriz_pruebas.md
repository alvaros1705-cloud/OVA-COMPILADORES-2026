# 3. Matriz de pruebas

Cada fila se puede reproducir de tres formas:

1. Desde la OVA: pegar la entrada y pulsar **Compilar**.
2. Con el catálogo: `python scripts/casos_reto4.py`, cuyas salidas completas están en `evidencias/salida_antes.txt` y `evidencias/salida_despues.txt`.
3. Con las pruebas automáticas: `python -m pytest`.

En las entradas, `⏎` indica un salto de línea. La columna "Antes" muestra el resultado con el código original (rama `main`).

## 3.1 Filas obligatorias del formato del examen

| ID | Entrada / escenario | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|
| P-01 | Caso válido principal: `func suma(int a, int b) : int { return a + b; } ⏎ int resultado = suma(10, 20); ⏎ print(resultado);` | Compila; la función queda envuelta en `GOTO L1 … LABEL L1` y luego vienen `ARG 10`, `ARG 20`, `CALL suma 2 t2`, `= t2 resultado` y `PRINT resultado` | Exactamente esas 13 cuádruplas | Aprobado | Antes la función quedaba en el flujo principal (D5). Captura: `despues_tac_funcion.png` |
| P-02 | Caso inválido: `int x = 5 ⏎ print(x);` | Error sintáctico con posición; sin cuádruplas; HTTP 200 | `[Sintáctico] [(2:1)] Se esperaba SEMICOLON pero se encontró PRINT 'print'` | Aprobado | Antes: excepción, HTTP 500 y "Error de conexión" en la OVA (D1, D3) |
| P-03 | Caso límite: expresión con 2000 niveles de paréntesis | Error controlado, sin caída | `[Límite] El programa tiene un anidamiento demasiado profundo para ser compilado` | Aprobado | Antes: `RecursionError` (D6). Con 50 niveles compila normalmente (LIM-03) |
| P-04 | Variación de formato: `int x=2+3*4;if(x>10){print(x);}` frente a la misma entrada con espacios, tabulaciones y saltos de línea | Cuádruplas idénticas | Idénticas (7 cuádruplas en ambos casos) | Aprobado | FMT-01 y FMT-02 |
| P-05 | Regresión: ejemplos `hello_world.mc`, `functions.mc` y `control_structures.mc` | Siguen compilando sin errores | Compilan | Aprobado | `tests/integration/test_pipeline.py` |

## 3.2 Generación de código intermedio (casos válidos)

| ID | Entrada | Resultado esperado | Resultado obtenido | Antes | Estado |
|---|---|---|---|---|---|
| TAC-01 | `int x = 2 + 3;` | `+ 2 3 t1`, `= t1 x` | Igual | Igual | Aprobado |
| TAC-02 | `int x = 2 + 3 * 4;` | `* 3 4 t1`, `+ 2 t1 t2`, `= t2 x` | Igual | Igual | Aprobado |
| TAC-03 | `int x = (2 + 3) * 4;` | `+ 2 3 t1`, `* t1 4 t2`, `= t2 x` | Igual | Igual | Aprobado |
| TAC-04 | `int x = 10 - 4 - 3;` | Asociatividad izquierda: `- 10 4 t1`, `- t1 3 t2` | Igual | Igual | Aprobado |
| TAC-05 | Asignaciones consecutivas: `a = b * 3; b = a - b;` | Un temporal por operación, en orden | Igual | Igual | Aprobado |
| TAC-06 | `a = b = 5;` | `= 5 b`, `= b a` | Igual | Igual | Aprobado |
| TAC-07 | `if (x > 5) {…} else {…}` | `IF_FALSE t1 L1`, rama then, `GOTO L2`, `LABEL L1`, rama else, `LABEL L2` | Igual | Igual | Aprobado |
| TAC-08 | `if (x > 0) { x = 2; }` | `IF_FALSE t1 L1`, `= 2 x`, `LABEL L1` (sin saltos sobrantes) | Igual | Tenía `GOTO L2`, `LABEL L1`, `LABEL L2` | Aprobado (D7) |
| TAC-09 | `while (i < 3) {…}` | `LABEL L1`, condición, `IF_FALSE → L2`, cuerpo, `GOTO L1`, `LABEL L2` | Igual | Igual | Aprobado |
| TAC-10 | `for (int i = 0; i < 3; i = i + 1) {…}` | Inicialización, etiqueta, condición, cuerpo, actualización y `GOTO` al inicio | Igual | Igual | Aprobado |
| TAC-11 | `if` dentro de `while` | Etiquetas distintas y bien anidadas (L1, L2 del while; L3 del if) | Igual | Igual | Aprobado |
| TAC-12 | `(1 + 2) * (3 + 4) - (5 + 6) / (7 - 6)` | 7 temporales `t1…t7` numerados en orden de evaluación | Igual | Igual | Aprobado |
| TAC-13 | `-a * 2` y `!(a > 1)` | `UNARY_- a t1` antes de `*`; `UNARY_! t3 t4` | Igual | Igual | Aprobado |
| TAC-14 | Función `suma` y llamada | La función queda envuelta en `GOTO/LABEL` | Igual | Función en el flujo principal | Aprobado (D5) |
| TAC-15 | `f(f(1, 2), 3)` | La llamada interna se resuelve antes de pasar `ARG t2` | Igual | Igual (salvo D5) | Aprobado |
| TAC-16 | `fact` recursivo | `CALL fact 1` dentro de su propio cuerpo, con el salto de función | Igual | Función en el flujo principal | Aprobado (D5) |
| TAC-19 | `float f = 1.5 * 2;` | `* 1.5 2 t1` | Igual | Igual | Aprobado |

## 3.3 Errores detectados antes de generar TAC

En todos estos casos se espera además que **no se generen cuádruplas** y que la API responda HTTP 200 con `success: false`.

| ID | Entrada | Resultado esperado | Resultado obtenido | Antes | Estado |
|---|---|---|---|---|---|
| ERR-01 | `int x = 5 @ 3;` | Error léxico | `[Léxico] [(1:11)] Carácter no reconocido: '@'` | Igual | Aprobado |
| ERR-02 | `int x = 5;@` | Error léxico | `[Léxico] [(1:11)] Carácter no reconocido: '@'` | `IndexError`, HTTP 500 | Aprobado (D2) |
| ERR-03 | `string s = "hola;` | Error léxico | `[Léxico] [(1:12)] String sin cerrar al final del archivo` | `IndexError`, HTTP 500 | Aprobado (D2) |
| ERR-04 | `int x = 5 ⏎ print(x);` | Error sintáctico | `[(2:1)] Se esperaba SEMICOLON pero se encontró PRINT 'print'` | Excepción, HTTP 500 | Aprobado (D1) |
| ERR-05 | `x 5;` | Error por asignación mal formada | `[(1:3)] Se esperaba SEMICOLON pero se encontró INTEGER '5'` | Excepción, HTTP 500 | Aprobado (D1) |
| ERR-06 | `int x = (5 + 3;` | Error por paréntesis sin cerrar | `[(1:15)] Se esperaba RPAREN pero se encontró SEMICOLON ';'` | Excepción, HTTP 500 | Aprobado (D1) |
| ERR-07 | `int x = 5 + ;` | Error por expresión incompleta | `[(1:13)] Expresión inesperada: ';'` | Igual | Aprobado |
| ERR-08 | `y = 3;` | Variable no declarada | `[Semántico] [(1:1)] Variable 'y' no declarada` | Igual | Aprobado |
| ERR-09 | `int x = 1; ⏎ x = y + 1;` | Variable no declarada | `[Semántico] [(2:5)] Variable 'y' no declarada` | Compilaba y generaba TAC | Aprobado (D4) |
| ERR-10 | `int x = 1; ⏎ x = "hola";` | Tipos incompatibles | `[Semántico] [(2:1)] No se puede asignar 'string' a 'int'` | Compilaba y generaba TAC | Aprobado (D4) |
| ERR-11 | `int x = "hola";` | Tipos incompatibles | `Tipo incompatible: 'int' != 'string'` | Igual | Aprobado |
| ERR-12 | `int x; ⏎ int x;` | Declaración duplicada | `Variable 'x' ya declarada en este scope` | Igual | Aprobado |
| ERR-16 | `if (x) {…}` con `x` int | Condición no booleana | `La condición del if debe ser bool` | Igual | Aprobado |
| ERR-19 | `int a = ; ⏎ int b = 2 ⏎ int c = 3;` | Dos errores sintácticos (recuperación) | `[(1:9)] Expresión inesperada: ';'` y `[(3:1)] Se esperaba SEMICOLON…` | Excepción, HTTP 500 | Aprobado (D1) |

## 3.4 Casos límite

| ID | Entrada | Resultado esperado | Resultado obtenido | Antes | Estado |
|---|---|---|---|---|---|
| LIM-01 | Programa vacío | Éxito, 0 cuádruplas | Igual | Igual | Aprobado |
| LIM-02 | Solo comentarios `//` y `/* */` | Éxito, 0 cuádruplas | Igual | Igual | Aprobado |
| LIM-03 | 50 niveles de paréntesis | Compila: `= 1 x` | Igual | Igual | Aprobado |
| LIM-04 | 2000 niveles de paréntesis | Error controlado | `[Límite] …anidamiento demasiado profundo…` | `RecursionError` | Aprobado (D6) |

## 3.5 Limitaciones verificadas (fuera del alcance de este reto)

Estos casos se documentan para dejar trazabilidad; **no** se corrigieron, para no alterar el alcance del lenguaje ni invadir los retos 2 y 3.

| ID | Entrada | Comportamiento actual | Estado |
|---|---|---|---|
| LIM-L1 | `bool b = false && f();` | `&&` y `\|\|` se evalúan completos, sin cortocircuito: `f()` se ejecutaría | No aprobado (limitación) |
| LIM-L2 | `int x = 1; if (x > 0) { int x = 2; } print(x);` | El `x` interno y el externo comparten nombre en el TAC | No aprobado (limitación) |
| LIM-L3 | `f(1, 2, 3)` cuando `f` recibe un solo parámetro | No se valida la aridad ni el tipo de los argumentos | No aprobado (Reto 3) |
| LIM-L4 | `return 5;` en el nivel superior | Se acepta | No aprobado (Reto 3) |
| LIM-L5 | `int i = 2.5;` y `float f = 5.0 % 2;` | Se aceptan según la tabla `TYPE_COMPAT` original | No aprobado (Reto 3) |

## 3.6 Pruebas automáticas (pytest)

| Archivo | Pruebas | Qué verifica |
|---|---|---|
| `tests/unit/lexical/test_lexer_errores.py` | 3 | D2: error al final del archivo y no perder el carácter siguiente |
| `tests/unit/syntax/test_parser_errores.py` | 5 | D1, D6: errores sintácticos sin excepción, recuperación y anidamiento |
| `tests/unit/semantic/test_asignaciones.py` | 3 | D4: variable no declarada y tipo incompatible en `x = expr;` |
| `tests/unit/intermediate/test_tac.py` | 5 | Precedencia, paréntesis, temporales, función (D5), `if` sin `else` (D7), `if/else` y `while` |
| `tests/integration/test_pipeline.py` | 7 | Regresión de los ejemplos y API HTTP (200 en vez de 500) |
| **Total** | **23** | **Antes: 15 fallan y 8 pasan. Después: 23 pasan** (`evidencias/pytest_antes.txt`, `evidencias/pytest_despues.txt`) |
