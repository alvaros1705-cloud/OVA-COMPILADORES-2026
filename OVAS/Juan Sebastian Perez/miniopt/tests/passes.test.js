import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProgram } from '../js/tac/parser.js';
import { formatProgram } from '../js/tac/ir.js';
import { folding } from '../js/passes/folding.js';
import { algebraic } from '../js/passes/algebraic.js';
import { constantPropagation } from '../js/passes/constant-propagation.js';
import { copyPropagation } from '../js/passes/copy-propagation.js';
import { deadCodeElimination } from '../js/passes/dce.js';
import { tempCoalescing } from '../js/passes/temp-coalescing.js';

function run(pass, source, options = {}) {
  const { program } = parseProgram(source);
  const result = pass.run(program, options);
  return { ...result, text: formatProgram(result.program).trim() };
}

test('plegado de constantes resuelve operaciones', () => {
  const result = run(folding, 't1 = 5 + 3\nx = t1 * 2');
  assert.equal(result.text, 't1 = 8\nx = t1 * 2');
  assert.equal(result.events[0].rule, 'CF');
});

test('plegado no divide por cero y advierte', () => {
  const result = run(folding, 'x = 10 / 0');
  assert.equal(result.text, 'x = 10 / 0');
  assert.equal(result.changed, false);
  assert.match(result.warnings[0].message, /división por cero/);
});

test('simplificación algebraica aplica identidades', () => {
  const cases = [
    ['x = y + 0', 'x = y'],
    ['x = 0 + y', 'x = y'],
    ['x = y - 0', 'x = y'],
    ['x = y * 1', 'x = y'],
    ['x = 1 * y', 'x = y'],
    ['x = y * 0', 'x = 0'],
    ['x = y / 1', 'x = y'],
    ['x = y - y', 'x = 0']
  ];
  for (const [source, expected] of cases) {
    assert.equal(run(algebraic, source).text, expected, source);
  }
});

test('propagación de constantes sustituye valores conocidos', () => {
  const result = run(constantPropagation, 'a = 1\nb = a + 2\nprint b');
  assert.equal(result.text, 'a = 1\nb = 1 + 2\nprint 3');
  assert.equal(result.changed, true);
});

test('propagación de constantes no cruza uniones con valores distintos', () => {
  const source = [
    'if x < 1 goto L1',
    'a = 1',
    'goto L2',
    'L1:',
    'a = 2',
    'L2:',
    'print a'
  ].join('\n');
  const result = run(constantPropagation, source);
  assert.match(result.text, /print a$/);
});

test('propagación de copias reemplaza variables', () => {
  const result = run(copyPropagation, 'a = b\nc = a\nprint c');
  assert.equal(result.text, 'a = b\nc = b\nprint b');
});

test('eliminación de código muerto retira temporales', () => {
  const result = run(deadCodeElimination, 't1 = 1 + 2\nprint 4');
  assert.equal(result.text, 'print 4');
  assert.equal(result.events[0].rule, 'DCE');
});

test('eliminación de código muerto conserva variables de usuario por defecto', () => {
  const result = run(deadCodeElimination, 'x = 5\nprint 4');
  assert.equal(result.text, 'x = 5\nprint 4');
});

test('modo agresivo elimina variables de usuario muertas', () => {
  const result = run(deadCodeElimination, 'x = 5\nprint 4', {
    aggressiveDce: true
  });
  assert.equal(result.text, 'print 4');
});

test('no elimina llamadas, parámetros ni almacenamientos', () => {
  const source = 'param x\ncall f, 1\na[0] = x\nprint 4';
  const result = run(deadCodeElimination, source);
  assert.equal(result.text, source);
});

test('coalescencia reutiliza el destino y elimina la copia', () => {
  const result = run(tempCoalescing, 't1 = a + b\nx = t1\nprint x');
  assert.equal(result.text, 'x = a + b\nprint x');
  assert.equal(result.events[0].rule, 'TC');
});

test('coalescencia no toca temporales con más de un uso', () => {
  const source = 't1 = a + b\nx = t1\nprint t1';
  const result = run(tempCoalescing, source);
  assert.equal(result.text, source);
});
