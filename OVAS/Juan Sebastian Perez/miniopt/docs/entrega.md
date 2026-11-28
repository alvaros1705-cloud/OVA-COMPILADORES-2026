# Checklist de entrega — Reto 6 (MiniOpt)

## 1. Entregables obligatorios del PDF (§7)

| # | Entregable | Dónde está | Estado |
|---|---|---|---|
| 1 | Código fuente actualizado y ejecutable | `OVAS/Juan Sebastian Perez/miniopt/` + cambios en `script.js`, `index.html`, `js/learning-data.js` | **Listo** |
| 2 | Enlace al repositorio y rama de trabajo | Repositorio institucional, rama `reto6-miniopt-juan-sebastian` | **Falta push y URL del PR** |
| 3 | Informe de diagnóstico | [`diagnostico.md`](diagnostico.md) | **Listo** |
| 4 | Relación de cambios con justificación técnica | [`cambios.md`](cambios.md) | **Listo** |
| 5 | Matriz de pruebas (ID, entrada, esperado, obtenido, estado, observaciones) | [`matriz-pruebas.md`](matriz-pruebas.md) — P-01 a P-20 | **Listo** |
| 6 | Evidencias de ejecución (capturas o grabaciones) | [`evidencias/`](evidencias/) — 12 capturas + salida de `npm test` | **Listo** (video en el punto 9) |
| 7 | Manual de usuario actualizado | [`manual-usuario.md`](manual-usuario.md) | **Listo** |
| 8 | Documento técnico breve (arquitectura, archivos, decisiones, limitaciones) | [`documento-tecnico.md`](documento-tecnico.md) | **Listo** |
| 9 | Video de sustentación de mínimo 5 minutos | Guion en [`guion-sustentacion.md`](guion-sustentacion.md) | **Falta grabarlo** |
| 10 | Pull Request a `main`, sin fusionar | Repositorio institucional | **Falta crearlo** |

## 2. Formato de la matriz (§8)

La matriz incluye las columnas exigidas:

| ID | Entrada / escenario | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|
| P-01 … P-20 | Casos válidos, errores, límites, regresión e integración | Salidas descritas | Salidas verificadas | Aprobado | Ver [`matriz-pruebas.md`](matriz-pruebas.md) |

Además se documentan las **38 pruebas automatizadas** (`npm test`) y las pruebas de humo con `jsdom`.

## 3. Correspondencia con la rúbrica (§9)

| Criterio | Peso | Evidencia |
|---|---:|---|
| Diagnóstico y comprensión | 15 % | `diagnostico.md` |
| Mejoras implementadas | 30 % | Motor con seis optimizaciones, política de seguridad y traza |
| Pruebas | 25 % | 38 pruebas + matriz P-01…P-20 + equivalencia |
| Integración | 15 % | Ruta, tarjeta, modal, guía, iframe y tema USB |
| Documentación y sustentación | 15 % | Manual, documento técnico, guion y video |

## 4. Antes de subir

```bash
cd OVA-COMPILADORES-2026
cd "OVAS/Juan Sebastian Perez/miniopt"
npm test
cd ../../..
git status
git log --oneline -5
```

Debe verse la rama `reto6-miniopt-juan-sebastian` y el árbol limpio.

## 5. Publicación y PR

```bash
git push -u origin reto6-miniopt-juan-sebastian
```

Luego, en GitHub:

1. Abrir un Pull Request de `reto6-miniopt-juan-sebastian` hacia `main`.
2. Título sugerido: `Reto 6: MiniOpt — optimizador de código intermedio TAC`.
3. Adjuntar en la descripción:
   - enlace a `docs/diagnostico.md`,
   - enlace a `docs/cambios.md`,
   - enlace a `docs/matriz-pruebas.md`,
   - enlace a `docs/manual-usuario.md`,
   - enlace a `docs/documento-tecnico.md`,
   - capturas o video.
4. **No fusionar** hasta la revisión y autorización del docente.

## 6. Evidencias visuales listas

Las 12 capturas están en [`evidencias/`](evidencias/) y cubren:

- ejemplo del enunciado con `x = 16`,
- reglas aplicadas,
- equivalencia,
- división por cero,
- efectos secundarios,
- error por línea,
- paso a paso,
- modo agresivo,
- tema claro,
- dashboard con 6 OVAs,
- las seis tarjetas,
- MiniOpt dentro del iframe.

Pendiente únicamente:

- Video de 5 minutos siguiendo [`guion-sustentacion.md`](guion-sustentacion.md).
- Opcional: grabación de `npm test` mostrando `38 pass`.

## 7. Enlaces internos útiles

- [README de MiniOpt](../README.md)
- [Diagnóstico](diagnostico.md)
- [Arquitectura](arquitectura.md)
- [Reglas de optimización](reglas-optimizacion.md)
- [Manual de usuario](manual-usuario.md)
- [Matriz de pruebas](matriz-pruebas.md)
- [Relación de cambios](cambios.md)
- [Documento técnico](documento-tecnico.md)
- [Guion de sustentación](guion-sustentacion.md)
