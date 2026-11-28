# 2. Relación de cambios implementados

Rama de trabajo: `reto4/mini-compilador-tac` (la rama `main` no se modificó). Cada cambio es un commit independiente y se puede revisar por separado.

| Commit | Defecto | Archivos | Cambio |
|---|---|---|---|
| `chore(minicompilador): ignorar artefactos generados y .env` | D8 | `.gitignore`, `backend/__pycache__/**`, `backend/.env` | Se completa el `.gitignore`. Se dejan de versionar 43 `.pyc` y el `.env` vacío (el archivo local se conserva y la plantilla sigue siendo `.env.example`) |
| `test(minicompilador): casos de prueba que reproducen los defectos` | D8 | `pytest.ini`, `tests/**`, `scripts/casos_reto4.py`, `docs/reto4/evidencias/*_antes.txt` | 23 pruebas automáticas, catálogo de 37 casos y evidencia de la versión original |
| `fix(lexer): no saltar un carácter adicional tras un error léxico` | D2 | `lexical/lexer.py` | Se elimina el `_advance()` duplicado del `except` |
| `fix(parser): reportar errores sintácticos en lugar de lanzar excepción` | D1, D3, D6 | `tokens/token_stream.py`, `syntax/parser.py`, `compiler_pipeline.py` | `expect()` lanza el error del compilador con su posición. Se mejora la recuperación y se controla el `RecursionError` |
| `fix(semantico): validar el valor asignado en 'x = expr;'` | D4 | `semantic/semantic_analyzer.py` | `visit_assignment_expr()` visita el valor y comprueba la compatibilidad de tipos |
| `fix(tac): saltar el cuerpo de las funciones y simplificar if sin else` | D5, D7 | `intermediate/tac_generator.py` | `GOTO Lk … LABEL Lk` alrededor de cada función. El `if` sin `else` usa una sola etiqueta |
| `docs(minicompilador): documentación y evidencias del Reto 4` | — | `docs/reto4/**`, `README.md` | Este informe, la matriz, el manual, el documento técnico y las capturas |

## Justificación técnica

### Lexer (D2)
Quien detecta el error es quien sabe cuántos caracteres consumió, así que la recuperación debe hacerse en un solo lugar. Se eligió quitar el avance del `except` y no el de `_next_token()`, porque `_read_string()` también lanza el error después de haber consumido su comilla. Todos los caminos que lanzan `LexicalError` consumen al menos un carácter, de modo que el ciclo de `tokenize()` siempre progresa.

### Parser (D1, D3, D6)
- **`expect()`** importa `errors.SyntaxError` dentro de la función. El import es local para no crear un ciclo entre los paquetes `tokens` y `errors`. El mensaje pasa a llevar la posición como atributo (`[(línea:columna)] mensaje`), igual que los demás errores del compilador, y al final del archivo dice "fin del archivo".
- **Recuperación en modo pánico:** `_synchronize()` ahora se detiene después de un `;` (fin de la sentencia errónea) o antes de un `}` (cierre del bloque actual). Así, un error dentro de un bloque no produce un error falso de "falta `}`". `_declaration()` descarta el token actual si el error ocurrió sin consumir nada (por ejemplo, una `}` suelta), lo que garantiza que el parser nunca entre en un ciclo infinito.
- **`RecursionError`** se convierte en el error `[Límite] …` en `CompilerPipeline.compile()`. Se prefirió esto a subir el límite de recursión de Python, porque eso solo desplaza el problema y puede tumbar el proceso.
- Al desaparecer las excepciones no controladas, la API vuelve a responder **HTTP 200 con `success: false`** y la lista de errores, que la OVA ya sabía mostrar. Con eso desaparece el falso "Error de conexión" (D3) sin tocar el frontend.

### Semántico (D4)
Se visita primero el valor, para reportar también sus errores aunque la variable destino no exista, y luego se aplica la misma regla `_compatible()` que ya usaban las declaraciones. No se cambió la tabla `TYPE_COMPAT`, para no alterar el alcance del lenguaje (ver limitaciones).

### Generador TAC (D5, D7)
- Envolver cada función con `GOTO Lk` y `LABEL Lk` es el cambio mínimo que preserva el orden en que el programador escribió el código y el formato de las cuádruplas que consume el frontend. La alternativa, mover todas las funciones al final del TAC, reordenaba la salida y obligaba a cambiar la vista.
- En `if` sin `else` basta `IF_FALSE cond → Lfin`. Con `else` se conserva la estructura original.

## Cambios que se evaluaron y no se aplicaron

Se priorizaron cambios pequeños y verificables, siguiendo la recomendación del enunciado de no reescribir el proyecto. Lo siguiente quedó como limitación documentada (ver documento técnico, sección 5.5):

- Evaluación en cortocircuito de `&&` y `||`.
- Renombrado de variables sombreadas en bloques internos.
- Validación de aridad y tipos de argumentos, `return` fuera de función, `%` con `float` y la conversión implícita de `float` a `int`. Son reglas semánticas propias del Reto 3.
- Reemplazar la pestaña "AST" del frontend, que hoy se reconstruye a partir de las cuádruplas.
