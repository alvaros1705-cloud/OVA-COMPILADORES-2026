# Guion de sustentación (video de 6–7 minutos)

**Grupo 2:** Kevin Flórez (KF) · Kevin Sandoval (KS) · Jordani Rodríguez (JR)
**Antes de grabar:** servidor encendido (`uvicorn backend.main:app --port 8001`), el portal abierto en *Analizador Sintáctico* y una terminal lista en la carpeta `analizador-sintactico`.

---

### 1. Presentación — KF (≈ 40 s)
"Somos el grupo 2. Nos tocó el reto 2: recuperar y fortalecer el Analizador Sintáctico EBNF que hicieron Fabián y Sofi. Es un parser descendente recursivo en Python con FastAPI que construye el AST, muestra el paso a paso y genera TAC. Les vamos a mostrar qué fallas encontramos, por qué pasaban, cómo las corregimos y cómo lo comprobamos."

*Pantalla:* portal → tarjeta del analizador → app abierta.

### 2. Arquitectura y gramática — KF (≈ 1 min)
- Mostrar `docs/DOCUMENTO_TECNICO.md`: flujo lexer → parser → semántico → TAC.
- Mostrar la gramática y explicar: "La precedencia sale de los niveles: `Factor` dentro de `Termino` y `Termino` dentro de `Expresion`, por eso `*` se agrupa primero. `Expresion'` va armando el árbol hacia la izquierda, y eso da la asociatividad izquierda."
- **En vivo:** analizar `x = 5 + 3 * 2;` y mostrar el AST: `+` en la raíz y `*` como hijo derecho. Luego `x = (5 + 3) * 2;`: ahora `*` queda en la raíz.

### 3. Diagnóstico — KS (≈ 1 min 30 s)
"Lo primero fue reproducir los errores antes de tocar código. Corrimos 38 casos contra la versión original: pasaron 12."
Mostrar `docs/INFORME_DIAGNOSTICO.md` y explicar tres defectos con su causa:
1. **`x 5;` decía *falta punto y coma*.** Causa: con LL(2), si después del ID no venía `=`, el parser asumía una expresión y pedía `;`. Nunca pensaba en que faltara el `=`.
2. **La recuperación se comía sentencias correctas.** Con `x = 5`, `y = 3;` y `z = 4;` en tres líneas, solo quedaba `z` en el árbol, porque `synchronize()` saltaba hasta el siguiente `;`. Y un `)` suelto detenía todo el análisis por la condición del `while` en `sentencias()`.
3. **El servidor se caía (error 500)** con 127 sumas seguidas o con un `²`, y el usuario solo veía *"No se pudo conectar"*.

### 4. Solución — KS (≈ 1 min)
Mostrar `backend/parser.py`:
- `fin_sentencia()` y `factor_error()`: miran el token anterior para dar el mensaje exacto y lo ubican donde hay que corregir.
- `synchronize()`: se detiene si una línea nueva empieza con `ID =`. Además hay recuperación a nivel de frase cuando falta el `;`.
- `Expresion'` y `Termino'` como ciclo: es la misma regla, genera la misma traza y no agota la pila.
- Mencionar `main.py`: el TAC solo se genera si no hay errores sintácticos, y la respuesta se serializa sin el límite de Pydantic.

### 5. Demostración en vivo — JR (≈ 1 min 30 s)
1. **Casos del examen** (usar *Cargar ejemplo* 13, 14 y 15):
   - `x=5+;` → "el operador '+' no tiene operando derecho", L1:C4. Hacer clic en el error para ver el resaltado.
   - `x = (5 + 3;` → "el '(' de la línea 1, columna 5 no tiene su ')'".
   - `x 5;` → "Asignación mal formada: falta '='".
2. **Recuperación** (ejemplo 16): 4 errores en las líneas 2, 3, 4 y 5, y el árbol conserva `a`, `e` y `f`. Reproducir el paso a paso hasta ver *Sincronización del parser*.
3. **Pruebas automáticas:** en la terminal, `python -m pytest backend -v` → 54 aprobadas.

### 6. Pruebas y limitaciones — JR (≈ 40 s)
- Mostrar `docs/MATRIZ_PRUEBAS.md`: 38/38 en la versión mejorada frente a 12/38 en la original, con la columna de comparación.
- Limitaciones: no se agregó menos unario ni nuevas instrucciones porque el examen pide no cambiar el alcance del lenguaje; ahora `-5` da un mensaje claro con la sugerencia `(0 - 5)`.

### 7. Cierre — KF (≈ 20 s)
"Los cambios están en la rama `reto2-g2-analizador-sintactico` con un Pull Request hacia `main` sin fusionar, como pide el docente. La documentación completa está en la carpeta `docs/`. Gracias."

---

**Preguntas que pueden hacerle a cualquiera (prepárenlas los tres):**
- ¿Por qué la gramática no tiene recursividad izquierda? → Un parser descendente recursivo entraría en un ciclo infinito; por eso se factoriza con `Expresion'`.
- ¿Qué es el modo pánico? → Descartar tokens hasta un token de sincronización (`;`) para seguir analizando.
- ¿Qué es la recuperación a nivel de frase? → Corregir localmente, por ejemplo asumir el `;` que falta, sin descartar tokens.
- ¿Dónde se decide que `x 5;` es una asignación mal formada? → En `sentencia()`: ID seguido de un elemento de FIRST(Expresion) en la misma línea.
- ¿Por qué el ciclo da el mismo árbol que la recursión? → `Expresion'` es recursiva por la cola: cada vuelta usa el nodo acumulado como hijo izquierdo.
- **Si piden modificar algo en vivo** (por ejemplo, cambiar el límite de paréntesis): está en la constante `MAX_NESTING`, al inicio de `parser.py`.
