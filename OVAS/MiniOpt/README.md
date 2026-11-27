# MiniOpt — Optimizador de Código Intermedio (TAC)

**Autor:** Daihan Riveros  
**Asignatura:** Teoría de Compiladores | **Universidad Simón Bolívar (Sede Cúcuta)**  
**Reto 6:** Diseño e implementación de una herramienta web de optimización segura de Código de Tres Direcciones (TAC) integrada al Portal de OVAs.

## Características principales
* **Plegado de constantes** con protección contra división/módulo por cero.
* **Propagación de constantes** segura por bloques básicos (se reinicia en etiquetas y reasignaciones).
* **Simplificación algebraica** (`x + 0`, `0 + x`, `x - 0`, `x * 1`, `1 * x`, `x / 1`, `x * 0`, `x - x`) evitando transformaciones inseguras como `0 / x` o `x / x`.
* **Eliminación de temporales redundantes** (propagación de copias temporales, fusión de temporales de uso único y eliminación de auto-asignaciones).
* **Eliminación de código muerto** (temporales sin uso, asignaciones sobrescritas y código inalcanzable tras `goto`/`return`) protegiendo siempre **efectos secundarios** (`print`, `read`, `call`, `param`, `return`).
* **Comparativa Antes / Después + Explicación paso a paso + Verificación automática de equivalencia semántica**.
* **100% Cliente Estático**, compatible con GitHub Pages y con el tema claro/oscuro del Portal USB (`OVAS/shared/`).

## Ejecución de pruebas automatizadas
Desde la raíz del repositorio:
```bash
node --test OVAS/MiniOpt/tests/optimizer.test.mjs OVAS/MiniOpt/tests/integration.test.mjs
```

## Documentación del entregable
* [Informe de diagnóstico](docs/INFORME_DIAGNOSTICO.md)
* [Documento técnico y relación de cambios](docs/DOCUMENTO_TECNICO_Y_CAMBIOS.md)
* [Matriz de pruebas diligenciada](docs/MATRIZ_DE_PRUEBAS.md)
* [Manual de usuario](docs/MANUAL_USUARIO.md)
* [Guía de video, sustentación y Pull Request](docs/GUIA_VIDEO_SUSTENTACION_Y_PR.md)
* [Informe de herramientas y recursos (PDF, 2 páginas)](docs/INFORME_HERRAMIENTAS_Y_RECURSOS_MINIOPT.pdf)


**Manual de usuario:** [Descargar PDF](docs/MANUAL_USUARIO_MINIOPT.pdf)
