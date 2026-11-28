import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProgram, parseLine } from '../js/tac/parser.js';
import { formatInstruction } from '../js/tac/ir.js';

test('parsea asignaciones, copias y operaciones', () => {
  const { program, errors } = parseProgram('t1 = 5 + 3\nx = t1\ny = -x');
  assert.equal(errors.length, 0);
  assert.equal(program[0].kind, 'assign');
  assert.equal(program[0].op, '+');
  assert.equal(program[1].kind, 'copy');
  assert.equal(program[2].kind, 'unary');
  assert.equal(formatInstruction(program[0]), 't1 = 5 + 3');
});

test('parsea etiquetas, saltos y condicionales', () => {
  const { program, errors } = parseProgram('L1:\nif a < b goto L1\nifFalse x goto L1\ngoto L1');
  assert.equal(errors.length, 0);
  assert.equal(program[0].kind, 'label');
  assert.equal(program[1].kind, 'ifgoto');
  assert.equal(program[1].op, '<');
  assert.equal(program[2].mode, 'ifFalse');
  assert.equal(program[3].kind, 'goto');
});

test('parsea llamadas y arreglos', () => {
  const { program, errors } = parseProgram(
    'a[0] = x\ny = a[1]\nparam x\ncall f, 2\nz = call g, 1'
  );
  assert.equal(errors.length, 0);
  assert.equal(program[0].kind, 'store');
  assert.equal(program[1].kind, 'load');
  assert.equal(program[2].kind, 'param');
  assert.equal(program[3].kind, 'call');
  assert.equal(program[3].dest, null);
  assert.equal(program[4].dest, 'z');
});

test('conserva comentarios y líneas vacías como nop', () => {
  const { program, errors } = parseProgram('// comentario\n\nx = 1 # inline');
  assert.equal(errors.length, 0);
  assert.equal(program[0].kind, 'nop');
  assert.equal(program[1].kind, 'nop');
  assert.equal(program[2].kind, 'copy');
  assert.equal(program[2].src.value, 1);
});

test('reporta línea y mensaje en una instrucción inválida', () => {
  const { instruction, errors } = parseLine('x = 5 +', 7);
  assert.equal(instruction.kind, 'unknown');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 7);
  assert.match(errors[0].message, /No se reconoce/);
});

test('advierte por etiqueta no definida', () => {
  const { warnings } = parseProgram('goto L9');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /L9/);
});

test('acepta números enteros y reales', () => {
  const { program } = parseProgram('x = 2.5\ny = 3');
  assert.equal(program[0].src.value, 2.5);
  assert.equal(program[1].src.value, 3);
});
