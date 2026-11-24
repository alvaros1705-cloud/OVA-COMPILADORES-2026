# Manual de usuario — Analizador Sintáctico EBNF

*Versión actualizada para el Reto 2 (2026-II) por el Grupo 2 (Kevin Flórez, Kevin Sandoval y Jordani Rodríguez). Se basa en la guía original de Fabián y Sofi (`GUIA_USUARIO.pdf`), que se conserva en el proyecto.*

## 1. Qué es esta aplicación
Simula las primeras fases de un compilador: divide el código en tokens, verifica que cumpla la gramática, construye el árbol sintáctico (AST), revisa el significado (análisis semántico) y genera código intermedio (TAC). No ejecuta el código.

## 2. Requisitos
- Windows 10 o superior (también funciona en Mac y Linux)
- Python 3.11 o superior
- Chrome, Firefox o Edge
- Conexión a internet la primera vez (el editor y los estilos se cargan desde internet)

## 3. Instalación y ejecución
1. Abre una terminal dentro de la carpeta `analizador-sintactico`.
2. Crea y activa un entorno virtual:
   ```bash
   python -m venv venv
   venv\Scripts\activate          # Windows
   source venv/bin/activate       # Mac / Linux
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Inicia el servidor en el puerto **8001**:
   ```bash
   uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001
   ```
5. Abre **http://127.0.0.1:8001** en el navegador.

> **Importante:** usa el puerto 8001. La guía anterior indicaba el 8000, pero la aplicación busca el servidor en el 8001; con otro puerto aparece *"No se pudo conectar con el servicio de análisis"*.

**Desde el portal de OVAs:** con el servidor encendido como en el paso 4, entra al portal, abre *Analizador Sintáctico* y la página se conectará a `http://localhost:8001`.

Para cerrar el servidor, presiona `Ctrl + C` en la terminal. No la cierres mientras uses la aplicación.

## 4. Pantalla principal
- **Izquierda:** editor de código y, debajo, la barra del modo paso a paso.
- **Derecha:** pestañas *Tokens*, *Tabla de símbolos*, *Errores* y *Código intermedio (TAC)*.
- **Abajo:** árbol sintáctico (AST) interactivo.

## 5. Cómo escribir código válido
| Elemento | Ejemplo |
|---|---|
| Variables | `x`, `resultado`, `base_1` |
| Números enteros y reales | `10`, `3.14` |
| Operadores | `+  -  *  /` |
| Asignación (termina en `;`) | `x = 5;` |
| Expresión suelta (termina en `;`) | `5 * (2 + 3);` |
| Paréntesis | `y = (4 + 2) * 3;` |

**Reglas de agrupación:**
- `*` y `/` se calculan antes que `+` y `-`: `5 + 3 * 2` es `5 + (3 * 2)`.
- Con operadores del mismo nivel se agrupa de izquierda a derecha: `10 - 4 - 2` es `(10 - 4) - 2`.
- Los paréntesis cambian el orden: `(5 + 3) * 2`.

**Lo que el lenguaje no admite:** números negativos escritos con `-` al inicio (`-5`; escribe `(0 - 5)`), comparaciones, `if`, `while`, cadenas de texto y comentarios.

## 6. Controles del encabezado
- **Cargar ejemplo:** 17 programas de prueba (ver sección 10).
- **Historial reciente:** los últimos 5 códigos analizados sin errores.
- **Limpiar:** borra el editor y los resultados.
- **Analizar Código:** envía el código al servidor.

## 7. Pestañas de resultados
- **Tokens:** cada pieza del código con su tipo, línea y columna.
- **Tabla de símbolos:** variables, tipo (Entero/Real), valor y historial de asignaciones.
- **Errores:** errores léxicos, sintácticos y semánticos con línea, columna y una sugerencia. Al hacer clic en un error se resalta su ubicación en el editor.
- **TAC:** código de tres direcciones (por ejemplo `t0 = 3 * 2`). Solo se genera cuando el código no tiene errores léxicos ni sintácticos.

## 8. Cómo leer los errores sintácticos
El analizador revisa todo el programa: si una línea tiene un error, lo informa y **sigue con las siguientes**, de modo que puedes ver varios errores de una sola vez.

| Si escribes… | Verás… | Cómo corregirlo |
|---|---|---|
| `x=5+;` | Expresión incompleta: el operador '+' no tiene operando derecho | Completa la operación: `x = 5 + 1;` |
| `x = (5 + 3;` | Paréntesis sin cerrar: el '(' de la línea 1, columna 5 no tiene su ')' | Agrega el `)` |
| `x = 5 + 3);` | Paréntesis de cierre ')' sin '(' de apertura | Quita el `)` o agrega el `(` |
| `x 5;` | Asignación mal formada: falta '=' entre 'x' y '5' | `x = 5;` |
| `x = ;` | Asignación incompleta: falta la expresión después de '=' | `x = 5;` |
| `= 5;` | Asignación mal formada: falta la variable antes de '=' | `x = 5;` |
| `x = 5` | Falta ';' al final de la sentencia, después de '5' | `x = 5;` |
| `x = 5 3;` | Falta un operador entre '5' y '3' | `x = 5 + 3;` |
| `x = 5 + * 3;` | Operadores seguidos | Quita un operador o pon un valor entre ellos |
| `x = ();` | Paréntesis vacíos | Escribe algo dentro: `(1 + 2)` |
| `x = -5;` | El operador unario '-' no está soportado | `x = 0 - 5;` |
| `x = 5;;` | ';' sobrante: sentencia vacía | Quita el `;` extra |

## 9. Árbol sintáctico (AST)
- **Diseños:** vertical, horizontal y radial.
- **Zoom:** `+`, `-` y *Reset*.
- **Clic en un nodo:** lo colapsa o lo expande.
- **Mouse sobre un nodo:** resalta en el editor el texto exacto que representa, incluidos los paréntesis.
- Si hay errores, el árbol muestra solo las sentencias correctas.

## 10. Modo paso a paso
Usa la barra debajo del editor (reproducir, anterior, siguiente y velocidad) para ver cómo el parser entra a cada regla, consume tokens, crea nodos y, si hay errores, cómo se recupera (*Sincronización del parser*).

## 11. Ejemplos precargados
| N.º | Contenido |
|---|---|
| 1 – 6 | Código válido (asignaciones, precedencia, paréntesis, decimales, expresión suelta) |
| 7 | Falta punto y coma (el análisis continúa en la línea siguiente) |
| 8 | Paréntesis desbalanceados |
| 9 | Variable no definida (semántico) |
| 10 | División por cero (semántico) |
| 11 – 15 | Los cinco casos mínimos del examen (P-01 a P-05) |
| 16 | Programa con cuatro errores distintos para ver la recuperación |
| 17 | Asociatividad izquierda (`10 - 4 - 2` y `16 / 4 / 2`) |

## 12. Exportar
- **Exportar PNG:** imagen del árbol.
- **Reporte PDF:** informe con el código, el AST, los símbolos, los tokens y los errores.

## 13. Pruebas automáticas (para desarrolladores)
```bash
pip install -r requirements-dev.txt
python -m pytest backend -v
```
Se ejecutan 54 pruebas (ver `docs/MATRIZ_PRUEBAS.md`).

## 14. Problemas frecuentes
| Problema | Solución |
|---|---|
| *"No se pudo conectar con el servicio de análisis"* | Verifica que el servidor esté corriendo en el puerto **8001** desde la carpeta `analizador-sintactico`. Desde el portal, revisa que la URL configurada del analizador sintáctico sea `http://localhost:8001`. |
| `python` no se reconoce | Reinstala Python marcando *Add Python to PATH*. |
| El editor aparece en blanco o como un cuadro de texto simple | Recarga con F5 y revisa tu conexión a internet (el editor Monaco se carga desde internet). |
| *"La expresión es demasiado larga o profunda"* | Divide la expresión en varias asignaciones más cortas. |

## 15. Glosario
- **Token:** unidad mínima del código (un número, una variable, un operador…).
- **Lexer:** divide el texto en tokens.
- **Parser:** verifica que los tokens cumplan la gramática y construye el AST.
- **AST:** árbol de sintaxis abstracta; muestra cómo se agrupan las operaciones.
- **Recuperación de errores:** capacidad del parser de seguir analizando después de un error.
- **TAC:** código de tres direcciones, una representación intermedia.
- **Backend:** servidor en Python (FastAPI). **Frontend:** la página web.
