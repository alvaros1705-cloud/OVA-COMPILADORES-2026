# Reto 4: Optimización y corrección del mini compilador TAC

Documentación del examen práctico *Evolución y fortalecimiento del Portal Integrado de OVAs* (Teoría de Compiladores, II-2026).

| # | Documento | Contenido |
|---|---|---|
| 1 | [Informe de diagnóstico](01_diagnostico.md) | Defectos encontrados, pasos para reproducirlos y su causa |
| 2 | [Relación de cambios](02_cambios.md) | Commits, archivos y justificación técnica |
| 3 | [Matriz de pruebas](03_matriz_pruebas.md) | ID, entrada, esperado, obtenido, estado y observaciones |
| 4 | [Manual de usuario](04_manual_usuario.md) | Instalación, uso de la OVA y cómo leer las cuádruplas |
| 5 | [Documento técnico](05_documento_tecnico.md) | Arquitectura, archivos modificados, decisiones y limitaciones |
| — | [Evidencias](evidencias/) | Capturas antes y después desde el portal, y salidas de pytest y del catálogo |

## Resumen

| Indicador | Antes (`main`) | Después (esta rama) |
|---|---|---|
| Pruebas automáticas | 0 existentes (15 de las 23 nuevas fallan) | 23 de 23 pasan |
| Casos del catálogo que tumban el compilador | 7 de 37 (HTTP 500) | 0 de 37 |
| Programas inválidos que generan TAC | 2 (`x = y + 1;`, `x = "hola";`) | 0 |
| Cuerpo de las funciones en el flujo principal | Sí | No (`GOTO Lk … LABEL Lk`) |

## Reproducir

```bash
cd "OVAS/Islender - Jhoan/mini_compiler"
pip install -r requirements.txt pytest httpx
python -m pytest
python scripts/casos_reto4.py
```
