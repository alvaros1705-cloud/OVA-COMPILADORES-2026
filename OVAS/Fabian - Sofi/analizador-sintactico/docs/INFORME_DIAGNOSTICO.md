# Informe de diagnóstico — Reto 2: Analizador Sintáctico EBNF

**Grupo 2:** Kevin Flórez · Kevin Sandoval · Jordani Rodríguez
**Proyecto de referencia:** `OVAS/Fabian - Sofi/analizador-sintactico` (autores originales: Fabián y Sofi)
**Asignatura:** Teoría de Compiladores — Ingeniería de Sistemas, 2026-II

## 1. Cómo se hizo el diagnóstico

1. Se clonó el repositorio institucional y se comprobó que el contenido de la carpeta `Fabian - Sofi` es idéntico al zip entregado por el docente.
2. Se levantó el backend (`uvicorn backend.main:app --port 8001`) y se comprobaron `/health`, `/api/examples`, `/api/analyze` y la carga del frontend desde el mismo servidor.
3. Se ejecutaron las 6 pruebas originales del proyecto (`backend/test_compiler.py`): las 6 pasan, pero ninguna cubre los casos del examen.
4. Se escribieron los casos mínimos del examen y otros 33 casos (inválidos, límite y de formato) y se ejecutaron contra la versión original. Resultado: **12 de 38 aprobados**.
5. Para cada falla se rastreó el código hasta encontrar la causa antes de modificar nada. Se conservó una copia de la versión original para comparar el antes y el después.

## 2. Arquitectura encontrada

```
Editor (frontend/index.html + script.js)
   │  POST /api/analyze  { code }
   ▼
backend/main.py ── Lexer (lexer.py) ── tokens
                └─ Parser (parser.py) ── AST (ast_nodes.py) + errores + traza (paso a paso)
                └─ ASTAnalyzer (analyzer.py) ── tabla de símbolos + errores semánticos
                └─ TACGenerator (tac_generator.py) ── código de tres direcciones
   ▼
JSON → pestañas Tokens / Símbolos / Errores / TAC + árbol D3
```

El parser es **descendente recursivo** sobre esta gramática (sin recursividad izquierda):

```ebnf
Programa   → Sentencias EOF
Sentencia  → Asignacion | Expresion ";"        (LL(2): ID seguido de "=" ⇒ asignación)
Asignacion → ID "=" Expresion ";"
Expresion  → Termino Expresion'      Expresion' → ("+" | "-") Termino Expresion' | ε
Termino    → Factor Termino'         Termino'   → ("*" | "/") Factor Termino' | ε
Factor     → "(" Expresion ")" | ID | NUMERO
```

**Lo que sí funcionaba bien:** la precedencia (`*` y `/` antes que `+` y `-`) y la asociatividad izquierda (`10 - 4 - 2` = `(10 - 4) - 2`) estaban correctas, y el AST de las expresiones válidas tenía la forma correcta (casos P-01, P-02, P-06 a P-11).

## 3. Defectos encontrados

| ID | Defecto | Cómo reproducirlo | Causa en el código original | Severidad |
|---|---|---|---|---|
| D-01 | Los mensajes usan los nombres internos de los tokens y no explican el problema: *"Se esperaba 'RPAREN' pero se encontro ';'"*, *"Se esperaba 'SEMICOLON' pero se encontro 'EOF'"*. | `x = (5 + 3;` · `x = 5` | `parser.py`, `match()` (línea 55) arma el mensaje con `expected_type` tal cual. | Media |
| D-02 | Una asignación sin `=` se diagnostica como *"falta punto y coma"*. | `x 5;` → `Se esperaba 'SEMICOLON' pero se encontro '5'` | `sentencia()` (líneas 137-142): si después del ID no viene `=`, se asume que la sentencia es una expresión `x` y se exige `;`. Nunca se considera que falte el `=`. | Alta |
| D-03 | Operadores sin operando: el error apunta al token siguiente y no dice cuál operador quedó incompleto. Lo mismo con `x = ;`, `x = = 5;`, `x = ();`, `x = 5 + * 3;` y `-5`: todos reciben el mismo mensaje genérico. | `x=5+;` → error en C5 (el `;`) en vez de C4 (el `+`) | `factor()` (líneas 314-318) tiene un único mensaje para cualquier token inesperado y no mira el token anterior. | Media |
| D-04 | Un paréntesis sin cerrar se reporta en el `;` y no se dice dónde se abrió. | `x = (5 + 3;` → L1:C11 | `factor()` llama `match('RPAREN')` sin guardar el token `(`. | Media |
| D-05 | La falta de `;` al final de una línea se reporta en la línea siguiente. | `x = 5↵y = 3;` → L2:C1 | `match('SEMICOLON')` reporta en el token actual, que ya es el de la línea 2. | Media |
| D-06 | **La recuperación de errores descarta sentencias correctas.** | `x = 5↵y = 3;↵z = 4;` → el AST solo tiene `z = 4` (se pierden `x` y `y`) | `synchronize()` (líneas 323-329) avanza hasta el siguiente `;` aunque en el camino empiece una sentencia nueva. | Alta |
| D-07 | **Un `)` suelto detiene todo el análisis**: lo que sigue nunca se revisa y aparece *"Se esperaba 'EOF'"*. | `x = 1; ) y = 2;` | `sentencias()` (línea 114): el ciclo `while` también termina cuando el token es `RPAREN`. | Alta |
| D-08 | El rango del nodo *Asignación* termina en el token siguiente al `;`, así que al pasar el mouse por el nodo se resalta texto de la otra sentencia. | `x = 1; y = 2;` → nodo `x =` con rango [0, 8] en vez de [0, 6] | `asignacion()` (línea 161) usa `self.current_token.end_idx` después de consumir el `;`. | Baja |
| D-09 | Las operaciones entre paréntesis no incluyen el `(` en su rango: en `(5 + 3) * 2` el nodo `*` resalta `5 + 3) * 2`. | `x = (5 + 3) * 2;` → nodo `*` empieza en 5 | El `BinOpNode` toma el inicio de su hijo izquierdo, que no incluye el paréntesis. | Baja |
| D-10 | **Error 500** con dígitos Unicode como `²`. | `x = ²;` | `lexer.py` usa `str.isdigit()`, que acepta `²`; luego `int('²')` falla en `parser.py` (línea 301). | Alta |
| D-11 | **Error 500** con expresiones largas: desde **127 sumas seguidas** o **329 paréntesis anidados**. El frontend muestra *"No se pudo conectar con el servicio"*, lo que confunde al usuario. | `x = 1+1+…+1;` (127 términos) | Recursión de `Expresion'`/`Termino'` (un nivel por operador) y el serializador de Pydantic, que solo admite ~254 niveles de anidamiento en el JSON del AST. | Alta |
| D-12 | Errores duplicados: un carácter ilegal se reporta como error léxico y otra vez como sintáctico. | `a = 5 $ 10;` | El lexer agrega el token `ERROR` a la lista y el parser lo vuelve a reportar. | Baja |
| D-13 | Se genera TAC para programas con errores sintácticos: el código intermedio sale incompleto y sin advertencia. | `x = 5 +; y = 2;` → TAC `y = 2` | `main.py` (líneas 52-55) genera el TAC siempre que exista AST. | Media |
| D-14 | *(Configuración / documentación)* La guía de usuario indica el puerto **8000** y `pip install fastapi uvicorn pydantic`, pero el frontend en `localhost` siempre llama a la API en el puerto **8001**. Siguiendo la guía, la app muestra *"No se pudo conectar"*. | Seguir la sección 3 de `GUIA_USUARIO.pdf` | `frontend/script.js` (líneas 81-82) fija `http://localhost:8001`; el README sí usa 8001. | Media |

## 4. Resultados de los casos mínimos del examen en la versión original

| Entrada | Esperado por el examen | Resultado original | Diagnóstico |
|---|---|---|---|
| `x = 5 + 3 * 2;` | Aceptada, `*` con prioridad | Aceptada, AST correcto | Correcto |
| `x = (5 + 3) * 2;` | Aceptada, respeta paréntesis | Aceptada, AST correcto (rango del nodo `*` mal, D-09) | Correcto con detalle |
| `x=5+;` | Error por expresión incompleta | Error genérico en el `;` (C5) | Detecta, mensaje pobre (D-03) |
| `x = (5 + 3;` | Error por paréntesis sin cerrar | *"Se esperaba 'RPAREN'…"* en C11 | Detecta, mensaje pobre (D-01, D-04) |
| `x 5;` | Error por asignación mal formada | *"Se esperaba 'SEMICOLON'…"* | **Diagnóstico incorrecto** (D-02) |

## 5. Lo que no se cambió (fuera del alcance del reto)

- **El lenguaje:** no se agregó el menos unario, comparaciones, `if`, `while` ni comentarios. Se mantuvo la gramática original; solo se mejoró cómo se informan los errores (por ejemplo, `-5` ahora dice explícitamente que el menos unario no está soportado).
- **El analizador semántico y el frontend:** no tenían relación con los defectos del reto y funcionan igual. Las pruebas de regresión confirman que los errores semánticos se siguen detectando.
