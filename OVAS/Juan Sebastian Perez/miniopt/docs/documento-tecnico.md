# Documento técnico — MiniOpt (Reto 6)

## 1. Arquitectura

MiniOpt es una aplicación web estática compuesta por:

- **Interfaz** (`index.html`, `css/miniopt.css`, `js/ui.js`): editor TAC, selector de ejemplos, interruptores de optimización, métricas, diff, traza de reglas, equivalencia y diagnóstico.
- **Motor TAC** (`js/tac/`): representación de instrucciones, parser tolerante con errores por línea y construcción del CFG con liveness.
- **Pases** (`js/passes/`): plegado de constantes, simplificación algebraica, propagación de constantes, propagación de copias, coalescencia de temporales y eliminación de código muerto.
- **Orquestador** (`js/optimizer.js`): ejecuta el pipeline hasta punto fijo, registra la traza y calcula métricas.
- **Verificador** (`js/interpreter.js`): intérprete TAC acotado que compara `print`, `return`, variables observables y arreglos.

El motor no depende del DOM: se prueba con `node --test`. La interfaz solo consume sus resultados.

```text
index.html + ui.js
        │
        ▼
optimizer.js ──► passes/ (CF, AS, CP, TC, CPY, DCE)
        │                 │
        ▼                 ▼
   tac/ (IR, parser, CFG)  interpreter.js (equivalencia)
```

Detalle completo en [`arquitectura.md`](arquitectura.md).

## 2. Archivos modificados

### Nuevos

- `OVAS/Juan Sebastian Perez/miniopt/` — código, pruebas y documentación de la OVA 7.
- `js/tac/`, `js/passes/`, `js/optimizer.js`, `js/interpreter.js`, `js/samples.js`, `js/ui.js`.
- `tests/*.test.js` — 38 pruebas automatizadas.

### Modificados en el portal

| Archivo | Cambio |
|---|---|
| `script.js` | Ruta `optimizador-tac` y modal `details-ova-7-modal`. |
| `portal.html` | Nav 07, tarjeta 07, modal 07, contadores 6 → 7 y `allow-downloads` en el iframe. |
| `js/learning-data.js` | Entrada de guía para la OVA 7. |
| `OVAS/README.md` | Listado de las siete OVAs. |

No se modificó el código interno de las OVAs 1–5 ni la OVA 06 de Daihan Riveros. La OVA 06 ya estaba ocupada por otra implementación de MiniOpt; esta entrega se integró como OVA 07 para conservar ambas.

Detalle completo en [`cambios.md`](cambios.md).

## 3. Decisiones

1. **Cliente 100 % estático:** GitHub Pages no ejecuta backend; se evitan CORS, URLs externas y dependencias de despliegue.
2. **Módulos ES sin dependencias de runtime:** el motor se puede probar con Node y la UI funciona directamente en el navegador.
3. **TAC infijo compatible con la OVA 4**, ampliado con etiquetas, saltos, funciones y arreglos para probar efectos secundarios.
4. **Dataflow conservador:** la propagación de constantes exige coincidencia en todas las rutas; las llamadas son barreras.
5. **Variables de usuario protegidas por defecto:** el ejemplo del enunciado conserva `x = 16`; el modo agresivo queda disponible y auditado por la equivalencia.
6. **Equivalencia demostrada, no afirmada:** el intérprete compara salidas observables y marca como manual lo que no puede garantizar.

## 4. Limitaciones

- Modelo TAC didáctico sin punteros, alias ni objetos.
- Propagación de copias local al bloque básico.
- Llamadas no simuladas: la equivalencia se marca como manual.
- Aritmética IEEE-754 de JavaScript; no se redondea el resultado.
- El modo agresivo de DCE puede eliminar variables de usuario no leídas; está desactivado por defecto y la diferencia se reporta.
- Entrada máxima: 2.000 líneas o 100.000 caracteres; intérprete limitado a 10.000 pasos.

## 5. Verificación

```bash
cd "OVAS/Juan Sebastian Perez/miniopt"
npm test
```

Resultado: **38 pruebas aprobadas, 0 fallidas**.

También se verificó la UI con `jsdom` (ejemplo inicial, efectos secundarios, modo agresivo, paso a paso, pestañas, error y límite de tamaño) y el portal (7 tarjetas, 7 OVAs + Inicio, modal 7 y carga del iframe).

Evidencia detallada en [`matriz-pruebas.md`](matriz-pruebas.md).
