/*
  tests/pruebas-semanticas.test.js
  Pruebas reproducibles del analizador (Reto 3 - Examen práctico OVA, Teoría de Compiladores 2026-II).

  Uso (desde la raíz del proyecto, requiere Node.js 16+):
    node tests/pruebas-semanticas.test.js
    node tests/pruebas-semanticas.test.js ruta/a/otro/analyzer.js   (para comparar con otra versión)

  Carga analyzer.js con un DOM mínimo simulado, ejecuta analyze() sobre cada caso
  y compara el resultado con lo esperado. Sale con código 1 si alguna prueba falla.
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fileArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const analyzerPath = fileArg || path.join(__dirname, '..', 'analyzer.js');

function loadAnalyzer(file) {
  const fakeElement = () => ({
    value: '', placeholder: '', textContent: '', className: '', innerHTML: '', dataset: {},
    classList: { add() {}, remove() {} }, addEventListener() {}, focus() {}, click() {}
  });
  const document = { getElementById: fakeElement, querySelectorAll: () => [], querySelector: () => null };
  const context = { document, console };
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(file, 'utf8')}\n;this.__analyze = analyze; this.__examples = examples;`, context);
  return { analyze: context.__analyze, examples: context.__examples };
}

const { analyze, examples } = loadAnalyzer(analyzerPath);

// Utilidades para describir el resultado.
const byKind = (r, kind) => r.errors.filter(e => e.kind === kind);
const realErrors = r => r.errors.filter(e => e.kind !== 'Advertencia');
const hasMessage = (r, kind, text) => byKind(r, kind).some(e => e.message.includes(text) || (e.help || '').includes(text));
const summary = r => {
  if (!r.errors.length) return 'Sin errores';
  const counts = {};
  r.errors.forEach(e => { counts[e.kind] = (counts[e.kind] || 0) + 1; });
  return Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ') + ' — ' + r.errors.map(e => `L${e.line}: ${e.message}`).join(' | ');
};

const cases = [
  // Casos mínimos del enunciado (Reto 3).
  { id: 'P-01', grupo: 'Enunciado', entrada: 'int x = 10;', esperado: 'Declaración válida; x registrada como entero',
    check: r => realErrors(r).length === 0 && r.symbols.some(s => s.name === 'x' && s.type === 'entero') },
  { id: 'P-02', grupo: 'Enunciado', entrada: 'x = 20;', esperado: 'Error semántico: variable no declarada',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', 'no fue declarada') },
  { id: 'P-03', grupo: 'Enunciado', entrada: 'int x; int x;', esperado: 'Error semántico: declaración duplicada en el mismo ámbito',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', 'ya fue declarada') },
  { id: 'P-04', grupo: 'Enunciado', entrada: 'int x = 10 + 2;', esperado: 'Operación válida',
    check: r => realErrors(r).length === 0 },
  { id: 'P-05', grupo: 'Enunciado', entrada: 'int x = "hola";', esperado: 'Error semántico: tipos incompatibles (texto → entero)',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', "tipo 'texto'") },

  // Mismos casos con la sintaxis propia del minilenguaje.
  { id: 'P-06', grupo: 'Declaraciones', entrada: 'entero x = 10;', esperado: 'Declaración válida',
    check: r => realErrors(r).length === 0 && r.symbols.length === 1 },
  { id: 'P-07', grupo: 'Declaraciones', entrada: 'entero x; entero x;', esperado: 'Error semántico: duplicada (misma línea)',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', 'ya fue declarada') },
  { id: 'P-08', grupo: 'Declaraciones', entrada: 'entero x;\nentero x;', esperado: 'Error semántico: duplicada (líneas distintas)',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', 'ya fue declarada') },
  { id: 'P-09', grupo: 'Declaraciones', entrada: 'entero x = 10; x = 20;', esperado: 'Válido: declaración y asignación en una línea',
    check: r => realErrors(r).length === 0 },

  // Tipos.
  { id: 'P-10', grupo: 'Tipos', entrada: 'texto t = "a";\nentero n = t;', esperado: 'Error semántico: texto → entero',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', "tipo 'texto'") },
  { id: 'P-11', grupo: 'Tipos', entrada: 'decimal d = 5;', esperado: 'Válido: entero se promueve a decimal',
    check: r => realErrors(r).length === 0 },
  { id: 'P-12', grupo: 'Tipos', entrada: 'entero e = 4.5;', esperado: 'Error semántico: decimal → entero (pérdida de decimales)',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', "tipo 'decimal'") },
  { id: 'P-13', grupo: 'Tipos', entrada: 'logico l = 5;', esperado: 'Error semántico: entero → logico',
    check: r => realErrors(r).length === 1 && byKind(r, 'Semántico').length === 1 },
  { id: 'P-14', grupo: 'Tipos', entrada: 'entero a = 1;\ntexto b = "x";\nentero c = a + b;', esperado: "Error semántico: '+' entre entero y texto",
    check: r => hasMessage(r, 'Semántico', "operador '+'") && byKind(r, 'Sintaxis').length === 0 },
  { id: 'P-15', grupo: 'Tipos', entrada: 'texto t = "a";\nlogico r = t == 5;', esperado: 'Error semántico: comparación texto con entero',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', 'No se puede comparar') },
  { id: 'P-16', grupo: 'Tipos', entrada: 'bool b = true;', esperado: 'Válido: alias bool y literal true',
    check: r => realErrors(r).length === 0 && r.symbols[0]?.type === 'logico' },
  { id: 'P-17', grupo: 'Tipos', entrada: 'entero e = 1;\nsi (e) {\n}', esperado: 'Error semántico: condición no lógica',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', "debe ser de tipo 'logico'") },

  // Ámbitos y tabla de símbolos.
  { id: 'P-18', grupo: 'Ámbitos', entrada: 'entero a = 1;\nsi (a > 0) {\n  entero a = 2;\n}', esperado: 'Válido: misma variable en ámbitos distintos (sombra)',
    check: r => realErrors(r).length === 0 && r.symbols.length === 2 && r.symbols[1].scope === 'bloque_1' },
  { id: 'P-19', grupo: 'Ámbitos', entrada: 'si (verdadero) {\n  entero y = 1;\n}\nimprimir(y);', esperado: 'Error semántico: y no es visible fuera del bloque',
    check: r => realErrors(r).length === 1 && hasMessage(r, 'Semántico', "'y'") },
  { id: 'P-20', grupo: 'Ámbitos', entrada: 'si (verdadero) { entero y = 1; imprimir(y); }', esperado: 'Válido: bloque completo en una sola línea',
    check: r => realErrors(r).length === 0 && r.symbols[0]?.scope === 'bloque_1' },
  { id: 'P-21', grupo: 'Ámbitos', entrada: 'entero w;\nentero k = w + 1;', esperado: 'Advertencia (no error): w se usa sin valor',
    check: r => realErrors(r).length === 0 && byKind(r, 'Advertencia').length === 1 },

  // Errores diferenciados por fase.
  { id: 'P-22', grupo: 'Fases', entrada: 'entero n = 5 @ 3;', esperado: "Error léxico por '@' (no sintáctico)",
    check: r => hasMessage(r, 'Léxico', "'@'") && byKind(r, 'Semántico').length === 0 },
  { id: 'P-23', grupo: 'Fases', entrada: 'texto t = "hola;', esperado: 'Error léxico: cadena sin cerrar',
    check: r => hasMessage(r, 'Léxico', 'cadena') },
  { id: 'P-24', grupo: 'Fases', entrada: 'entero x = 10', esperado: "Error sintáctico: falta ';' (sin errores semánticos)",
    check: r => byKind(r, 'Sintaxis').length === 1 && byKind(r, 'Semántico').length === 0 },

  // Formato (espacios y saltos de línea).
  { id: 'P-25', grupo: 'Formato', entrada: '   entero    x   =   10  ;  \n\n\n', esperado: 'Válido: espacios y saltos extra no afectan',
    check: r => realErrors(r).length === 0 && r.tokens.length === 5 },
  { id: 'P-26', grupo: 'Formato', entrada: 'entero x=10;', esperado: 'Válido sin espacios; 5 tokens',
    check: r => realErrors(r).length === 0 && r.tokens.length === 5 },

  // Regresión: comportamiento previo que debe mantenerse.
  { id: 'P-27', grupo: 'Regresión', entrada: '[Ejemplo correcto de la app]', fuente: () => examples.ok, esperado: 'Sin errores',
    check: r => r.errors.length === 0 },
  { id: 'P-28', grupo: 'Regresión', entrada: '[Ejemplo con errores de la app]', fuente: () => examples.errors, esperado: 'Errores de sintaxis y semánticos, con sugerencia para eda',
    check: r => byKind(r, 'Sintaxis').length > 0 && byKind(r, 'Semántico').length > 0 && r.errors.some(e => (e.help || '').includes("'edad'")) },
  { id: 'P-29', grupo: 'Regresión', entrada: '[Ejemplo condicional de la app]', fuente: () => examples.logic, esperado: 'Solo el error de condición no lógica',
    check: r => r.errors.length === 1 && hasMessage(r, 'Semántico', "debe ser de tipo 'logico'") },
  { id: 'P-30', grupo: 'Regresión', entrada: 'texto nombre = "Gabriel";\nimprimir(Nombre);', esperado: 'Error semántico con sugerencia nombre (mayúsculas)',
    check: r => realErrors(r).length === 1 && r.errors[0].help.includes("'nombre'") },
  { id: 'P-31', grupo: 'Regresión', entrada: '', esperado: 'Editor vacío: sin errores',
    check: r => r.isEmpty && r.errors.length === 0 }
];

let passed = 0;
const rows = [];
for (const c of cases) {
  const source = c.fuente ? c.fuente() : c.entrada;
  let result, ok, obtained;
  try {
    result = analyze(source);
    ok = Boolean(c.check(result));
    obtained = summary(result);
  } catch (err) {
    ok = false;
    obtained = `Excepción: ${err.message}`;
  }
  if (ok) passed++;
  rows.push({ ...c, ok, obtained });
  console.log(`${ok ? 'APROBADO   ' : 'NO APROBADO'}  ${c.id}  [${c.grupo}]  ${c.esperado}`);
  if (!ok) console.log(`             obtenido: ${obtained}`);
}
console.log(`\n${passed}/${cases.length} pruebas aprobadas (${path.relative(process.cwd(), analyzerPath) || analyzerPath})`);

// Con --json se imprime el detalle para construir la matriz de pruebas.
if (process.argv.includes('--json')) console.log(JSON.stringify(rows.map(({ check, fuente, ...rest }) => rest)));

process.exitCode = passed === cases.length ? 0 : 1;
