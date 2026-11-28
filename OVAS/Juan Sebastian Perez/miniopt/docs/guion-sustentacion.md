# Guion de sustentación — MiniOpt (5 minutos)

## Antes de empezar

- Tener abierto el portal en la OVA 7. La OVA 06 corresponde a otra implementación de MiniOpt y se conserva como comparación.
- Tener cargado el ejemplo **“Ejemplo del enunciado”**.
- Tener a mano una terminal con `npm test` en la carpeta de MiniOpt.
- Verificar que el proyector permite ver el tema oscuro y el contraste.

## 0:00 – 0:40 | Contexto y diagnóstico

> “El Reto 6 pedía una herramienta nueva: un optimizador de TAC. Revisé el portal y encontré cinco OVAs estáticas, rutas centralizadas en `script.js`, tarjetas y modales en `index.html` y un sistema de diseño compartido. No existía ninguna ruta, tarjeta ni motor de optimización. La restricción principal es que GitHub Pages no ejecuta backend, así que decidí construir un cliente 100 % estático, sin dependencias de ejecución, y con pruebas nativas de Node.”

Mostrar brevemente:

- `script.js` → `OVAS_ROUTES`.
- `index.html` → tarjeta 06.
- `OVAS/Juan Sebastian Perez/miniopt/`.

## 0:40 – 1:30 | Arquitectura

> “Separé el motor de la interfaz. El parser convierte el TAC en instrucciones con línea de origen; el CFG calcula bloques, sucesores y liveness; los pases son módulos independientes que devuelven una traza explicable; y el orquestador repite el pipeline hasta punto fijo. La interfaz solo dibuja resultados.”

Mostrar el diagrama de `docs/arquitectura.md` o la estructura de carpetas.

## 1:30 – 3:00 | Demostración principal

1. Cargar **“Ejemplo del enunciado”**.
2. Pulsar **Optimizar**.
3. Señalar el resultado `x = 16` y las métricas 4 → 1, 75 %.
4. Abrir **Comparación** y explicar el diff.
5. Abrir **Reglas aplicadas** y leer una fila:
   - `t1 = 5 + 3` → `t1 = 8` (CF).
   - `x = t3` → `x = 16` (CP).
   - `t3 = 16` eliminada (DCE).
6. Abrir **Equivalencia** y mostrar `x = 16` en original y optimizado.

> “La herramienta no solo elimina instrucciones: explica qué regla aplicó y por qué es válida.”

## 3:00 – 4:00 | Seguridad y casos límite

1. Cargar **“Efectos secundarios”**.
2. Optimizar y mostrar que `call registrar, 1`, `param` y `a[0] = 5` se conservan; la equivalencia queda en **verificación manual**.
3. Cargar **“División por cero”**.
4. Mostrar que `x = 10 / 0` no se pliega y aparece la advertencia.
5. Cargar **“Entrada con error”**.
6. Mostrar el error en la línea 1 y que el resto del programa se sigue optimizando.
7. Activar **modo agresivo** sobre un programa con variable muerta y mostrar que la equivalencia detecta la diferencia.

> “La regla es conservar cuando no se puede garantizar. El modo agresivo existe para demostrar el riesgo, no para usarlo a ciegas.”

## 4:00 – 4:40 | Integración y regresión

1. Volver al portal.
2. Abrir la tarjeta **OVA 07** y mostrar que carga en el iframe.
3. Abrir la **OVA 06** de Daihan y una OVA anterior (por ejemplo, la 5) para confirmar que ambas siguen funcionando.
4. Mostrar la guía del Centro de Aprendizaje con la entrada de MiniOpt.
5. Mostrar el tema claro/oscuro.

## 4:40 – 5:00 | Pruebas y cierre

Ejecutar en vivo:

```bash
cd "OVAS/Juan Sebastian Perez/miniopt"
npm test
```

> “Son 38 pruebas: parser, pases, pipeline, equivalencia y casos límite. También verifiqué la UI con un DOM real y el router del portal. Las limitaciones están documentadas: no hay punteros ni alias, la propagación de copias es local y las llamadas se marcan como verificación manual.”

Cerrar con:

> “El producto cumple el reto: recibe TAC, aplica seis optimizaciones seguras, compara antes/después, explica cada regla y demuestra equivalencia. Está integrado en el portal y no modificó el código de las OVAs anteriores.”

## Preguntas probables

| Pregunta | Respuesta breve |
|---|---|
| ¿Por qué no usaron un backend? | GitHub Pages es estático; un backend añadiría CORS, URLs y puntos de fallo. El motor cabe en el navegador. |
| ¿Cómo garantizan que no cambia el resultado? | Dataflow conservador, barreras de efectos secundarios y un intérprete que compara salidas observables. |
| ¿Por qué conservan `x = 16` si `x` no se lee? | En el ejemplo del enunciado `x` es la salida didáctica; por defecto se protegen las variables de usuario. El modo agresivo puede eliminarla y la equivalencia lo advierte. |
| ¿Qué pasa con un ciclo? | El CFG y el punto fijo manejan el ciclo; en uniones con valores distintos no se propaga. Se probó con un ciclo que suma 0..4. |
| ¿Qué pasa con una llamada? | Es una barrera: no se propaga a través de ella y la equivalencia se marca manual porque no se simula el cuerpo de la función. |
| ¿Por qué `0.1 + 0.2` no da `0.3`? | Se usa IEEE-754 de JavaScript; no se redondea para no alterar el resultado. Está documentado. |
| ¿Cómo sé que la UI funciona? | Prueba de humo con `jsdom`: ejemplo inicial, cambio de muestra, modo agresivo, paso a paso, pestañas, error y límite de tamaño. |
| ¿Qué archivos del portal tocaron? | `script.js`, `index.html`, `js/learning-data.js`, `OVAS/README.md`; no se modificó el código interno de las OVAs 1–5. |
