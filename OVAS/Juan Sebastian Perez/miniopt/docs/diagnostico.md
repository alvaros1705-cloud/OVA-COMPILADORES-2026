# Informe de diagnóstico — Reto 6

## 1. Objetivo

Documentar el estado del Portal Integrado de OVAS antes de incorporar **MiniOpt**, identificar los puntos de integración, las limitaciones del entorno y las decisiones técnicas que condicionan el desarrollo del optimizador de código intermedio.

## 2. Metodología

1. Clonación del repositorio institucional `OVA-COMPILADORES-2026` y creación de la rama `reto6-miniopt-juan-sebastian`.
2. Lectura de `index.html`, `script.js`, `js/learning-data.js`, `js/learning-hub.js` y `OVAS/shared/*`.
3. Inventario de las cinco OVAs existentes y de sus tecnologías.
4. Ejecución local del portal con `python3 -m http.server` y revisión de rutas/iframe.
5. Revisión del generador TAC de la OVA 4 para definir el formato de entrada de MiniOpt.
6. Reproducción del estado inicial: el portal ofrece cinco tarjetas y no existe ninguna herramienta de optimización.

## 3. Estado inicial del portal

| Elemento | Hallazgo |
|---|---|
| Arquitectura | Sitio estático publicado en GitHub Pages; sin build ni backend propio. |
| Rutas | Centralizadas en `OVAS_ROUTES` dentro de `script.js`; el visor carga cada OVA en un `<iframe>`. |
| Tarjetas y navegación | Declaradas manualmente en `index.html` (`nav-ova-1…5`, `card-ova-1…5`). |
| Modales | `details-ova-1-modal` … `details-ova-5-modal`, mapeados en `OVA_MODAL_MAP`. |
| Diseño | Sistema compartido en `OVAS/shared/usb-ova-tokens.css`, `usb-ova-components.css` y `usb-ova-theme.js`. |
| Guía académica | `js/learning-data.js` con una entrada por OVA; `learning-hub.js` las renderiza como pestañas. |
| Contadores | El dashboard muestra “5” en OVAS integradas, equipos y temáticas; el comentario de la sección dice “las 5 OVAS”. |
| OVA 4 (TAC) | Genera TAC en formato infijo: `t1 = a + b`, `x = t3`, con temporales `tN`. |
| Pruebas | No existe infraestructura de pruebas JavaScript en el repositorio. |

## 4. Brecha principal

El Reto 6 no consiste en corregir una OVA existente, sino en **crear una herramienta nueva**. Antes de la intervención:

- No existe la ruta `#/ova/optimizador-tac`.
- No existe tarjeta, ítem de navegación ni modal para optimización.
- No existe ningún módulo que reciba TAC y lo transforme.
- La guía académica termina en la OVA 5.

Por tanto, el producto mínimo debe cubrir dos frentes: **(a)** un motor de optimización correcto y explicable, y **(b)** una integración completa en el portal sin alterar las OVAs previas.

## 5. Hallazgos técnicos y riesgos

| ID | Hallazgo | Riesgo | Decisión |
|---|---|---|---|
| D-01 | GitHub Pages no ejecuta Python ni Node. | Un backend rompería la publicación y añadiría CORS/URLs. | Cliente 100 % estático con módulos ES. |
| D-02 | La OVA 4 produce TAC infijo, no cuádruplas JSON. | Si MiniOpt solo aceptara cuádruplas, no sería interoperable. | Aceptar TAC infijo y, además, `call`, arreglos, etiquetas y saltos. |
| D-03 | No hay framework de pruebas. | Sin evidencia reproducible no se puede demostrar corrección. | Añadir pruebas con `node --test`, sin dependencias. |
| D-04 | Los contadores y la guía están codificados para cinco OVAs. | La integración quedaría incompleta o inconsistente. | Actualizar contadores, tarjeta, nav, modal y guía a seis. |
| D-05 | El iframe usa rutas relativas con espacios. | Una ruta mal codificada funciona en local y falla en Pages. | Probar la ruta publicada y mantener la convención existente. |
| D-06 | Optimizar mal puede cambiar el resultado del programa. | Un error es más grave que no optimizar. | Dataflow conservador, barreras de efectos secundarios y verificación de equivalencia. |
| D-07 | El TAC didáctico no tiene especificación formal en el repositorio. | Ambigüedad en la sintaxis de entrada. | Documentar la gramática y validar con mensajes por línea. |
| D-08 | La OVA 4 depende de un backend externo. | MiniOpt no debe depender de que esa API esté disponible. | MiniOpt funciona con texto pegado o escrito, sin llamadas de red. |

## 6. Reproducción del estado inicial

1. Servir el repositorio:

   ```bash
   python3 -m http.server 8000
   ```

2. Abrir `http://localhost:8000/`.
3. Verificar que el dashboard muestra **5 OVAS integradas** y cinco tarjetas.
4. Navegar a `#/ova/optimizador-tac`: el router no encuentra la ruta.
5. En la OVA 4, generar TAC para `x = 5 + 3 * 2;` y observar el formato `tN = ...`.
6. Confirmar que no existe ningún control para plegar constantes, propagar valores o eliminar código muerto.

## 7. Requisitos derivados

### Funcionales

- RF-01: recibir TAC y validarlo con línea/columna.
- RF-02: plegar constantes de forma segura.
- RF-03: propagar constantes y copias.
- RF-04: simplificar identidades algebraicas.
- RF-05: eliminar código muerto sin tocar efectos secundarios.
- RF-06: eliminar temporales redundantes.
- RF-07: comparar original y optimizado con un resumen de reglas.
- RF-08: verificar equivalencia de salidas observables.

### No funcionales

- RNF-01: ejecutarse desde GitHub Pages y dentro del iframe.
- RNF-02: mantener la identidad visual USB y el tema claro/oscuro.
- RNF-03: no introducir secretos, dependencias de runtime ni llamadas de red.
- RNF-04: ser reproducible con pruebas automatizadas y una matriz diligenciada.
- RNF-05: conservar intactas las cinco OVAs existentes.

## 8. Conclusión

El portal está preparado para recibir una sexta OVA estática. La ausencia de backend es una restricción, pero también una ventaja para la reproducibilidad: MiniOpt puede implementarse por completo en el navegador y verificarse con pruebas nativas de Node.js. La integración debe ser quirúrgica en `index.html`, `script.js` y `js/learning-data.js` para no afectar las OVAs previas.
