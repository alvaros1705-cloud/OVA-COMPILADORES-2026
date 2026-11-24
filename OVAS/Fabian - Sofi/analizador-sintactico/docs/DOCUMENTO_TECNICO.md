# Documento técnico — Analizador Sintáctico EBNF (Reto 2, 2026-II)

**Grupo 2:** Kevin Flórez · Kevin Sandoval · Jordani Rodríguez
**Proyecto original:** Fabián y Sofi — se conservan sus créditos y su arquitectura.

## 1. Arquitectura

| Capa | Archivo | Responsabilidad |
|---|---|---|
| API | `backend/main.py` | FastAPI: `GET /health`, `POST /api/analyze`, `GET /api/examples`; sirve el frontend como estático |
| Léxico | `backend/lexer.py` | Convierte el texto en tokens con línea, columna y offsets; reporta caracteres ilegales |
| Sintáctico | `backend/parser.py` | Parser descendente recursivo LL(1)/LL(2): valida la gramática, construye el AST, registra la traza y recupera errores |
| AST | `backend/ast_nodes.py` | Nodos `Program`, `Assign`, `BinOp`, `Variable`, `Number` y su serialización |
| Semántico | `backend/analyzer.py` | Tabla de símbolos, tipos (`Entero`/`Real`), variables no definidas, división por cero |
| Intermedio | `backend/tac_generator.py` | Código de tres direcciones con temporales `t0, t1…` |
| Interfaz | `frontend/` | Editor Monaco, pestañas de resultados, árbol D3, modo paso a paso, exportación PNG/PDF |

**Flujo de `/api/analyze`:** código → Lexer → Parser → (AST) → Analizador semántico → TAC (solo si no hay errores léxicos ni sintácticos) → JSON.

**Integración con el portal:** el portal de GitHub Pages abre `OVAS/Fabian - Sofi/analizador-sintactico/frontend/index.html`. El frontend busca la API en este orden: la URL guardada en `localStorage['url-sintactico']` (configurable desde el portal), `http://localhost:8001` si la página se abre en localhost, o el mismo origen si el backend sirve la página.

## 2. Gramática (sin cambios)

```ebnf
Programa   → Sentencias EOF
Sentencias → Sentencia Sentencias | ε
Sentencia  → Asignacion | Expresion ";"
Asignacion → ID "=" Expresion ";"
Expresion  → Termino Expresion'
Expresion' → ("+" | "-") Termino Expresion' | ε
Termino    → Factor Termino'
Termino'   → ("*" | "/") Factor Termino' | ε
Factor     → "(" Expresion ")" | ID | NUMERO
```

- **Precedencia:** `Factor` > `Termino` (`*`, `/`) > `Expresion` (`+`, `-`). El nivel más bajo de la gramática es el que se agrupa primero.
- **Asociatividad izquierda:** `Expresion'` y `Termino'` reciben el nodo acumulado a la izquierda (`left_node`) y le cuelgan el siguiente operando. Así `10 - 4 - 2` produce `(- (- 10 4) 2)`.
- **LL(2):** con `ID` al inicio de una sentencia se mira el token siguiente; si es `=`, se trata de una asignación.
- **FIRST(Expresion)** = { `ID`, `NUMERO`, `(` }. Se usa para detectar asignaciones mal formadas y operadores faltantes.

## 3. Manejo de errores (lo nuevo del Reto 2)

### 3.1 Detección
| Situación | Dónde se detecta | Ubicación del error |
|---|---|---|
| Operador sin operando derecho (`x=5+;`) | `factor_error()` | En el operador |
| Operador sin operando izquierdo (`* 3;`, `x = * 2;`) | `sentencia()` / `factor_error()` | En el operador |
| Operadores seguidos (`5 + * 3`) | `factor_error()` | En el primer operador |
| Paréntesis sin cerrar | `factor()` | En el `(` sin pareja |
| `)` sin apertura | `sentencia()` / `fin_sentencia()` | En el `)` |
| Paréntesis vacíos | `factor_error()` | En el `(` |
| Falta `=` (`x 5;`) | `sentencia()` | Donde debía ir el `=` |
| Falta variable / expresión / `=` repetido / lado izquierdo inválido | `sentencia()`, `factor_error()`, `fin_sentencia()` | En el token responsable |
| Falta `;` | `fin_sentencia()` | En el último token de la sentencia |
| Falta operador (`5 3`) | `fin_sentencia()` / `factor()` | En el segundo operando |
| Menos unario | `sentencia()` / `factor_error()` | En el `-` |

### 3.2 Recuperación
1. **A nivel de frase:** si falta el `;` y lo siguiente está en otra línea, se asume el `;` y se continúa sin descartar tokens.
2. **Modo pánico:** con cualquier otro error se lanza `ParseError` y `synchronize()` descarta tokens hasta el siguiente `;` o EOF. **Se detiene antes** si una línea nueva empieza con `ID =`.
3. **Tokens sueltos:** un `;` o `)` sobrante se reporta y se descarta solo ese token.
4. **Sin cascadas:** no se reportan dos errores en la misma posición y los tokens `ERROR` del lexer no llegan al parser.
5. **Garantía de avance:** si una iteración de `sentencias()` no consumió nada, se consume un token, lo que evita ciclos infinitos.

### 3.3 Límites
| Límite | Valor | Comportamiento al superarlo |
|---|---|---|
| Paréntesis anidados | 100 | Error sintáctico *"Demasiados paréntesis anidados"* |
| Operadores en una expresión | ~900 (límite de recursión de Python al serializar el AST) | Respuesta 200 con *"La expresión es demasiado larga o profunda"* |

## 4. Decisiones de diseño

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `Expresion'` y `Termino'` como ciclo | Mantener la recursión | Es la misma regla EBNF `{ ("+"\|"-") Termino }`; evita agotar la pila y genera la misma traza |
| Serializar la respuesta con `json.dumps` | `response_model` de FastAPI | El serializador de Pydantic limita el anidamiento a ~254 niveles (127 operadores); se conserva `response_model` para la documentación de `/docs` |
| No agregar menos unario | Ampliar la gramática | El examen pide no alterar el alcance del lenguaje sin justificación; se explica con un mensaje y una sugerencia |
| TAC solo sin errores sintácticos | Generarlo siempre | Un TAC parcial de un programa inválido es engañoso |
| Ubicar "falta ;" en el último token de la línea | Ubicarlo en el token siguiente | El usuario ve el error donde debe corregirlo |
| No modificar el frontend | Rediseñar mensajes en la UI | El contrato JSON no cambió; menos riesgo de regresiones e identidad visual intacta |

## 5. Pruebas

- `backend/test_compiler.py`: 6 pruebas originales, sin modificar.
- `backend/test_parser_reto2.py`: 48 pruebas que pasan por la API completa (`TestClient`): matriz P-01 a P-38, ejemplos precargados, traza, coherencia traza ↔ AST y expresiones largas.
- Ejecución: `pip install -r requirements-dev.txt` y luego `python -m pytest backend -v` → **54 aprobadas**.

## 6. Limitaciones conocidas

- La gramática no incluye menos unario, comparaciones, `if`/`while`, cadenas ni comentarios (son limitaciones del lenguaje original, no defectos).
- Los saltos de línea no tienen significado en la gramática. Si falta el `;` y la línea siguiente empieza con un operador, ambas líneas forman una sola sentencia válida: `x = 5↵- 3;` se lee como `x = 5 - 3;` y no se reporta error.
- Cuando una sentencia tiene un error sintáctico se descarta del AST, así que una variable asignada en ella puede aparecer después como *"no definida"* en el análisis semántico.
- El frontend publicado en GitHub Pages necesita el backend corriendo (local en el puerto 8001 o desplegado en Render). Abrir solo el HTML no ejecuta el análisis.
- Expresiones de más de ~900 operadores no se analizan (se informa con un mensaje).
