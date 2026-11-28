# Guía para Pull Request, Video de Sustentación (5+ min) y Defensa en Vivo

---

## 1. Personalizar tu nombre / integrantes antes de subir a GitHub

Reemplaza `"Equipo Reto 6"` por tu nombre o el de tus compañeros en estos 3 lugares:
1. `index.html` (tarjeta `#card-ova-6` → `<span class="card-author">...</span>` y modal `#details-ova-6-modal`).
2. `script.js` (clave `'mini-opt'` → `author: 'Desarrollado por ...'`).
3. Encabezados de los documentos en `OVAS/MiniOpt/docs/`.

---

## 2. Pasos exactos para subir tu trabajo a GitHub y abrir el Pull Request

1. **Haz Fork del repositorio del docente:**
   * Entra a `https://github.com/alvaros1705-cloud/OVA-COMPILADORES-2026` y presiona **Fork**.
2. **Clona TU fork** (usando Git o GitHub Desktop):
   ```bash
   git clone https://github.com/<TU_USUARIO>/OVA-COMPILADORES-2026.git
   cd OVA-COMPILADORES-2026
   ```
3. **Crea tu rama de trabajo (NUNCA edites `main` directamente):**
   ```bash
   git checkout -b feat/miniopt-reto6
   ```
4. **Copia los archivos desarrollados a tu repositorio clonado:**
   * Carpeta completa `OVAS/MiniOpt/`
   * Archivos actualizados `index.html` y `script.js`
5. **Verifica que todas las pruebas pasan:**
   ```bash
   node --test OVAS/MiniOpt/tests/optimizer.test.mjs OVAS/MiniOpt/tests/integration.test.mjs
   ```
6. **Haz commits descriptivos y sube tu rama:**
   ```bash
   git status
   git add OVAS/MiniOpt/
   git commit -m "feat(miniopt): implementar motor de optimizacion TAC, interfaz web y pruebas"
   git add index.html script.js
   git commit -m "feat(portal): integrar OVA 06 MiniOpt en dashboard, sidebar y router"
   git push -u origin feat/miniopt-reto6
   ```
7. **Abre el Pull Request (SIN fusionar):**
   * En GitHub, abre un **Pull Request** desde tu rama `feat/miniopt-reto6` hacia la rama `main` del repositorio institucional.
   * Incluye en la descripción del PR el resumen de cambios, el resultado de las 16 pruebas y el enlace a tu documentación.
   * **Importante:** no hagas merge hasta que el docente lo revise y autorice.

---

## 3. Guion estructurado para el Video de Sustentación (6 minutos recomendados)

### Minuto 0:00 – 0:50 | Presentación y Diagnóstico del Portal
* Presenta tu nombre / equipo, la asignatura (Teoría de Compiladores) y el tema asignado (**Reto 6: MiniOpt – Optimizador de código intermedio TAC**).
* Abre el portal en el navegador (`http://localhost:8080`) y muestra que las **5 OVAs previas siguen funcionando** y ahora aparece la tarjeta **06 MiniOpt** manteniendo el diseño institucional y el cambio de tema claro/oscuro.

### Minuto 0:50 – 2:10 | Demostración del Caso Principal (Ejemplo del PDF)
* Abre MiniOpt desde el portal (`#/ova/mini-opt`).
* Muestra el **Ejemplo 1 (PDF)**: `t1 = 5 + 3; t2 = t1 * 2; t3 = t2 + 0; x = t3`.
* Haz clic en **Optimizar TAC** y señala:
  * Resultado optimizado: **`x = 16`** (reducción del 75%, de 4 a 1 instrucción).
  * Cuadro de **Equivalencia Semántica Verificada ✓** (`x = 16` antes y después).
  * Abre la pestaña **Explicación Paso a Paso** y explica cómo se encadenaron plegado, propagación, simplificación algebraica y eliminación de código muerto/temporales.
  * Muestra también la pestaña **Evolución por Pasadas**.

### Minuto 2:10 – 3:30 | Demostración de Reglas y Casos Límite (Seguridad Semántica)
* Cambia al **Ejemplo 5 (Efectos secundarios protegidos)**:
  * Explica que `t1 = call leerSensor, 0`, `read entradaUsuario` y `call registrarAuditoria, 0` **NO se eliminan** aunque sus resultados no se usen, porque tienen efectos secundarios. Señala el recuadro de **Protecciones de seguridad**.
* Cambia al **Ejemplo 6 (Ciclo while y bloques básicos)**:
  * Explica que `i = 0` **NO se propaga** dentro de `L1:` porque `L1:` inicia un nuevo bloque básico; en cambio `t2 = i + 1; i = t2` sí se fusiona en `i = i + 1` y el simulador verifica que ambos imprimen `[0, 1, 2, 3, 4]`.
* Cambia al **Ejemplo 7 (División por cero)** y al **Ejemplo 8 (Error de sintaxis)**:
  * Muestra que `10 / 0` se conserva por seguridad y que las entradas inválidas muestran errores claros con número de línea.

### Minuto 3:30 – 4:40 | Explicación Técnica de la Arquitectura y Código
* Abre brevemente `OVAS/MiniOpt/js/optimizer.js` y explica:
  1. `parseTAC`: valida sintaxis TAC y separa en instrucciones.
  2. `splitIntoBasicBlocks`: garantiza seguridad en saltos y ciclos.
  3. El bucle de punto fijo en `optimizeTAC` que ejecuta las 5 pasadas y registra cada transformación en `steps[]`.
  4. `verifyEquivalence`: ejecuta original vs. optimizado para comprobar equivalencia.

### Minuto 4:40 – 5:40 | Pruebas Automatizadas, Documentación y Pull Request
* Ejecuta en terminal:
  ```bash
  node --test OVAS/MiniOpt/tests/optimizer.test.mjs OVAS/MiniOpt/tests/integration.test.mjs
  ```
* Muestra los **16/16 tests aprobados** (13 funcionales + 3 de regresión del portal).
* Muestra brevemente la **Matriz de pruebas**, el **Manual de usuario** y el **Pull Request** abierto en GitHub (sin fusionar).

---

## 4. Preguntas frecuentes en la sustentación en vivo (con respuestas clave)

1. **¿Por qué no propagan constantes a través de etiquetas (`L1:`)?**  
   Porque una etiqueta puede ser destino de un salto o inicio de un ciclo (`while`). Si propagáramos `i = 0` dentro del ciclo, `i < 5` siempre sería verdadero y generaríamos un bucle infinito. Al reiniciar el entorno en cada bloque básico garantizamos seguridad semántica.
2. **¿Por qué no simplifican `0 / a` a `0` ni `a / a` a `1`?**  
   Porque en tiempo de ejecución `a` podría valer `0`. Simplificarlo ocultaría una división por cero y cambiaría el comportamiento del programa.
3. **¿Por qué no se elimina `x = 16` en el ejemplo del PDF si `x` no se vuelve a usar?**  
   Porque `x` es una variable de usuario (no un temporal `t1`, `t2`, `t3`) y el programa no tiene instrucciones `print`/`return` explícitas, por lo que las variables de usuario representan el estado de salida observable del programa.
4. **¿Qué pasa si el profesor pide agregar o modificar una regla en vivo?**  
   * Para agregar una nueva identidad algebraica (ej. `x * 2` o `x || true`), se edita únicamente `runAlgebraicSimplification` en `OVAS/MiniOpt/js/optimizer.js` y se agrega un caso en `OVAS/MiniOpt/tests/optimizer.test.mjs`.
   * Para desactivar o probar una regla individual, puede hacerse en vivo con las casillas de la barra superior **Reglas activas**.
