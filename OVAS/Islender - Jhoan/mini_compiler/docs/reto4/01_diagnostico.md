# 1. Informe de diagnóstico

**Reto 4: Optimización y corrección del mini compilador TAC**
Proyecto de referencia: *MiniCompilador MiniC* (autores originales: Johan Humberto Villegas Cañizares e Islender Arturo Alfonso Contreras).

## 1.1 Reconocimiento del proyecto

| Elemento | Detalle |
|---|---|
| Ubicación | `OVAS/Islender - Jhoan/mini_compiler/` |
| Backend | Python + FastAPI (`backend/main.py`), endpoints `GET /health` y `POST /api/compile` |
| Frontend | HTML/CSS/JS estático (`frontend/index.html`) cargado por el portal en un iframe |
| Integración | El portal envía la URL de la API por `postMessage` (`USB_PORTAL_CONFIG`); por defecto `http://localhost:8002` |
| Fases | Léxico (`lexical/lexer.py`) → Sintáctico (`syntax/parser.py`) → Semántico (`semantic/semantic_analyzer.py`) → TAC (`intermediate/tac_generator.py`) |
| Pruebas existentes | Ninguna: `tests/`, `pytest.ini` y `conftest.py` estaban vacíos |

**Cómo se ejecutó el diagnóstico.** Se instaló el backend en un entorno virtual (Python 3.14, FastAPI 0.163). Se arrancó con `uvicorn` en el puerto 8002 y se sirvió el portal completo con `python -m http.server 8080`. Con eso se probó la OVA desde el portal, no solo abriendo el HTML. Además se escribió el catálogo `scripts/casos_reto4.py` con 37 casos y se ejecutó sobre el código original. Su salida quedó guardada en `evidencias/salida_antes.txt`.

**Resultado de la línea base:** 7 de 37 casos terminaban en **excepción no controlada** y 2 programas inválidos generaban TAC. Además, 15 de las 23 pruebas automáticas fallaban (`evidencias/pytest_antes.txt`).

## 1.2 Registro de defectos

| ID | Severidad | Defecto | Estado |
|---|---|---|---|
| D1 | Crítica | Cualquier token faltante tumbaba el compilador (HTTP 500) | Corregido |
| D2 | Crítica | El lexer se saltaba caracteres tras un error y fallaba al final del archivo | Corregido |
| D3 | Alta | El HTTP 500 salía sin cabeceras CORS y la OVA mostraba "Error de conexión" | Corregido (consecuencia de D1, D2 y D6) |
| D4 | Alta | La asignación `x = expr;` no validaba la expresión: se generaba TAC de programas inválidos | Corregido |
| D5 | Alta | El cuerpo de las funciones quedaba dentro del flujo principal del TAC | Corregido |
| D6 | Media | El anidamiento extremo (miles de paréntesis) producía `RecursionError` | Corregido |
| D7 | Baja | Un `if` sin `else` emitía un `GOTO` y una etiqueta inútiles | Corregido |
| D8 | Media | Sin pruebas, `.gitignore` vacío, 43 `.pyc` y un `.env` versionados | Corregido |

### D1. Errores sintácticos que detenían el compilador

- **Pasos para reproducir:** compilar `int x = 5` seguido de `print(x);` en otra línea (falta el `;`). También sirven `x 5;` y `int x = (5 + 3;`.
- **Esperado:** un error sintáctico con línea y columna.
- **Obtenido:** la excepción `SyntaxError: Se esperaba SEMICOLON pero se encontró PRINT` sin capturar, y HTTP 500 en la API.
- **Causa:** `tokens/token_stream.py`, en `expect()`, lanzaba el **`SyntaxError` nativo de Python**. `Parser._declaration()` solo captura `errors.SyntaxError`, la clase propia del compilador. Como se llaman igual, el error pasaba inadvertido en la lectura del código, pero son clases distintas.
- **Impacto:** afectaba a tres de los cinco casos mínimos del enunciado del Reto 2 (falta de `;`, paréntesis sin cerrar y asignación mal formada) y a cualquier error de "se esperaba X".

### D2. Lexer: doble avance tras un error

- **Pasos para reproducir:** compilar `int x = 5;@` o `string s = "hola`.
- **Obtenido:** `IndexError: string index out of range` y HTTP 500. Con `5@;` además se perdía el `;`.
- **Causa:** `lexical/lexer.py`. `_next_token()` ya consume el carácter inválido (y `_read_string()` la comilla) antes de lanzar `LexicalError`. Pero el `except` de `tokenize()` volvía a llamar a `_advance()`. Al final del archivo, `_advance()` accede a `source[pos]` fuera de rango.

### D3. Mensaje engañoso en la interfaz

- **Pasos para reproducir:** desde el portal, compilar cualquiera de los casos de D1 o D2.
- **Obtenido:** la OVA mostraba "Error de conexión: Failed to fetch. Configure la URL de la API en el portal USB" (`evidencias/antes_error_sintactico_http500.png`).
- **Causa:** cuando FastAPI responde 500 por una excepción no controlada, la respuesta sale sin las cabeceras del `CORSMiddleware`. El navegador la bloquea y el `fetch` falla como si no hubiera conexión. El estudiante cree que la API está caída cuando en realidad su programa tiene un error de sintaxis.
- **Clasificación:** es un error del programa (D1, D2 y D6), no de configuración ni del entorno.

### D4. Asignaciones sin validación semántica

- **Pasos para reproducir:** compilar `int x = 1;` y luego `x = y + 1;`. También `int x = 1;` seguido de `x = "hola";`.
- **Obtenido:** "Compilación exitosa" y la cuádrupla `(+, y, 1, t1)` sobre una variable inexistente (`evidencias/antes_semantico_rhs_genera_tac.png`).
- **Causa:** el parser representa toda asignación como `AssignmentExpr` (el nodo `AssignStatement` nunca se crea). `SemanticAnalyzer.visit_assignment_expr()` solo buscaba la variable destino y **no visitaba `node.value`**. Esto viola el requisito de que los errores se detecten antes de generar el código intermedio.

### D5. Funciones dentro del flujo principal

- **Pasos para reproducir:** compilar el ejemplo "Funciones" (`func suma(...)` seguido de una llamada).
- **Obtenido:** las cuádruplas empezaban directamente con `FUNC_BEGIN suma / PARAM a / PARAM b / + a b t1 / RETURN t1`.
- **Causa:** `TACGenerator.visit_function_decl()` emitía la función en línea, en el punto donde se declara. Al ejecutar el TAC de forma secuencial, el flujo entraba al cuerpo de la función sin argumentos y ejecutaba su `RETURN` en el nivel superior. Las instrucciones de control no mantenían el flujo lógico del programa.

### D6. Anidamiento extremo

- **Pasos para reproducir:** compilar una expresión con 2000 niveles de paréntesis.
- **Obtenido:** `RecursionError` y HTTP 500.
- **Causa:** el parser es recursivo descendente, con unas nueve llamadas por nivel de paréntesis, y la pila de Python admite unas mil.

### D7. `if` sin `else`

- **Obtenido:** `IF_FALSE t1 L1 … GOTO L2 / LABEL L1 / LABEL L2`. El `GOTO` salta a la instrucción inmediatamente siguiente.
- **Causa:** `visit_if_statement()` generaba siempre la estructura completa de `if/else`.

### D8. Calidad del repositorio

- Las carpetas `tests/unit/*` y `tests/integration/test_pipeline.py`, `pytest.ini` y `conftest.py` estaban vacíos, así que no había forma de detectar regresiones.
- El `.gitignore` estaba vacío: se versionaban 43 archivos `__pycache__/*.pyc` y `backend/.env`, que estaba vacío pero era un riesgo de filtrar claves en el futuro.

## 1.3 Lo que se verificó y funciona correctamente

Precedencia (`*` antes que `+`), asociatividad izquierda (`10 - 4 - 3`), paréntesis, numeración consecutiva de temporales (`t1…t7` en TAC-12), asignaciones consecutivas y encadenadas, `while`, `for`, `if` anidado, llamadas anidadas y recursivas, operadores unarios y el ignorado de espacios, tabulaciones y saltos de línea (FMT-01 y FMT-02 generan cuádruplas idénticas).
