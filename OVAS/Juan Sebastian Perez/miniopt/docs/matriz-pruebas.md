# Matriz de pruebas — MiniOpt (Reto 6)

## 1. Entorno de ejecución

| Elemento | Valor |
|---|---|
| Motor | Node.js v22.22.2 |
| Navegador de verificación de UI | DOM de `jsdom` 24 (script de humo fuera del repositorio) |
| Servidor local | `python3 -m http.server 8877` |
| Comando de pruebas | `npm test` (desde `OVAS/Juan Sebastian Perez/miniopt`) |
| Resultado | **38 pruebas aprobadas, 0 fallidas** |

## 2. Matriz funcional

| ID | Entrada / escenario | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|
| P-01 | `t1 = 5 + 3; t2 = t1 * 2; t3 = t2 + 0; x = t3` | `x = 16`; CF, CP y DCE aplicadas | `x = 16`; reducción 75 %; equivalencia `equivalent` | Aprobado | Caso del enunciado. |
| P-02 | `t1 = 2 * 3; print t1` | `print 6`; temporal eliminado | `print 6`; equivalencia `equivalent` | Aprobado | Plegado + propagación + DCE. |
| P-03 | `x = y + 0; print x` | Simplificar a `x = y`; `print y` | `x = y; print y`; `equivalent` | Aprobado | La variable de usuario `x` se conserva. |
| P-04 | `a = 4; b = a + 6; print b` | `b = 10`; `print 10` | `a = 4; b = 10; print 10`; `equivalent` | Aprobado | Propagación en cadena. |
| P-05 | `t1 = 2 + 3; t2 = t1 * 4; print 7` | Eliminar `t1` y `t2` | `print 7`; `equivalent` | Aprobado | Código muerto temporal. |
| P-06 | `x = 5; print 1` | Conservar `x` por ser variable de usuario | `x = 5; print 1`; `equivalent` | Aprobado | Modo conservador por defecto. |
| P-07 | `x = 5; print 1` con **modo agresivo** | Eliminar `x` y advertir diferencia | `print 1`; `different`; diferencia `x: 5 → 0` | Aprobado (esperado) | Demuestra por qué el modo agresivo no es el predeterminado. |
| P-08 | `x = 10 / 0; print x` | No plegar; conservar y advertir | Sin cambios; advertencia “división por cero”; equivalencia `error` | Aprobado | Restricción de seguridad. |
| P-09 | `x = 5; a[0] = x; param x; call f, 1; print 1` | Conservar llamada, parámetro y store | `a[0] = 5; param 5; call f, 1`; `manual` | Aprobado | Efectos secundarios intactos. |
| P-10 | Ciclo `i = 0; t1 = 0; L1: if i < 5 goto L2; ...` | No alterar flujo ni propagar en la unión | Programa idéntico; `equivalent` | Aprobado | La propagación se detiene en el join. |
| P-11 | `if c < 1 goto L1; a = 1; goto L2; L1: a = 2; L2: print a` | No propagar `a` en `L2` | `print a` se conserva; `equivalent` | Aprobado | Unión con valores distintos. |
| P-12 | `x = 5 +` (línea inválida) + programa válido | Error en línea 1; el resto se optimiza | Error línea 1; `y = 6`; `manual` | Aprobado | Parser tolerante. |
| P-13 | Entrada vacía | Aviso en la UI; sin excepción | Aviso “Escriba código TAC…”; motor devuelve programa vacío | Aprobado | Caso límite. |
| P-14 | 2.001 líneas | Rechazar por límite | Aviso “límite de 2.000 líneas”; no se optimiza | Aprobado | Protección de rendimiento. |
| P-15 | `a = b; c = a; print c` | Propagar copias dentro del bloque | `a = b; c = b; print b`; `equivalent` | Aprobado | Propagación de copias. |
| P-16 | `t1 = a + b; x = t1; print x` | Reutilizar `x` y eliminar la copia | `x = a + b; print x`; `equivalent` | Aprobado | Coalescencia de temporales. |
| P-17 | `// comentario` + línea vacía + `x = 1; print x` | Conservar comentarios y líneas vacías | `// comentario` y línea vacía presentes; `equivalent` | Aprobado | El formato no se pierde. |
| P-18 | Portal con 6 tarjetas y ruta `#/ova/optimizador-tac` | Cargar MiniOpt en el iframe | 6 tarjetas, 6 ítems OVA + Inicio, modal 6, iframe con la ruta correcta | Aprobado | Verificado con `jsdom` sobre el portal servido. |
| P-19 | Regresión de las 5 OVAs previas | Rutas y tarjetas intactas | Las 5 rutas originales siguen en `OVAS_ROUTES`; contadores a 6 | Aprobado | No se modificó código de las OVAs previas. |
| P-20 | Tema claro/oscuro y layout móvil | Cambio de tema y una columna en pantallas pequeñas | Variables `usb-ova-light`, grid responsive y `prefers-reduced-motion` | Aprobado | Revisión visual/CSS; el portal inyecta el tema por `postMessage`. |

## 3. Pruebas automatizadas

| Archivo | Pruebas | Cobertura |
|---|---:|---|
| `tests/parser.test.js` | 7 | Asignaciones, control, funciones, arreglos, comentarios, errores y etiquetas. |
| `tests/passes.test.js` | 12 | CF, AS, CP, CPY, TC, DCE, efectos secundarios y modo agresivo. |
| `tests/pipeline.test.js` | 11 | Ejemplo del enunciado, muestras, ciclos, errores, opciones y paso a paso. |
| `tests/equivalence.test.js` | 8 | Intérprete, ciclos, arreglos, `ifFalse`, división por cero y comparación. |
| **Total** | **38** | **Todas aprueban** |

Salida resumida:

```text
# tests 38
# suites 0
# pass 38
# fail 0
```

## 4. Evidencias de la verificación de UI

Se ejecutó un script de humo con `jsdom` que:

1. Cargó `index.html` y los módulos ES.
2. Verificó que el ejemplo inicial produce `x = 16`.
3. Cambió al ejemplo de efectos secundarios y comprobó que `call` y `a[0]` se conservan.
4. Activó el modo agresivo y comprobó la diferencia de equivalencia.
5. Recorrió el modo paso a paso hasta `x = 16` (13 clics).
6. Cambió las cuatro pestañas y verificó `aria-selected`.
7. Insertó una entrada inválida y comprobó el error por línea.
8. Insertó 2.001 líneas y comprobó el límite.

Resultado: `UI smoke test OK`.

Para el portal se verificó:

```text
cards 6
navItems 7          (Inicio + 6 OVAs)
modal6 true
counters [ '6', '6', '6' ]
iframe src OVAS/Juan Sebastian Perez/miniopt/index.html
viewer title MiniOpt — Optimizador de Código Intermedio (TAC)
portal smoke OK
```

## 5. Pruebas manuales recomendadas para la sustentación

1. Caso exitoso: ejemplo del enunciado → `x = 16` y equivalencia.
2. Caso de error: `x = 10 / 0` → advertencia y conservación.
3. Caso límite: `x = 5 +` → error con línea 1.
4. Caso de seguridad: `call` y `a[0] = x` → instrucciones conservadas.
5. Caso de comparación: activar modo agresivo y mostrar la diferencia detectada.
6. Regresión: abrir las OVAs 1 a 5 desde el portal y comprobar que siguen cargando.
