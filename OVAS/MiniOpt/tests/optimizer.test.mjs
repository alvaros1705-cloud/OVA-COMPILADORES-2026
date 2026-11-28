import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MiniOpt = require('../js/optimizer.js');

test('P-01: Ejemplo oficial del PDF (plegado + propagación + simplificación + temporales + DCE)', () => {
  const input = 't1 = 5 + 3; t2 = t1 * 2; t3 = t2 + 0; x = t3';
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'x = 16');
  assert.equal(res.equivalence.equivalent, true);
  assert.equal(res.equivalence.status, 'verified');
  assert.equal(res.equivalence.original.userVars.x, '16');
  assert.equal(res.equivalence.optimized.userVars.x, '16');
  assert.ok(res.steps.length >= 4, 'Debe registrar las reglas aplicadas');
});

test('P-02: Entradas inválidas y errores sintácticos con número de línea', () => {
  const emptyRes = MiniOpt.optimizeTAC('   ');
  assert.equal(emptyRes.ok, false);
  assert.ok(emptyRes.errors.length > 0);

  const badExpr = MiniOpt.optimizeTAC('t1 = 5 + 3\nx = 5 +');
  assert.equal(badExpr.ok, false);
  assert.equal(badExpr.errors[0].line, 2);

  const badLabel = MiniOpt.optimizeTAC('goto L99');
  assert.equal(badLabel.ok, false);
  assert.match(badLabel.errors[0].message, /L99/);

  const tooManyOps = MiniOpt.optimizeTAC('x = 1 + 2 + 3');
  assert.equal(tooManyOps.ok, false);
  assert.match(tooManyOps.errors[0].message, /Tres Direcciones/i);
});

test('P-03: Caso límite - División y módulo por cero NO se pliegan por seguridad', () => {
  const input = 't1 = 10 / 0\nx = t1';
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'x = 10 / 0');
  assert.ok(res.safetyNotices.length >= 1);
  assert.equal(res.equivalence.equivalent, true);
});

test('P-04: Variación de espacios, comentarios y separadores con punto y coma', () => {
  const input = `
    // Comentario inicial
    t1=5+3 ;   t2   =   t1*2
    # Otro comentario
    t3 =  t2   +   0 ;
    x=t3
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'x = 16');
  assert.equal(res.equivalence.equivalent, true);
});

test('P-05: Simplificaciones algebraicas válidas y protección de 0/a y a/a', () => {
  const input = `
    r1 = a + 0
    r2 = 0 + b
    r3 = c - 0
    r4 = d * 1
    r5 = 1 * e
    r6 = f / 1
    r7 = g * 0
    r8 = h - h
    r9 = 0 / a
    r10 = a / a
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  const lines = res.optimizedCode.split('\n');
  assert.deepEqual(lines, [
    'r1 = a',
    'r2 = b',
    'r3 = c',
    'r4 = d',
    'r5 = e',
    'r6 = f',
    'r7 = 0',
    'r8 = 0',
    'r9 = 0 / a',
    'r10 = a / a'
  ]);
  assert.ok(res.safetyNotices.some(n => n.instruction.includes('0 / a')));
  assert.ok(res.safetyNotices.some(n => n.instruction.includes('a / a')));
  assert.equal(res.equivalence.equivalent, true);
});

test('P-06: Propagación de constantes e invalidación segura al reasignar', () => {
  const input = `
    a = 5
    b = a + 2
    a = y
    c = a + 1
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'b = 7\na = y\nc = a + 1');
  assert.equal(res.equivalence.equivalent, true);
});

test('P-07: Eliminación de temporales redundantes y auto-asignaciones', () => {
  const input = `
    t1 = a + b
    res = t1
    t2 = res
    t3 = t2
    final = t3
    final = final
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'res = a + b\nfinal = res');
  assert.equal(res.equivalence.equivalent, true);
});

test('P-08: Eliminación de código muerto (sobrescrito, temporal no usado e inalcanzable)', () => {
  const input = `
    t1 = a + b
    x = 10
    x = 20
    z = 999
    print x
    goto L_END
    w = 123
    L_END:
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'print 20\ngoto L_END\nL_END:');
  assert.equal(res.equivalence.equivalent, true);
  assert.deepEqual(res.equivalence.original.outputs, ['20']);
  assert.deepEqual(res.equivalence.optimized.outputs, ['20']);
});

test('P-09: Restricción esencial - Instrucciones con efectos secundarios NO se eliminan', () => {
  const input = `
    t1 = call leerSensor, 0
    read dato
    call registrarLog, 0
    t2 = 4 + 6
    print t2
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(
    res.optimizedCode,
    't1 = call leerSensor, 0\nread dato\ncall registrarLog, 0\nprint 10'
  );
  assert.ok(res.safetyNotices.length >= 2, 'Debe documentar por qué conserva efectos secundarios');
});

test('P-10: Flujo de control y ciclos (no propagar constantes a través de etiquetas)', () => {
  const input = `
    i = 0
    L1:
    t1 = i < 5
    ifFalse t1 goto L2
    print i
    t2 = i + 1
    i = t2
    goto L1
    L2:
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.ok(res.optimizedCode.includes('i = 0'));
  assert.ok(res.optimizedCode.includes('L1:'));
  assert.ok(res.optimizedCode.includes('i = i + 1'));
  assert.equal(res.equivalence.equivalent, true);
  assert.deepEqual(res.equivalence.original.outputs, ['0', '1', '2', '3', '4']);
  assert.deepEqual(res.equivalence.optimized.outputs, ['0', '1', '2', '3', '4']);
});

test('P-11: Activación y desactivación selectiva de reglas de optimización', () => {
  const input = 't1 = 5 + 3\nt2 = t1 * 2\nx = t2';
  const onlyFolding = MiniOpt.optimizeTAC(input, {
    constantFolding: true,
    constantPropagation: false,
    algebraicSimplification: false,
    redundantTempElimination: false,
    deadCodeElimination: false
  });

  assert.equal(onlyFolding.ok, true);
  assert.equal(onlyFolding.optimizedCode, 't1 = 8\nt2 = t1 * 2\nx = t2');
  assert.equal(onlyFolding.summary.ruleCounts['constant-folding'], 1);
  assert.equal(onlyFolding.summary.ruleCounts['constant-propagation'], 0);
});

test('P-12: Operaciones con negativos, flotantes y booleanos', () => {
  const input = `
    t1 = -5 + 12
    t2 = t1 * 1.5
    t3 = !false
    y = t2
    ok = t3
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.equal(res.optimizedCode, 'y = 10.5\nok = true');
  assert.equal(res.equivalence.equivalent, true);
});

test('P-13: Seguridad en bifurcaciones condicionales (if/else con etiquetas)', () => {
  const input = `
    t1 = 2 + 3
    if a < t1 goto L_TRUE
    res = 20
    goto L_END
    L_TRUE:
    res = 30
    L_END:
    print res
  `;
  const res = MiniOpt.optimizeTAC(input);

  assert.equal(res.ok, true);
  assert.ok(res.optimizedCode.includes('if a < 5 goto L_TRUE'));
  assert.ok(res.optimizedCode.includes('res = 20'));
  assert.ok(res.optimizedCode.includes('res = 30'));
  assert.ok(res.optimizedCode.includes('print res'));
  assert.equal(res.equivalence.equivalent, true);
});
