# Manual tecnico del codigo

## Objetivo

Este documento explica como esta organizado el proyecto Compilador Semantico Web y que debe modificarse si se desea ampliar la herramienta.

## Archivos principales

- `index.html`: define la estructura de la pagina.
- `styles.css`: controla el diseno visual y el responsive.
- `analyzer.js`: contiene la logica del analizador.
- `Dockerfile`: define la imagen Nginx.
- `docker-compose.yml`: define como se ejecuta el contenedor.

## Flujo general

1. El usuario escribe codigo en el editor.
2. `analyzer.js` lee el contenido del `textarea`.
3. El codigo se divide en tokens.
4. Se valida la sintaxis basica.
5. Se construye la tabla de simbolos.
6. Se validan tipos y variables.
7. Se muestran errores, tokens, simbolos y codigo intermedio.

## Cambios v1.6.0

- `splitStatements()`: divide cada linea en sentencias (`;` fuera de parentesis, `{` y `}`).
- `TYPE_ALIASES`, `BOOLEAN_LITERALS` y `canonicalType()`: alias estilo C traducidos a los tipos del minilenguaje.
- `similarTypeWord()`: sugiere el tipo correcto cuando esta mal escrito y permite recuperar el analisis.
- Los simbolos tienen el campo `initialized`; `parsePrimary()` emite una advertencia si se usa una variable sin valor.
- Errores con `kind` `Léxico`, `Sintaxis`, `Semántico` o `Advertencia`; `renderAnalysis()` usa `countByKind()` para el desglose.
- Pruebas: `node tests/pruebas-semanticas.test.js`.

## Donde modificar

- Para agregar un nuevo tipo de dato: modificar `TYPE_KEYWORDS` (y `TYPE_ALIASES` si tiene alias), `suggestedTypeFor()` y `assignmentProblem()`.
- Para agregar un caso de prueba: agregarlo al arreglo `cases` de `tests/pruebas-semanticas.test.js`.
- Para agregar nuevas instrucciones: modificar `analyze()`.
- Para cambiar mensajes de error: modificar `issue()`, `undeclaredIssue()` y las validaciones dentro de `analyze()`.
- Para cambiar la apariencia: modificar `styles.css`.
- Para cambiar la estructura visual: modificar `index.html`.

## Recomendacion

Si el proyecto crece, conviene separar el analizador en modulos o mover la logica a un backend.
