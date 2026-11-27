# Manual de Usuario — MiniOpt (Optimizador de Código Intermedio TAC)

## 1. ¿Qué es MiniOpt?
**MiniOpt** es un Objeto Virtual de Aprendizaje (OVA) integrado al Portal de Teoría de Compiladores de la Universidad Simón Bolívar. Permite ingresar código intermedio de tres direcciones (**TAC**), aplicar optimizaciones seguras y analizar paso a paso cómo y por qué el código se simplifica manteniendo su equivalencia semántica.

---

## 2. Cómo abrir la herramienta

### Opción A: Desde el Portal Integrado de OVAs (recomendado)
1. Abre el Portal de OVAS (en GitHub Pages o desde un servidor local en la raíz del repositorio).
2. En el **Dashboard** o en el **menú lateral (botón hamburguesa)**, selecciona la tarjeta **06 — MiniOpt (Optimizador TAC)**.
3. Haz clic en **Abrir OVA** (o haz clic en **Información** para ver su ficha técnica).
4. Puedes alternar entre **tema claro y oscuro** desde el botón del portal y MiniOpt se sincronizará automáticamente.

### Opción B: En servidor local para desarrollo o sustentación
Desde la raíz del repositorio `OVA-COMPILADORES-2026`, ejecuta:
```bash
python -m http.server 8080
```
Luego abre en tu navegador: `http://localhost:8080/#/ova/mini-opt`

---

## 3. Interfaz y controles principales

1. **Selector de ejemplos precargados (barra superior):** incluye 8 casos didácticos listos para probar (ejemplo oficial del PDF, simplificaciones algebraicas, temporales redundantes, código muerto, efectos secundarios protegidos, ciclo `while`, división por cero y error de sintaxis).
2. **Barra de reglas activas:** casillas de verificación para activar o desactivar de manera independiente cada optimización:
   * *Plegado de constantes*
   * *Propagación de constantes*
   * *Simplificación algebraica*
   * *Temporales redundantes*
   * *Código muerto*
3. **Editor TAC (panel izquierdo):**
   * Permite escribir una instrucción por línea o varias separadas por punto y coma (`;`).
   * Soporta comentarios de línea con `//` o `#`.
   * Atajo de teclado: presiona **`Ctrl + Enter`** para optimizar inmediatamente.
   * Botón **Separar por líneas**: convierte código escrito con `;` a formato multilínea legible.
4. **Indicadores KPI (panel derecho superior):**
   * Cantidad de instrucciones originales vs. optimizadas, porcentaje de reducción, número de reglas aplicadas y estado de equivalencia semántica.
5. **Pestañas de análisis:**
   * **Comparativa Antes / Después:** código original y optimizado lado a lado, botón **Copiar**, conteo por tipo de regla y tabla de **Evidencia de equivalencia**.
   * **Explicación Paso a Paso:** detalle cronológico de cada transformación aplicada (antes → después y justificación) más el bloque de **Protecciones de seguridad aplicadas**.
   * **Evolución por Pasadas:** muestra cómo evoluciona el código al final de cada pasada hasta converger.
   * **Guía de Reglas:** resumen teórico rápido de las 5 optimizaciones y las reglas de seguridad.

---

## 4. Sintaxis TAC aceptada

| Tipo de instrucción | Ejemplo válido | Notas |
| :--- | :--- | :--- |
| Operación binaria | `t1 = 5 + 3`, `t2 = a * b` | Operadores: `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||` |
| Operación unaria | `t1 = -x`, `t2 = !flag` | Operadores: `-`, `+`, `!` |
| Copia / asignación | `x = t1`, `a = 10` | Variables o constantes numéricas/booleanas |
| Etiqueta | `L1:` | Marca el inicio de un nuevo bloque básico |
| Salto incondicional | `goto L1` | La etiqueta destino debe existir en el programa |
| Salto condicional | `if a < b goto L1`, `ifFalse t1 goto L2` | Condición simple o relación binaria |
| Entrada / Salida | `print x`, `read dato` | Protegidas contra eliminación (efecto secundario) |
| Llamadas y retorno | `param x`, `call f, 1`, `t1 = call leer, 0`, `return x` | Protegidas contra eliminación (efecto secundario) |

---

## 5. Ejemplo rápido paso a paso
1. Selecciona **Ejemplo 1: Demostración oficial (PDF)**:
   ```text
   t1 = 5 + 3
   t2 = t1 * 2
   t3 = t2 + 0
   x = t3
   ```
2. Haz clic en **▶ Optimizar TAC**.
3. En **Comparativa Antes / Después** verás el resultado simplificado **`x = 16`** y el indicador **Equivalencia: Verificada ✓** (`x = 16` en ambas versiones).
4. Abre **Explicación Paso a Paso** para revisar qué reglas se aplicaron y por qué cada transformación es segura.
