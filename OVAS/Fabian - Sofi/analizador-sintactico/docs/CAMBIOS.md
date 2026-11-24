# Relación de cambios — Reto 2: Analizador Sintáctico

**Grupo 2:** Kevin Flórez · Kevin Sandoval · Jordani Rodríguez

Se siguió la recomendación del examen: cambios pequeños, justificables y verificables, sin reescribir el proyecto. La gramática, la arquitectura (FastAPI + frontend estático), el formato del JSON y la traza del modo paso a paso se mantienen iguales. El frontend no se modificó.

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `backend/parser.py` | Corrección de defectos y mejora de mensajes y de la recuperación de errores |
| `backend/lexer.py` | Corrección: solo dígitos ASCII |
| `backend/main.py` | Corrección: TAC solo sin errores sintácticos y sin errores 500 por entradas extremas |
| `ejemplos/ejemplos.json` | 7 ejemplos nuevos (casos del examen, recuperación y asociatividad); los 10 originales no se tocaron |
| `backend/test_parser_reto2.py` | **Nuevo:** 48 pruebas automatizadas (matriz P-01 a P-38 + regresión) |
| `requirements-dev.txt` | **Nuevo:** `pytest` y `httpx` para correr las pruebas (Render sigue usando `requirements.txt`) |
| `docs/` | **Nuevo:** diagnóstico, cambios, matriz, documento técnico, manual de usuario y guion de sustentación |
| `README.md` | Se agregó la sección del Reto 2 y cómo correr las pruebas; no se borró nada |

## Cambios y su justificación

### C-01 · Mensajes legibles con línea y columna (corrige D-01)
Se agregó un diccionario `TOKEN_NAMES` para mostrar `';'`, `')'` o *"el fin del código"* en lugar de `SEMICOLON`, `RPAREN` o `EOF`. Cada error sigue llevando `line`, `column`, `start_idx`, `end_idx` y `suggestion`, así que el frontend lo muestra y lo resalta igual que antes.
**Por qué:** el usuario de la OVA es un estudiante; el mensaje debe decir qué pasó, no cómo se llama el token internamente.

### C-02 · Asignación mal formada (corrige D-02)
En `sentencia()`, si después de un identificador viene en **la misma línea** otro operando (número, variable o `(`), se reporta *"Asignación mal formada: falta '=' entre 'x' y '5'"*. También se reconocen `= 5;` (falta la variable), `x = ;` (falta la expresión), `x = = 5;` (`=` repetido) y `5 = x;` (lado izquierdo inválido).
**Por qué:** con la decisión LL(2) original, todo lo que no fuera `ID =` se trataba como expresión y el error terminaba siendo *"falta ;"*, que no es la causa.

### C-03 · Operadores sin operandos (corrige D-03)
`factor()` delega en `factor_error()`, que mira el token anterior para explicar el problema:
- después de un operador: *"Expresión incompleta: el operador '+' no tiene operando derecho"* (el error se ubica en el operador);
- dos operadores seguidos: *"Operadores seguidos…"*;
- operador al inicio: *"Operador '*' sin operando izquierdo"*;
- `()`: *"Paréntesis vacíos"*;
- `-5`: *"El operador unario '-' no está soportado por la gramática"*, con la sugerencia `(0 - 5)`.

**Por qué:** el examen pide detectar operadores sin operandos y explicar los errores con claridad. El menos unario no se agregó al lenguaje para no cambiar su alcance; se documenta como limitación.

### C-04 · Paréntesis sin cerrar o sobrantes (corrige D-04 y parte de D-07)
`factor()` guarda el token `(`. Si no aparece su `)`, el error se ubica en ese `(` y dice dónde está: *"el '(' de la línea 1, columna 5 no tiene su ')'"*. Un `)` sobrante se reporta como *"Paréntesis de cierre ')' sin '(' de apertura"* y se descarta solo ese token.

### C-05 · Falta de `;` (corrige D-05)
Nueva función `fin_sentencia()`. Si el `;` falta al final del código o de una línea, el error se ubica en el último token de esa línea (*"Falta ';' al final de la sentencia, después de '5'"*). Si en la misma línea aparece otro operando, se informa *"Falta un operador entre '5' y '3'"*.

### C-06 · Recuperación de errores sin perder sentencias válidas (corrige D-06 y D-07)
- **Recuperación a nivel de frase:** cuando falta el `;` y la sentencia siguiente empieza en otra línea, se asume el `;` y el análisis continúa sin descartar nada.
- **Modo pánico mejorado:** `synchronize()` sigue avanzando hasta `;` o EOF, pero ahora se detiene si una línea nueva empieza con `ID =`, porque eso casi seguro es una sentencia nueva.
- `sentencias()` ya no termina con un `)` suelto: lo reporta y sigue.
- `';'` sobrante (sentencia vacía) se reporta y se descarta sin perder lo demás.
- Se evita reportar dos errores en la misma posición (errores en cascada).

**Resultado:** en un programa de 6 líneas con 4 errores distintos, la versión original ubicaba el último error en la línea equivocada (6 en vez de 5) y dejaba una sola sentencia en el AST; ahora se reportan los 4 errores en sus líneas correctas y se conservan las 3 sentencias válidas (P-26).

### C-07 · Rangos del AST coherentes con el código (corrige D-08 y D-09)
El nodo *Asignación* termina en su `;`, y una operación entre paréntesis incluye los paréntesis en su rango. Así el resaltado bidireccional árbol ↔ editor marca exactamente el texto del nodo. La estructura del árbol no cambia.

### C-08 · Sin errores 500 (corrige D-10 y D-11)
- `lexer.py`: nueva función `is_digit()` que solo acepta `0-9`; `²` pasa a ser un carácter ilegal (error léxico normal).
- `parser.py`: `Expresion'` y `Termino'` se implementan con un ciclo en lugar de recursión. Es equivalente (son recursiones por la cola), produce la misma traza y mantiene la asociatividad izquierda. Se limita el anidamiento a 100 paréntesis, con mensaje explicado.
- `main.py`: la respuesta se serializa con `json.dumps` dentro de un `try`. El serializador de Pydantic solo admitía ~254 niveles de anidamiento, y eso tumbaba el servidor desde 127 operadores. Si una entrada supera los límites de Python, se responde 200 con un error explicado en lugar de 500.

**Resultado:** antes, el servidor se caía con 127 sumas; ahora acepta hasta ~900 y, por encima de eso, responde con un mensaje claro.

### C-09 · Errores duplicados (corrige D-12)
El parser ignora los tokens `ERROR`, que el lexer ya reportó. La lista de tokens que ve el usuario no cambia.

### C-10 · TAC solo para programas válidos (corrige D-13)
`main.py` genera el código intermedio solo si no hay errores léxicos ni sintácticos. El frontend ya mostraba el mensaje *"No se generó código de tres direcciones (TAC) debido a errores"* para este caso.
**Por qué:** en teoría de compiladores el código intermedio se genera a partir de un programa sintácticamente válido; un TAC parcial sin advertencia confunde.

### C-11 · Documentación de ejecución (corrige D-14)
El manual actualizado (`docs/MANUAL_USUARIO.md`) usa el puerto **8001**, que es el que espera el frontend y el portal, e instala con `requirements.txt`.

## Compatibilidad

- **Formato de la respuesta JSON:** el mismo (`tokens`, `ast`, `symbols`, `errors`, `trace`, `tac`).
- **Traza del paso a paso:** mismas acciones (`enter_rule`, `exit_rule`, `consume`, `create_node`, `add_child`, `error`, `synchronize`).
- **Pruebas originales:** `test_compiler.py` pasa sin modificaciones (6/6).
- **Despliegue:** `render.yaml` y `requirements.txt` sin cambios.
