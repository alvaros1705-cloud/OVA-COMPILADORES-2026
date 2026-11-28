import test from 'node:test';
import assert from 'node:assert/strict';
import { optimize, createStepState, nextStep, stepResult } from '../js/optimizer.js';
import { SAMPLES } from '../js/samples.js';

test('ejemplo del enunciado termina en x = 16', () => {
  const result = optimize(SAMPLES.find((sample) => sample.id === 'enunciado').code);
  assert.equal(result.optimizedText.trim(), 'x = 16');
  assert.equal(result.equivalence.status, 'equivalent');
  assert.equal(result.stats.instructionsAfter, 1);
  assert.ok(result.events.some((event) => event.rule === 'CF'));
  assert.ok(result.events.some((event) => event.rule === 'DCE'));
});

test('propagación y copias conservan la salida', () => {
  const result = optimize(SAMPLES.find((sample) => sample.id === 'propagacion').code);
  assert.match(result.optimizedText, /print 10/);
  assert.equal(result.equivalence.status, 'equivalent');
});

test('los efectos secundarios nunca se eliminan', () => {
  const result = optimize(SAMPLES.find((sample) => sample.id === 'efectos').code);
  assert.match(result.optimizedText, /call registrar, 1/);
  assert.match(result.optimizedText, /a\[0\] = 5/);
  assert.match(result.optimizedText, /param 5/);
  assert.equal(result.equivalence.status, 'manual');
});

test('un ciclo conserva su flujo y su equivalencia', () => {
  const result = optimize(SAMPLES.find((sample) => sample.id === 'ciclo').code);
  assert.equal(result.optimizedText, SAMPLES.find((sample) => sample.id === 'ciclo').code);
  assert.equal(result.equivalence.status, 'equivalent');
});

test('la división por cero se conserva y se advierte', () => {
  const result = optimize(SAMPLES.find((sample) => sample.id === 'division').code);
  assert.match(result.optimizedText, /10 \/ 0/);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.equivalence.status, 'error');
});

test('una entrada inválida reporta la línea y no bloquea el resto', () => {
  const result = optimize(SAMPLES.find((sample) => sample.id === 'error').code);
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].line, 1);
  assert.match(result.optimizedText, /y = 6/);
  assert.equal(result.equivalence.status, 'manual');
});

test('el modo agresivo puede cambiar una salida observable', () => {
  const result = optimize('x = 5\nprint 1', { aggressiveDce: true });
  assert.equal(result.optimizedText.trim(), 'print 1');
  assert.equal(result.equivalence.status, 'different');
  assert.ok(result.equivalence.diffs.some((diff) => diff.name === 'x'));
});

test('el modo conservador mantiene la variable de usuario', () => {
  const result = optimize('x = 5\nprint 1');
  assert.equal(result.optimizedText.trim(), 'x = 5\nprint 1');
  assert.equal(result.equivalence.status, 'equivalent');
});

test('se pueden desactivar pases', () => {
  const result = optimize('t1 = 5 + 3\nprint t1', { folding: false, constProp: false, dce: false });
  assert.match(result.optimizedText, /t1 = 5 \+ 3/);
});

test('el modo paso a paso llega al mismo resultado', () => {
  const source = SAMPLES.find((sample) => sample.id === 'enunciado').code;
  let state = createStepState(source);
  let guard = 0;
  while (!state.done && guard < 100) {
    state = nextStep(state).state;
    guard += 1;
  }
  const result = stepResult(state);
  assert.equal(result.optimizedText.trim(), 'x = 16');
  assert.equal(result.equivalence.status, 'equivalent');
});

test('todas las muestras se ejecutan sin lanzar excepciones', () => {
  for (const sample of SAMPLES) {
    const result = optimize(sample.code);
    assert.ok(['equivalent', 'manual', 'error', 'different'].includes(result.equivalence.status));
  }
});
