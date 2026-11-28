/**
 * MiniOpt — Orquestador de optimizaciones
 *
 * Ejecuta los pases en orden hasta alcanzar un punto fijo. Cada pase es
 * independiente y devuelve una traza explicable de los cambios aplicados.
 */

import { parseProgram } from './tac/parser.js';
import {
  cloneProgram,
  formatProgram,
  isNop,
  isTemp
} from './tac/ir.js';
import { folding } from './passes/folding.js';
import { algebraic } from './passes/algebraic.js';
import { constantPropagation } from './passes/constant-propagation.js';
import { copyPropagation } from './passes/copy-propagation.js';
import { tempCoalescing } from './passes/temp-coalescing.js';
import { deadCodeElimination } from './passes/dce.js';
import { compareEquivalence } from './interpreter.js';

export const PASS_ORDER = [
  'folding',
  'algebraic',
  'constProp',
  'coalesce',
  'copyProp',
  'dce'
];

export const PASSES = {
  folding,
  algebraic,
  constProp: constantPropagation,
  copyProp: copyPropagation,
  coalesce: tempCoalescing,
  dce: deadCodeElimination
};

export const PASS_META = PASS_ORDER.map((id) => ({
  id,
  name: PASSES[id].name,
  short: PASSES[id].short,
  description: PASSES[id].description
}));

const DEFAULT_MAX_ITERATIONS = 50;

function codeCount(program) {
  return program.filter((instruction) => !isNop(instruction)).length;
}

function tempCount(program) {
  const names = new Set();
  for (const instruction of program) {
    if (instruction.dest && isTemp(instruction.dest)) names.add(instruction.dest);
    for (const key of ['a', 'b', 'src', 'value', 'index']) {
      const operand = instruction[key];
      if (operand && operand.type === 'var' && isTemp(operand.name)) {
        names.add(operand.name);
      }
    }
  }
  return names.size;
}

function countByRule(events) {
  const counts = {};
  for (const event of events) {
    counts[event.rule] = (counts[event.rule] ?? 0) + 1;
  }
  return counts;
}

function uniqueWarnings(warnings) {
  const seen = new Set();
  const result = [];
  for (const warning of warnings) {
    const key = `${warning.line ?? ''}:${warning.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(warning);
  }
  return result;
}

export function summarize(original, optimized, events, warnings, iterations, errors = []) {
  const before = codeCount(original);
  const after = codeCount(optimized);
  return {
    stats: {
      instructionsBefore: before,
      instructionsAfter: after,
      reduction: before === 0 ? 0 : Math.round((1 - after / before) * 100),
      temporalsBefore: tempCount(original),
      temporalsAfter: tempCount(optimized),
      transformations: events.length,
      byRule: countByRule(events)
    },
    equivalence: compareEquivalence(original, optimized),
    warnings: uniqueWarnings(warnings),
    errors,
    iterations
  };
}

/**
 * Optimiza un programa TAC.
 * @param {string} source
 * @param {object} [options] — {folding, algebraic, constProp, copyProp, coalesce, dce, aggressiveDce, maxIterations}
 */
export function optimize(source, options = {}) {
  const parsed = parseProgram(source);
  const original = cloneProgram(parsed.program);
  let program = cloneProgram(parsed.program);
  const events = [];
  const warnings = [...parsed.warnings];
  const maxIterations = Number.isFinite(options.maxIterations)
    ? Math.max(1, options.maxIterations)
    : DEFAULT_MAX_ITERATIONS;

  let iterations = 0;
  let changedInIteration = true;

  while (changedInIteration && iterations < maxIterations) {
    changedInIteration = false;
    iterations += 1;

    for (const id of PASS_ORDER) {
      if (options[id] === false) continue;
      const result = PASSES[id].run(program, options);
      program = result.program;
      warnings.push(...result.warnings);
      if (result.changed) {
        changedInIteration = true;
        for (const event of result.events) {
          events.push({ ...event, pass: PASSES[id].name });
        }
      }
    }
  }

  const summary = summarize(
    original,
    program,
    events,
    warnings,
    iterations,
    parsed.errors
  );

  return {
    ok: parsed.errors.length === 0,
    original,
    optimized: program,
    originalText: formatProgram(original),
    optimizedText: formatProgram(program),
    events,
    ...summary
  };
}

/** Estado para el modo "paso a paso" (un pase por clic). */
export function createStepState(source, options = {}) {
  const parsed = parseProgram(source);
  const original = cloneProgram(parsed.program);
  return {
    original,
    program: cloneProgram(parsed.program),
    errors: parsed.errors,
    warnings: [...parsed.warnings],
    events: [],
    passIndex: 0,
    iteration: 1,
    cycleChanged: false,
    done: false,
    maxIterations: Number.isFinite(options.maxIterations)
      ? Math.max(1, options.maxIterations)
      : DEFAULT_MAX_ITERATIONS
  };
}

function advanceToEnabledPass(state, options) {
  while (
    state.passIndex < PASS_ORDER.length &&
    options[PASS_ORDER[state.passIndex]] === false
  ) {
    state.passIndex += 1;
  }
}

/**
 * Ejecuta el siguiente pase habilitado.
 * @returns {{state: object, step: object|null}}
 */
export function nextStep(state, options = {}) {
  if (state.done) return { state, step: null };

  advanceToEnabledPass(state, options);

  if (state.passIndex >= PASS_ORDER.length) {
    if (!state.cycleChanged) {
      state.done = true;
      return { state, step: null };
    }
    state.passIndex = 0;
    state.iteration += 1;
    state.cycleChanged = false;
    advanceToEnabledPass(state, options);
    if (state.iteration > state.maxIterations) {
      state.done = true;
      return { state, step: null };
    }
  }

  const id = PASS_ORDER[state.passIndex];
  state.passIndex += 1;
  const result = PASSES[id].run(state.program, options);
  state.program = result.program;
  state.warnings.push(...result.warnings);

  if (result.changed) {
    state.cycleChanged = true;
    for (const event of result.events) {
      state.events.push({ ...event, pass: PASSES[id].name });
    }
  }

  if (state.passIndex >= PASS_ORDER.length) {
    if (!state.cycleChanged) {
      state.done = true;
    } else {
      state.passIndex = 0;
      state.iteration += 1;
      state.cycleChanged = false;
      if (state.iteration > state.maxIterations) state.done = true;
    }
  }

  return {
    state,
    step: {
      passName: PASSES[id].name,
      changed: result.changed,
      events: result.events
    }
  };
}

/** Resultado completo a partir de un estado de paso a paso. */
export function stepResult(state) {
  const summary = summarize(
    state.original,
    state.program,
    state.events,
    state.warnings,
    state.iteration,
    state.errors
  );
  return {
    ok: state.errors.length === 0,
    original: state.original,
    optimized: state.program,
    originalText: formatProgram(state.original),
    optimizedText: formatProgram(state.program),
    events: state.events,
    ...summary
  };
}
