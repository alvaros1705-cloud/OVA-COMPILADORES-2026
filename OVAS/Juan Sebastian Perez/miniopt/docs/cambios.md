# Relación de cambios implementados

## 1. Alcance

Se implementó la **OVA 07 — MiniOpt (Juan Sebastian)**, un optimizador estático de código intermedio TAC, y se integró en el portal sin modificar el código interno de las cinco OVAs existentes ni la OVA 06 de Daihan Riveros. La OVA 06 ya estaba ocupada por otra implementación de MiniOpt, por lo que esta entrega se numeró como OVA 07 para conservar ambas.

## 2. Archivos nuevos

| Archivo | Propósito |
|---|---|
| `OVAS/Juan Sebastian Perez/miniopt/index.html` | Interfaz de la herramienta. |
| `OVAS/Juan Sebastian Perez/miniopt/css/miniopt.css` | Estilos propios sobre el sistema de diseño USB. |
| `OVAS/Juan Sebastian Perez/miniopt/js/tac/ir.js` | Modelo de instrucciones y formato. |
| `OVAS/Juan Sebastian Perez/miniopt/js/tac/parser.js` | Parser TAC tolerante con errores por línea. |
| `OVAS/Juan Sebastian Perez/miniopt/js/tac/cfg.js` | CFG, `use/def` y liveness. |
| `OVAS/Juan Sebastian Perez/miniopt/js/passes/folding.js` | Plegado de constantes. |
| `OVAS/Juan Sebastian Perez/miniopt/js/passes/algebraic.js` | Simplificación algebraica. |
| `OVAS/Juan Sebastian Perez/miniopt/js/passes/constant-propagation.js` | Propagación global de constantes. |
| `OVAS/Juan Sebastian Perez/miniopt/js/passes/copy-propagation.js` | Propagación local de copias. |
| `OVAS/Juan Sebastian Perez/miniopt/js/passes/temp-coalescing.js` | Coalescencia de temporales. |
| `OVAS/Juan Sebastian Perez/miniopt/js/passes/dce.js` | Eliminación de código muerto. |
| `OVAS/Juan Sebastian Perez/miniopt/js/optimizer.js` | Pipeline, punto fijo, métricas y paso a paso. |
| `OVAS/Juan Sebastian Perez/miniopt/js/interpreter.js` | Intérprete y verificación de equivalencia. |
| `OVAS/Juan Sebastian Perez/miniopt/js/samples.js` | Ejemplos didácticos. |
| `OVAS/Juan Sebastian Perez/miniopt/js/ui.js` | Lógica de la interfaz. |
| `OVAS/Juan Sebastian Perez/miniopt/package.json` | Script `npm test` sin dependencias. |
| `OVAS/Juan Sebastian Perez/miniopt/tests/*.test.js` | 38 pruebas automatizadas. |
| `OVAS/Juan Sebastian Perez/miniopt/README.md` | Presentación y guía rápida. |
| `OVAS/Juan Sebastian Perez/miniopt/docs/*` | Diagnóstico, arquitectura, reglas, manual y matriz. |

## 3. Archivos modificados

| Archivo | Cambio | Justificación |
|---|---|---|
| `script.js` | Ruta `optimizador-tac` y modal `details-ova-7-modal`. | El router SPA necesita conocer la nueva OVA. |
| `portal.html` | Ítem de navegación 07, tarjeta 07, modal 07, contadores 6 → 7, comentario de sección y `allow-downloads` en el iframe. | Integración visual, consistencia del dashboard y descarga del TAC dentro del visor. |
| `js/learning-data.js` | Entrada de guía para la OVA 7. | El Centro de Aprendizaje debe explicar la optimización. |
| `OVAS/README.md` | Listado de las siete OVAs. | Documentación institucional actualizada. |

No se modificó el código de las OVAs 1–5, ni la OVA 06 de Daihan, ni la identidad visual, ni los créditos existentes.

## 4. Decisiones técnicas

1. **Cliente estático:** GitHub Pages no ejecuta backend; un cliente estático evita CORS, URLs y dependencias externas.
2. **Módulos ES sin dependencias de runtime:** separación motor/UI y pruebas con `node --test`.
3. **TAC infijo:** compatible con la salida de la OVA 4, ampliado con etiquetas, saltos, funciones y arreglos para probar efectos secundarios.
4. **Dataflow conservador:** la propagación de constantes exige coincidencia en todas las rutas; las llamadas son barreras.
5. **Variables de usuario protegidas por defecto:** el ejemplo del enunciado conserva `x = 16`; el modo agresivo queda disponible y auditado por la equivalencia.
6. **Verificación de equivalencia:** intérprete acotado que compara salidas observables en lugar de afirmar corrección sin evidencia.

## 5. Limitaciones

- Modelo TAC didáctico sin punteros, alias ni objetos.
- Propagación de copias local al bloque.
- Llamadas no simuladas; equivalencia manual.
- Aritmética IEEE-754 de JavaScript.
- Modo agresivo capaz de eliminar variables de usuario no leídas (desactivado por defecto).

## 6. Flujo de integración

```text
main
 └── reto6-miniopt-juan-sebastian
       ├── feat(miniopt): motor TAC, pases y pruebas
       ├── feat(miniopt): interfaz, diff y equivalencia
       ├── feat(portal): ruta, tarjeta, modal y guía de la OVA 7
       └── docs(miniopt): diagnóstico, arquitectura, manual y matriz
```

El Pull Request debe dirigirse a `main` y no fusionarse hasta la revisión del docente.

## 7. Verificación antes del PR

```bash
cd "OVAS/Juan Sebastian Perez/miniopt"
npm test                 # 38/38
python3 -m http.server 8000
# abrir el portal y la OVA 7
```

Comprobaciones mínimas:

- [x] La OVA 7 abre desde el portal y desde su URL directa.
- [x] La OVA 06 de Daihan sigue abriendo desde el portal.
- [x] El ejemplo del enunciado produce `x = 16`.
- [x] `call`, `param`, `print`, `return` y `a[i] = x` se conservan.
- [x] La división por cero no se pliega.
- [x] Las 5 OVAs anteriores siguen enlazadas.
- [x] El tema claro/oscuro se mantiene.
