# Matriz de Pruebas — MiniOpt (Reto 6)

**Autor:** Daihan Riveros  
**Comando para reproducir todas las pruebas automatizadas:**
```bash
node --test OVAS/MiniOpt/tests/optimizer.test.mjs OVAS/MiniOpt/tests/integration.test.mjs
```

---

## Matriz obligatoria de casos de prueba

| ID | Entrada / escenario | Resultado esperado | Resultado obtenido | Estado | Observaciones |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **P-01** | **Caso válido principal (ejemplo oficial PDF):** `t1 = 5 + 3; t2 = t1 * 2; t3 = t2 + 0; x = t3` | TAC optimizado: `x = 16`; aplica plegado, propagación, simplificación algebraica y eliminación de temporales/código muerto; equivalencia verificada (`x = 16`). | `x = 16` con explicación paso a paso y equivalencia verificada (`x = 16` antes y después). | **Aprobado** | Verificado automáticamente en `optimizer.test.mjs` y en la interfaz web. |
| **P-02** | **Caso inválido / error sintáctico:** entrada vacía, `x = 5 +`, `goto L99`, `x = 1 + 2 + 3` | Rechaza la entrada sin bloquear la interfaz; reporta errores claros con número de línea y motivo. | Errores precisos por línea (`Línea 2`, etiqueta `L99` no definida, exceso de direcciones TAC). | **Aprobado** | No genera salida falsa ni rompe métricas. |
| **P-03** | **Caso límite (división por cero):** `t1 = 10 / 0; x = t1` | No debe plegar `10 / 0` a `Infinity` ni eliminar la división; debe conservar la operación y advertir por seguridad. | `x = 10 / 0` + aviso de seguridad explicando protección de división por cero. | **Aprobado** | Preserva el comportamiento de error en tiempo de ejecución. |
| **P-04** | **Variación de espacios, comentarios y formato:** `// comentario`, `# comentario`, `t1=5+3 ; t2 = t1*2; t3 = t2 + 0; x=t3` | Ignora espacios extra y comentarios; produce el mismo resultado que P-01 (`x = 16`). | `x = 16` con equivalencia verificada. | **Aprobado** | Compatible con sintaxis multilínea y separada por `;`. |
| **P-05** | **Simplificación algebraica y protección de división:** `a+0`, `0+b`, `c-0`, `d*1`, `1*e`, `f/1`, `g*0`, `h-h`, `0/a`, `a/a` | Simplifica las 8 identidades seguras y **conserva intactas** `0 / a` y `a / a` porque `a` podría valer `0`. | Las 8 identidades simplificadas correctamente; `r9 = 0 / a` y `r10 = a / a` conservadas con aviso de seguridad. | **Aprobado** | Equivalencia verificada con entradas libres simuladas. |
| **P-06** | **Propagación de constantes con reasignación:** `a = 5; b = a + 2; a = y; c = a + 1` | Propaga `a = 5` en `b` (`b = 7`), invalida `a` tras `a = y` y conserva `c = a + 1`. | `b = 7`, `a = y`, `c = a + 1`; equivalencia verificada. | **Aprobado** | Confirma invalidación segura del entorno de constantes. |
| **P-07** | **Temporales redundantes y auto-asignación:** `t1 = a + b; res = t1; t2 = res; t3 = t2; final = t3; final = final` | Fusiona `t1` en `res = a + b`, elimina cadena `t2`/`t3` y retira `final = final`. | `res = a + b` y `final = res`; equivalencia verificada. | **Aprobado** | Reducción de 6 a 2 instrucciones sin cambiar semántica. |
| **P-08** | **Eliminación de código muerto e inalcanzable:** temporal sin uso `t1 = a + b`, sobrescritura `x = 10; x = 20`, variable `z = 999` con `print x`, código tras `goto L_END` | Elimina código muerto e inalcanzable y mantiene `print 20`, `goto L_END`, `L_END:`. | `print 20`, `goto L_END`, `L_END:`; salida `['20']` idéntica antes y después. | **Aprobado** | Demuestra DCE seguro con verificación de salida. |
| **P-09** | **Instrucciones que NO deben eliminarse (efectos secundarios):** `t1 = call leerSensor, 0; read dato; call registrarLog, 0; t2 = 4 + 6; print t2` | Conserva `call`, `read` y `print` aunque `t1` y `dato` no se lean; optimiza `t2` a `print 10`. | `t1 = call leerSensor, 0`, `read dato`, `call registrarLog, 0`, `print 10` + 2 avisos de seguridad. | **Aprobado** | Cumple estrictamente la restricción esencial del Reto 6. |
| **P-10** | **Flujo de control y ciclo `while`:** `i = 0; L1: t1 = i < 5; ifFalse t1 goto L2; print i; t2 = i + 1; i = t2; goto L1; L2:` | No propaga `i = 0` dentro del ciclo `L1:`; fusiona `t2 = i + 1; i = t2` en `i = i + 1`; salidas iguales `['0','1','2','3','4']`. | Mantiene `i = 0`, `L1:`, optimiza a `i = i + 1`; salidas `['0','1','2','3','4']` verificadas. | **Aprobado** | Comprueba seguridad en fronteras de bloques básicos. |
| **P-11** | **Control selectivo de reglas:** activar únicamente plegado de constantes en `t1 = 5 + 3; t2 = t1 * 2; x = t2` | Solo aplica plegado (`t1 = 8`), sin propagar ni eliminar temporales. | `t1 = 8`, `t2 = t1 * 2`, `x = t2` (1 plegado, 0 propagaciones). | **Aprobado** | Útil para explicación didáctica regla por regla. |
| **P-12** | **Negativos, decimales y booleanos:** `t1 = -5 + 12; t2 = t1 * 1.5; t3 = !false; y = t2; ok = t3` | Evalúa correctamente negativos, flotantes y operador unario `!`. | `y = 10.5`, `ok = true`; equivalencia verificada. | **Aprobado** | Sin artefactos de coma flotante. |
| **P-13** | **Bifurcación condicional `if/else`:** `t1 = 2 + 3; if a < t1 goto L_TRUE; res = 20; goto L_END; L_TRUE: res = 30; L_END: print res` | Pliega `t1 = 5` en la condición `if a < 5 goto L_TRUE` y conserva ambas ramas y `print res`. | `if a < 5 goto L_TRUE` y ramas intactas; equivalencia verificada. | **Aprobado** | Protege valores provenientes de múltiples caminos. |
| **REG-01** | **Prueba de regresión del portal (rutas):** verificación de `OVAS_ROUTES` en `script.js` | Las 5 OVAs existentes y la nueva OVA `mini-opt` apuntan a archivos existentes. | 6/6 rutas válidas y existentes en disco. | **Aprobado** | Ninguna OVA previa fue eliminada ni rota. |
| **REG-02** | **Prueba de regresión de `index.html`:** validación de enlaces, tarjeta `#card-ova-6` y modal `#details-ova-6-modal` | Todos los recursos locales existen y el enlace `#/ova/mini-opt` está activo. | Todos los recursos locales verificados sin enlaces rotos. | **Aprobado** | Identidad visual y créditos previos intactos. |
| **REG-03** | **Prueba de integración de recursos relativos en `OVAS/MiniOpt/index.html`** | Carga correcta de `../shared/usb-ova-tokens.css`, `usb-ova-components.css`, `usb-ova-theme.js`, CSS y JS locales. | Todos los archivos relativos resuelven correctamente. | **Aprobado** | Listo para publicación en GitHub Pages. |

---

## Evidencias de ejecución

* **Ejecución automatizada (`node --test`):** 16/16 pruebas aprobadas (`0 fallidas`, duración ~138 ms).
* **Capturas recomendadas para anexar en la entrega:**
  1. Dashboard del Portal OVA mostrando las 6 tarjetas incluyendo **06 MiniOpt (Optimizador TAC)**.
  2. MiniOpt ejecutando **Ejemplo 1 (PDF)** con resultado `x = 16` y badge `Equivalencia: Verificada ✓`.
  3. Pestaña **Explicación Paso a Paso** mostrando las transformaciones y **Ejemplo 5 (Efectos secundarios protegidos)** con el recuadro de protecciones de seguridad.
  4. **Ejemplo 8 (Error de sintaxis)** mostrando la detección de errores con número de línea.
