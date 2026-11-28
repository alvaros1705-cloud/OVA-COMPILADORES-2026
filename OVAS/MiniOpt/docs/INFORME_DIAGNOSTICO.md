# Informe de Diagnóstico Inicial — Reto 6: MiniOpt

**Autor:** Daihan Riveros  
**Asignatura:** Teoría de Compiladores  
**Programa:** Ingeniería de Sistemas — Universidad Simón Bolívar (Sede Cúcuta)  
**Reto asignado:** Reto 6 — Desarrollo de nuevo programa: *MiniOpt – Optimizador de código intermedio (TAC)*  
**Repositorio base:** `https://github.com/alvaros1705-cloud/OVA-COMPILADORES-2026`

---

## 1. Reconocimiento de la arquitectura del Portal OVA existente

Tras inspeccionar el repositorio institucional `OVA-COMPILADORES-2026`, se identificaron los siguientes componentes principales:

1. **Portal principal SPA (`index.html`, `style.css`, `script.js`):**
   * Implementa un enrutador por hash (`#/`, `#/ova/<slug>`) definido en `script.js` mediante los mapas `OVAS_ROUTES` y `OVA_MODAL_MAP`.
   * Carga cada OVA dentro de un `<iframe id="ova-iframe">` usando rutas relativas.
   * Sincroniza el tema claro/oscuro con cada OVA a través de `window.postMessage` (`USB_THEME_CHANGED` y `USB_PORTAL_CONFIG`).
   * Incluye un menú lateral (`#sidebar`), buscador en tiempo real por atributo `data-title`, tarjetas en `#ovas-grid`, modales `<dialog>` con información técnica de cada módulo y un Centro de Aprendizaje (`js/learning-data.js`, `js/learning-hub.js`).
2. **Sistema de diseño compartido (`OVAS/shared/`):**
   * `usb-ova-tokens.css`: paleta institucional USB (`#006837`, `#00a896`), tipografías (`Outfit` y `JetBrains Mono`) y soporte para `html.usb-ova-light`.
   * `usb-ova-components.css`: clases reutilizables (`.ova-header`, `.ova-panel`, `.ova-tabs`, `.ova-btn-primary`, `.ova-status-bar`, `.ova-table`).
   * `usb-ova-theme.js`: gestor que escucha los mensajes del portal y mantiene sincronizado el tema en el `iframe` o en modo standalone.
3. **Estado inicial de las OVAs:**
   * El portal contaba únicamente con **5 OVAs** (Analizador Léxico, Analizador Sintáctico, Analizador Semántico, Mini Compilador TAC y Simulador de Autómatas FASS).
   * **Brecha identificada:** no existía ninguna herramienta para la **Fase 5 de optimización de código intermedio (TAC)**, ni ruta registrada, ni tarjeta en el dashboard, ni modal descriptivo.

---

## 2. Diagnóstico técnico del problema a resolver (MiniOpt)

A diferencia de los retos 1 a 5 (mantenimiento de aplicaciones existentes), el Reto 6 exige **diseñar e implementar desde cero** una aplicación web e integrarla al portal cumpliendo los siguientes hallazgos y restricciones:

| Riesgo / Requisito identificado | Causa técnica | Estrategia de solución diseñada |
| :--- | :--- | :--- |
| Compatibilidad con GitHub Pages | El portal se publica como sitio estático; depender de un backend externo rompería la OVA offline. | Implementar el 100% del parser, optimizador y verificador en **JavaScript cliente estático** sin dependencias externas. |
| Seguridad semántica en ciclos y saltos | Propagar constantes globalmente entre etiquetas (`L1:`) produce resultados erróneos en bucles o condicionales `if/else`. | Dividir el TAC en **bloques básicos** y reiniciar el entorno de constantes y alias en cada etiqueta o salto. |
| Efectos secundarios | Eliminar una asignación cuyo destino no se lee (`t1 = call leer, 0`) o instrucciones `print`/`read`/`call` altera el comportamiento real. | Marcar instrucciones con `sideEffect: true` y prohibir estrictamente su eliminación en DCE, registrando avisos de seguridad. |
| Divisiones por cero | Plegar `10 / 0` o simplificar `0 / x` → `0` o `x / x` → `1` ocultaría errores en tiempo de ejecución. | Detectar divisores `0` o potencialmente `0` y preservar intacta la instrucción, explicando por qué no se optimizó. |
| Entradas mal formadas y variaciones de formato | Los usuarios pueden escribir instrucciones en una sola línea separadas por `;` (como el ejemplo del PDF) o con errores sintácticos. | Implementar un parser TAC tolerante a espacios, comentarios y `;`, con validación estricta y reporte de errores por número de línea. |
| Verificación de equivalencia | No basta con reducir líneas; debe demostrarse que la salida antes y después coincide. | Incorporar un **simulador TAC acotado** que ejecuta el código original y el optimizado y compara resultados observables. |

---

## 3. Conclusión del diagnóstico

El portal cuenta con una base modular bien estructurada (`OVAS/shared/` y `OVAS_ROUTES`) que permite integrar **MiniOpt** en `OVAS/MiniOpt/` mediante rutas relativas, sin modificar ni afectar ninguna de las 5 OVAs preexistentes ni la identidad visual de la Universidad Simón Bolívar.
