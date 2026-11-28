# Evidencias visuales — MiniOpt

Capturas generadas con **Playwright + Chromium 131** sobre el portal servido localmente en `http://127.0.0.1:8899/`.

| Archivo | Qué muestra | Caso relacionado |
|---|---|---|
| [`01-ejemplo-enunciado.png`](01-ejemplo-enunciado.png) | Ejemplo del enunciado: 4 → 1 instrucciones, reducción 75 %, `x = 16`. | P-01 |
| [`02-reglas-aplicadas.png`](02-reglas-aplicadas.png) | Tabla de reglas: CF, AS, CP, DCE con línea, antes, después y justificación. | P-01 |
| [`03-equivalencia.png`](03-equivalencia.png) | Pestaña de equivalencia: `print`, `return`, variables observables y estado equivalente. | P-01 |
| [`04-division-por-cero.png`](04-division-por-cero.png) | `x = 10 / 0` no se pliega; advertencia y conservación de la instrucción. | P-08 |
| [`05-efectos-secundarios.png`](05-efectos-secundarios.png) | `call`, `param` y `a[0] = x` se conservan; equivalencia manual. | P-09 |
| [`06-error-por-linea.png`](06-error-por-linea.png) | Entrada inválida: error en línea 1 y optimización del resto del programa. | P-12 |
| [`07-paso-a-paso.png`](07-paso-a-paso.png) | Modo paso a paso: un pase por clic y traza acumulada. | P-01 |
| [`08-modo-agresivo.png`](08-modo-agresivo.png) | Modo agresivo: se elimina `x` y la equivalencia detecta `10 → 0`. | P-07 |
| [`09-tema-claro.png`](09-tema-claro.png) | Tema claro con los tokens institucionales USB. | P-20 |
| [`10-portal-dashboard.png`](10-portal-dashboard.png) | Dashboard con 7 OVAS integradas y los ítems 06 y 07 en el menú. | P-18 |
| [`11-portal-siete-ovas.png`](11-portal-siete-ovas.png) | Las siete tarjetas, incluida “MiniOpt (Juan Sebastian)”. | P-18 |
| [`12-portal-iframe-miniopt.png`](12-portal-iframe-miniopt.png) | MiniOpt cargado dentro del iframe del portal. | P-18 |

## Registros de ejecución

| Archivo | Contenido |
|---|---|
| [`npm-test.txt`](npm-test.txt) | Salida completa de `npm test`: 38 pruebas aprobadas. |
| [`ui-smoke.log`](ui-smoke.log) | Prueba de humo de la UI: ejemplo, efectos, modo agresivo, paso a paso, pestañas, error y límite. |
| [`portal-smoke.log`](portal-smoke.log) | Prueba de humo del portal: 7 tarjetas, 8 ítems de navegación, modal, contadores e iframe. |
| [`capturas.log`](capturas.log) | Resultado de la captura con Playwright: sin errores de página. |

## Reproducir las capturas

```bash
# En la raíz del repositorio
python3 -m http.server 8899

# En otra terminal, con Playwright instalado
node capture.cjs
```

El script de captura no forma parte de la entrega: vive fuera del repositorio y solo se usó para generar estos archivos. El resultado de la ejecución se guarda en [`capturas.log`](capturas.log).

## Nota

- Las capturas se tomaron con el tema oscuro por defecto y una captura adicional en tema claro.
- El portal se sirvió por HTTP para que los módulos ES y las rutas relativas funcionaran igual que en GitHub Pages.
- No se registraron errores de página durante la captura (`errors []`).
