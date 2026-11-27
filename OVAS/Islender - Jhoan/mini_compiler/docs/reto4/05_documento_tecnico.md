# 5. Documento técnico

## 5.1 Arquitectura

```
Portal (index.html + script.js)
  │  iframe → OVAS/Islender - Jhoan/mini_compiler/frontend/index.html
  │  postMessage USB_PORTAL_CONFIG { apiUrls.miniCompilador }
  ▼
Frontend (HTML/CSS/JS)  ── POST /api/compile {source} ──►  Backend FastAPI (backend/main.py)
                         ◄── {success, tokens, quadruples,          │
                              symbol_table, errors, warnings}       ▼
                                                api/routes/compiler_routes.py
                                                            │
                                                compiler/compiler_pipeline.py
          ┌──────────────┬──────────────────┬──────────────────────┬─────────────────┐
          ▼              ▼                  ▼                      ▼                 
   lexical/lexer.py  syntax/parser.py  semantic/semantic_       intermediate/
   (tokens)          (AST, recursivo   analyzer.py (tabla de    tac_generator.py
                      descendente)      símbolos, tipos)         (cuádruplas)
```

- **Pipeline** (`compiler_pipeline.py`): ejecuta las fases en orden y se detiene en la primera que reporte errores. Cada error lleva el prefijo de su fase (`[Léxico]`, `[Sintáctico]`, `[Semántico]`, `[Límite]`).
- **AST y visitantes:** cada nodo implementa `accept(visitor)`. Tanto `SemanticAnalyzer` como `TACGenerator` son visitantes.
- **TAC:** `Quadruple(op, arg1, arg2, result)`. Los temporales `tN` y las etiquetas `LN` vienen de contadores por compilación, porque se crea un `TACGenerator` nuevo en cada petición, así que la numeración empieza en 1 cada vez.

## 5.2 Archivos modificados

| Archivo | Tipo | Motivo |
|---|---|---|
| `backend/app/compiler/lexical/lexer.py` | Corrección | D2: se quita el avance duplicado en la recuperación |
| `backend/app/compiler/tokens/token_stream.py` | Corrección | D1: `expect()` lanza el error del compilador, con posición |
| `backend/app/compiler/syntax/parser.py` | Corrección | D1: sincronización tras `;` o `}` y garantía de progreso |
| `backend/app/compiler/compiler_pipeline.py` | Corrección | D6: `RecursionError` pasa a ser un error controlado |
| `backend/app/compiler/semantic/semantic_analyzer.py` | Corrección | D4: se valida el valor de `x = expr;` |
| `backend/app/compiler/intermediate/tac_generator.py` | Corrección | D5: salto alrededor de las funciones. D7: `if` sin `else` |
| `.gitignore` | Configuración | D8 |
| `pytest.ini`, `tests/conftest.py`, `tests/**/test_*.py` | Pruebas | 23 pruebas nuevas |
| `scripts/casos_reto4.py` | Herramienta | Catálogo reproducible de casos antes y después |
| `docs/reto4/**`, `README.md` | Documentación | Entregables del reto |

**No se modificaron** el frontend, el portal, las hojas de estilo compartidas, la identidad visual ni los créditos de los autores originales. No se borró código fuente: solo se dejaron de versionar los `.pyc` generados y el `.env` vacío.

## 5.3 Decisiones técnicas

1. **Cambios mínimos y localizados.** Cada defecto se corrigió en el punto donde nace (el lanzamiento del error, la visita del nodo o la emisión de la cuádrupla) y no con parches en la interfaz. Por ejemplo, el falso "Error de conexión" (D3) se resolvió eliminando la excepción que lo provocaba, no cambiando el texto del mensaje.
2. **El contrato de la API no cambia.** La respuesta de `/api/compile` tiene los mismos campos. Así, el frontend publicado en GitHub Pages sigue funcionando con el backend corregido.
3. **Formato de las cuádruplas.** No se introdujeron operadores nuevos. El salto alrededor de las funciones usa `GOTO` y `LABEL`, que ya existían y que el frontend ya muestra.
4. **Recuperación de errores en modo pánico.** Se descartan tokens hasta el fin de la sentencia (`;`), el cierre del bloque (`}`) o una palabra que inicie una sentencia. Se eligió este método porque es el estándar de los parsers recursivos descendentes y no requiere modificar la gramática.
5. **Límite de recursión.** El `RecursionError` se captura en lugar de aumentar `sys.setrecursionlimit`, que solo desplaza el límite y puede agotar la pila real del proceso.
6. **Pruebas primero.** Las pruebas se escribieron y se registraron fallando (`pytest_antes.txt`) antes de cada corrección. Con eso queda demostrado que cada prueba detecta el defecto que pretende cubrir.

## 5.4 Verificación realizada

- `python -m pytest`: **23 de 23 pruebas pasan** (antes fallaban 15).
- `scripts/casos_reto4.py`: **37 casos, ninguna excepción** (antes había 7). Los programas inválidos ya no generan TAC.
- **Extremo a extremo:** backend con `uvicorn` en el puerto 8002 y portal servido en el puerto 8080. La OVA se abrió desde la tarjeta del portal y se compilaron casos válidos y de error con Playwright, comparando contra el backend original de `main` en el puerto 8003. Las capturas están en `evidencias/` (los archivos `antes_*.png` y `despues_*.png`).
- Con `curl` se comprobó que `POST /api/compile` con `x 5;` responde **HTTP 200** (antes respondía 500).

## 5.5 Limitaciones conocidas

| # | Limitación | Motivo para no corregirla en este reto |
|---|---|---|
| 1 | `&&` y `\|\|` se traducen como operadores binarios, sin evaluación en cortocircuito | Cambia la forma del TAC de todas las condiciones. Se propone como mejora futura con saltos `IF_FALSE` y `GOTO` |
| 2 | Una variable declarada en un bloque interno con el mismo nombre que otra externa comparte el nombre en el TAC | Requiere renombrar las variables por ámbito en el generador |
| 3 | No se validan la aridad ni los tipos de los argumentos, ni el `return` fuera de una función o faltante en funciones no `void` | Son reglas semánticas, alcance del Reto 3 |
| 4 | `TYPE_COMPAT` acepta `float` en variables `int` y `%` con `float` | Es una decisión del lenguaje original; cambiarla alteraría su alcance |
| 5 | La pestaña "AST" del frontend se reconstruye a partir de las cuádruplas, no del AST real, y "Símbolos" solo muestra el ámbito global | Es un aspecto de presentación; no afecta la corrección del TAC |
| 6 | Las cadenas no admiten secuencias de escape (`\"`, `\n`) | Así lo define el lexer original; se documenta como límite del lenguaje |
| 7 | Una excepción interna no prevista volvería a producir HTTP 500 sin CORS (mensaje de "Error de conexión") | Las causas conocidas se eliminaron; un manejador global de errores sería una mejora futura |
| 8 | El proyecto conserva 142 archivos vacíos (módulos y documentación de plantilla) | No se eliminan sin autorización del docente, según los lineamientos del examen |
