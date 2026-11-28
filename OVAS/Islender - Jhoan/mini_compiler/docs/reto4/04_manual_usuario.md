# 4. Manual de usuario: Mini Compilador (TAC)

## 4.1 ¿Qué hace?

El Mini Compilador recibe un programa escrito en **MiniC** y lo procesa en cuatro fases:

1. **Léxico:** divide el texto en tokens.
2. **Sintáctico:** verifica la gramática.
3. **Semántico:** comprueba tipos, declaraciones y ámbitos.
4. **Código intermedio:** genera el código de tres direcciones (TAC) en forma de cuádruplas.

Si una fase encuentra errores, el proceso se detiene y **no se genera TAC**.

## 4.2 Puesta en marcha

### Requisitos
Python 3.11 o superior y un navegador moderno.

### Backend (API)
```bash
cd "OVAS/Islender - Jhoan/mini_compiler"
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8002
```
Para verificar que está arriba, abra `http://localhost:8002/health`; debe responder `{"status":"ok"}`.

### Portal y OVA
Desde la raíz del repositorio ejecute `python -m http.server 8080`. Luego abra `http://localhost:8080` y elija **04 · Mini Compilador (TAC) → Abrir OVA**.

El portal le indica a la OVA la URL de la API, que por defecto es `http://localhost:8002`. En el portal publicado (GitHub Pages) hay que configurar en el portal la URL del backend desplegado (Render).

## 4.3 Uso de la interfaz

| Zona | Función |
|---|---|
| **Código fuente** | Editor del programa. La tecla Tab inserta 4 espacios y F5 compila |
| **Ejemplos / Hello / Funciones / Control / Error** | Cargan programas de ejemplo |
| **▶ Compilar** | Envía el código a la API |
| **✕ Limpiar** | Borra el editor y los resultados |
| Barra de estado | "Compilación exitosa — N tokens · M cuádruplas" |
| Pestaña **Tokens** | Tipo, valor, línea y columna de cada token |
| Pestaña **Cuádruplas** | El TAC: operador, arg1, arg2 y resultado |
| Pestaña **AST** | Vista resumida derivada de las cuádruplas |
| Pestaña **Símbolos** | Variables y funciones del ámbito global con su tipo |
| Pestaña **Errores** | Errores con su fase y posición: `[Fase] [(línea:columna)] mensaje` |

## 4.4 Lenguaje MiniC (resumen)

```c
int x = 10;  float pi = 3.14;  string s = "hola";  bool b = true;
func suma(int a, int b) : int { return a + b; }
if (x > 5) { print(x); } else { print(0); }
while (x > 0) { x = x - 1; }
for (int i = 0; i < 3; i = i + 1) { print(i); }
// comentario de línea      /* comentario de bloque */
```

## 4.5 Cómo leer las cuádruplas

| Cuádrupla | Significado |
|---|---|
| `(+, a, b, t1)` | `t1 = a + b`. Lo mismo vale para `- * / % < > <= >= == != && \|\|` |
| `(UNARY_-, a, _, t1)` / `(UNARY_!, c, _, t2)` | `t1 = -a` / `t2 = !c` |
| `(=, t1, _, x)` | `x = t1` |
| `(DECL, int, _, x)` | Declaración sin valor inicial |
| `(LABEL, _, _, L1)` | Etiqueta `L1:` |
| `(GOTO, _, _, L1)` | Salto incondicional a `L1` |
| `(IF_FALSE, t1, _, L2)` | Si `t1` es falso, saltar a `L2` |
| `(FUNC_BEGIN, f, _, func_f)` … `(FUNC_END, f, _, )` | Cuerpo de la función `f`. Va precedido de `GOTO Lk` y seguido de `LABEL Lk`, para que el programa principal no entre en él |
| `(PARAM, a, _, )` | Parámetro formal que recibe la función |
| `(ARG, v, _, )` + `(CALL, f, n, t)` | Pasar `n` argumentos y llamar a `f`; el valor de retorno queda en `t` |
| `(RETURN, v, _, )` | Retornar `v` |
| `(PRINT, v, _, )` | Imprimir `v` |

## 4.6 Mensajes de error frecuentes

| Mensaje | Causa típica |
|---|---|
| `[Léxico] Carácter no reconocido: '@'` | Un símbolo que no pertenece a MiniC |
| `[Léxico] String sin cerrar` | Falta la comilla de cierre |
| `[Sintáctico] Se esperaba SEMICOLON …` | Falta un `;` (la posición indica el token siguiente) |
| `[Sintáctico] Se esperaba RPAREN …` | Paréntesis sin cerrar |
| `[Sintáctico] Expresión inesperada: ';'` | Expresión incompleta, como `x = 5 + ;` |
| `[Semántico] Variable 'y' no declarada` | Se usa una variable antes de declararla |
| `[Semántico] No se puede asignar 'string' a 'int'` | Tipos incompatibles en una asignación |
| `[Límite] … anidamiento demasiado profundo` | Expresión con un anidamiento excesivo |
| `Error de conexión … Configure la URL de la API` | La API no está corriendo o la URL configurada en el portal es incorrecta |

## 4.7 Pruebas

```bash
cd "OVAS/Islender - Jhoan/mini_compiler"
pip install pytest httpx
python -m pytest                     # 23 pruebas
python scripts/casos_reto4.py        # catálogo de 37 casos con sus cuádruplas
```
