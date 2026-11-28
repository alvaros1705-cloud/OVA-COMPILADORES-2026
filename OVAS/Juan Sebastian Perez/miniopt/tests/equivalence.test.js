import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProgram } from '../js/tac/parser.js';
import { runProgram, compareEquivalence } from '../js/interpreter.js';

function program(source) {
  return parseProgram(source).program;
}

test('interpreta asignaciones, print y return', () => {
  const result = runProgram(program('x = 2\ny = x * 3\nprint y\nreturn y'));
  assert.equal(result.ok, true);
  assert.deepEqual(result.output, [6]);
  assert.equal(result.ret, 6);
});

test('interpreta ciclos', () => {
  const source = [
    'i = 0',
    't1 = 0',
    'L1:',
    'if i < 5 goto L2',
    'goto L3',
    'L2:',
    't1 = t1 + i',
    'i = i + 1',
    'goto L1',
    'L3:',
    'print t1',
    'return t1'
  ].join('\n');
  const result = runProgram(program(source));
  assert.equal(result.ok, true);
  assert.deepEqual(result.output, [10]);
  assert.equal(result.ret, 10);
});

test('interpreta arreglos', () => {
  const result = runProgram(program('a[0] = 7\nx = a[0]\nprint x'));
  assert.deepEqual(result.output, [7]);
  assert.equal(result.arrays.a[0].value, 7);
});

test('ifFalse salta cuando el valor es cero', () => {
  const source = ['x = 0', 'ifFalse x goto L1', 'print 1', 'goto L2', 'L1:', 'print 2', 'L2:'].join('\n');
  const result = runProgram(program(source));
  assert.deepEqual(result.output, [2]);
});

test('detecta división por cero en ejecución', () => {
  const result = runProgram(program('x = 10 / 0'));
  assert.equal(result.ok, false);
  assert.match(result.error.message, /división por cero/);
});

test('compara programas equivalentes', () => {
  const before = program('t1 = 5 + 3\nx = t1\nprint x');
  const after = program('x = 8\nprint x');
  const result = compareEquivalence(before, after);
  assert.equal(result.status, 'equivalent');
  assert.deepEqual(result.diffs, []);
});

test('detecta diferencias en variables observables', () => {
  const before = program('x = 5\nprint 1');
  const after = program('x = 6\nprint 1');
  const result = compareEquivalence(before, after);
  assert.equal(result.status, 'different');
  assert.equal(result.diffs[0].name, 'x');
});

test('marca como manual un programa con llamadas', () => {
  const before = program('call f, 1\nprint 1');
  const after = program('call f, 1\nprint 1');
  const result = compareEquivalence(before, after);
  assert.equal(result.status, 'manual');
});
