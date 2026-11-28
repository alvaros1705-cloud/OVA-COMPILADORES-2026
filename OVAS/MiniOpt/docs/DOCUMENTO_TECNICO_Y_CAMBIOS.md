# Documento Técnico y Relación de Cambios — MiniOpt

**Autor:** Daihan Riveros  
**Proyecto:** MiniOpt – Optimizador de Código Intermedio (TAC)  
**Ubicación en el repositorio:** `OVAS/MiniOpt/`  
**Tecnología:** HTML5, CSS3 (Design System USB), JavaScript ES6+ (cliente estático) y Node.js Test Runner para pruebas reproducibles.

---

## 1. Arquitectura de la solución

MiniOpt sigue una arquitectura modular desacoplada en tres capas:

```text
OVAS/MiniOpt/
├── index.html                  # Vista principal (integrada con OVAS/shared)
├── css/
│   └── miniopt.css             # Estilos específicos de editor, comparativa y badges
├── js/
│   ├── optimizer.js            # Motor puro (Parser TAC + Optimizador + Evaluador de equivalencia)
│   └── app.js                  # Controlador de interfaz, ejemplos, pestañas y sincronización de tema
├── tests/
│   ├── optimizer.test.mjs      # 13 pruebas unitarias reproducibles (casos válidos, inválidos y límite)
│   └── integration.test.mjs    # 3 pruebas de integración y regresión del portal OVA
├── docs/
│   ├── INFORME_DIAGNOSTICO.md
│   ├── DOCUMENTO_TECNICO_Y_CAMBIOS.md
│   ├── MATRIZ_DE_PRUEBAS.md
│   ├── MANUAL_USUARIO.md
│   └── GUIA_VIDEO_SUSTENTACION_Y_PR.md
└── README.md
```

### Flujo interno de `js/optimizer.js`

1. **Análisis sintáctico (`parseTAC`):**
   * Elimina comentarios (`//`, `#`) y admite instrucciones por línea o separadas por `;`.
   * Reconoce asignaciones binarias (`dest = a op b`), unarias (`dest = op a`), copias (`dest = a`), etiquetas (`L1:`), saltos (`goto`, `if ... goto`, `ifFalse ... goto`) e instrucciones con efectos secundarios (`print`, `write`, `output`, `read`, `input`, `param`, `call`, `return`).
   * Valida identificadores, operadores permitidos, límite de tres direcciones y existencia de etiquetas destino; reporta errores con número de línea.
2. **Motor iterativo de optimización hasta punto fijo (`optimizeTAC`):**
   * Ejecuta pasadas sucesivas (hasta convergencia, máx. 25 iteraciones) aplicando las 5 reglas obligatorias (cada una activable/desactivable):
     1. **Plegado de constantes (`runConstantFolding`)**
     2. **Simplificación algebraica (`runAlgebraicSimplification`)**
     3. **Propagación de constantes por bloque básico (`runConstantPropagation`)**
     4. **Eliminación de temporales redundantes (`runRedundantTempElimination`)**
     5. **Eliminación de código muerto seguro (`runDeadCodeElimination`)**
   * Cada transformación se registra en `steps[]` con: número de paso, pasada, regla, línea, antes, después y explicación de validez semántica.
   * Las decisiones conservadoras de seguridad se registran en `safetyNotices[]`.
3. **Verificador de equivalencia (`evaluateTAC` y `verifyEquivalence`):**
   * Simula el programa original y el optimizado con un límite de 1.000 pasos (protección contra ciclos infinitos), asignando valores deterministas a variables de entrada libres.
   * Compara salidas `print`, valor `return`, errores en ejecución y estado final de variables de usuario.
   * Si existen instrucciones externas (`call`, `read`, `param`), reporta garantía estática de conservación.

---

## 2. Relación de archivos creados y modificados (con justificación técnica)

### Archivos nuevos creados
| Archivo | Propósito y justificación técnica |
| :--- | :--- |
| `OVAS/MiniOpt/js/optimizer.js` | Encapsula toda la lógica de compilación/optimización sin acoplarse al DOM, permitiendo ejecutar pruebas automatizadas en Node.js y reutilizarlo en el navegador. |
| `OVAS/MiniOpt/index.html` | Interfaz web interactiva con editor TAC, controles de reglas, comparativa lado a lado, explicación paso a paso, evolución por pasadas y guía pedagógica. |
| `OVAS/MiniOpt/css/miniopt.css` | Extiende `../shared/usb-ova-tokens.css` y `../shared/usb-ova-components.css` manteniendo coherencia total en tema oscuro y claro. |
| `OVAS/MiniOpt/js/app.js` | Conecta la UI con `MiniOptEngine`, sincroniza el tema con `USB_OVA_THEME`, gestiona 8 ejemplos precargados y renderiza métricas y evidencias. |
| `OVAS/MiniOpt/tests/optimizer.test.mjs` | Garantiza reproducibilidad de los 13 escenarios funcionales, de seguridad y de casos límite. |
| `OVAS/MiniOpt/tests/integration.test.mjs` | Valida que las rutas relativas de las 6 OVAs y todos los recursos del portal existan sin regresiones. |
| `OVAS/MiniOpt/docs/*` y `README.md` | Documentación obligatoria solicitada en la evaluación. |

### Archivos del portal modificados (cambios mínimos y controlados)
| Archivo | Cambio realizado | Justificación técnica |
| :--- | :--- | :--- |
| `index.html` | Se agregó el enlace `06` en `#sidebar`, la tarjeta `#card-ova-6`, el modal `#details-ova-6-modal` y se actualizaron los indicadores de `5` a `6`. | Integrar MiniOpt al dashboard institucional respetando las 5 OVAs previas, sus créditos y el diseño original. |
| `script.js` | Se registró la clave `'mini-opt'` en `OVAS_ROUTES` (`OVAS/MiniOpt/index.html`) y en `OVA_MODAL_MAP` (`details-ova-6-modal`). | Habilitar la navegación SPA (`#/ova/mini-opt`), el visor `iframe`, el botón externo y el modal de información técnica. |

---

## 3. Decisiones de diseño y limitaciones conocidas

### Decisiones de diseño clave
* **Seguridad sobre agresividad:** se priorizó la corrección semántica sobre la cantidad de líneas eliminadas. Toda optimización que no pueda garantizarse segura dentro del bloque básico se omite y se documenta en los avisos de seguridad.
* **Cero dependencias externas:** el proyecto funciona tanto en local como publicado en GitHub Pages sin pasos de compilación ni servidores backend.
* **Temporales vs. variables de usuario:** se identifican como temporales `t\d+`, `_t\d+` y `tmp\d+`. Las variables de usuario se conservan como salidas observables cuando no hay sentencias explícitas `print`/`return` (por ejemplo, en el caso oficial del PDF que concluye en `x = 16`).

### Limitaciones conocidas (documentadas explícitamente)
1. **Análisis intra-bloque (local):** la propagación de constantes y de copias opera dentro de cada bloque básico y se reinicia al llegar a etiquetas (`L1:`). No realiza análisis global de flujo de datos (*reaching definitions* / SSA) entre bloques, justamente para garantizar que nunca ocurran optimizaciones inseguras en ciclos o bifurcaciones.
2. **Evaluador de equivalencia en programas con I/O o llamadas externas:** cuando el TAC incluye `call`, `read` o `param`, no se ejecuta simulación dinámica (pues se desconoce la semántica externa de la función); en su lugar se aplica verificación estática garantizando que dichas instrucciones jamás se eliminen ni reordenen.
3. **Subexpresiones comunes (CSE) e invariantes de ciclo:** quedan fuera del alcance mínimo obligatorio de esta versión y se proponen como evolución futura.
