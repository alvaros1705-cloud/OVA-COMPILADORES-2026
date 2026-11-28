/**
 * MiniOpt — Intérprete TAC para verificar equivalencia
 *
 * No es un compilador: es un ejecutor acotado que permite comprobar que el
 * programa optimizado produce las mismas salidas observables que el original.
 * Las llamadas y las instrucciones opacas marcan la comparación como manual.
 */

import {
  definedVariable,
  formatNumber,
  isTemp
} from './tac/ir.js';
import { evaluateBinary, evaluateUnary } from './passes/common.js';

const DEFAULT_MAX_STEPS = 10000;

function valueOf(state, operand) {
  if (!operand) return 0;
  if (operand.type === 'num') return operand.value;
  return state.has(operand.name) ? state.get(operand.name) : 0;
}

function arrayKey(array, index) {
  return `${array}[${formatNumber(index)}]`;
}

function cloneArrayState(arrays) {
  const result = {};
  for (const [name, values] of arrays) {
    const keys = [...values.keys()].sort((a, b) => a - b);
    result[name] = keys.map((key) => ({ index: key, value: values.get(key) }));
  }
  return result;
}

/**
 * Ejecuta un programa TAC.
 * @returns {{ok: boolean, output: number[], ret: number|undefined, steps: number, verifiable: boolean, finalState: Map, arrays: object, error?: object}}
 */
export function runProgram(program, options = {}) {
  const maxSteps = Number.isFinite(options.maxSteps)
    ? Math.max(1, options.maxSteps)
    : DEFAULT_MAX_STEPS;

  const labels = new Map();
  program.forEach((instruction, index) => {
    if (instruction.kind === 'label') labels.set(instruction.name, index);
  });

  const state = new Map();
  const arrays = new Map();
  const output = [];
  let ret;
  let pc = 0;
  let steps = 0;
  let verifiable = true;

  const fail = (instruction, message) => ({
    ok: false,
    output,
    ret,
    steps,
    verifiable: false,
    finalState: state,
    arrays: cloneArrayState(arrays),
    error: { line: instruction?.line ?? null, message }
  });

  while (pc < program.length) {
    if (steps >= maxSteps) {
      return fail(program[pc], `Se alcanzó el límite de ${maxSteps} pasos.`);
    }
    const instruction = program[pc];
    steps += 1;

    switch (instruction.kind) {
      case 'nop':
      case 'label':
        pc += 1;
        break;

      case 'assign': {
        const left = valueOf(state, instruction.a);
        const right = valueOf(state, instruction.b);
        const result = evaluateBinary(instruction.op, left, right);
        if (!result.ok) {
          return fail(instruction, `Error en tiempo de ejecución: ${result.reason}.`);
        }
        state.set(instruction.dest, result.value);
        pc += 1;
        break;
      }

      case 'unary': {
        const result = evaluateUnary(instruction.op, valueOf(state, instruction.a));
        if (!result.ok) {
          return fail(instruction, `Error en tiempo de ejecución: ${result.reason}.`);
        }
        state.set(instruction.dest, result.value);
        pc += 1;
        break;
      }

      case 'copy':
        state.set(instruction.dest, valueOf(state, instruction.src));
        pc += 1;
        break;

      case 'load': {
        const index = valueOf(state, instruction.index);
        const values = arrays.get(instruction.array);
        state.set(instruction.dest, values?.get(index) ?? 0);
        pc += 1;
        break;
      }

      case 'store': {
        const index = valueOf(state, instruction.index);
        if (!arrays.has(instruction.array)) arrays.set(instruction.array, new Map());
        arrays.get(instruction.array).set(index, valueOf(state, instruction.value));
        pc += 1;
        break;
      }

      case 'goto': {
        const target = labels.get(instruction.label);
        if (target === undefined) {
          return fail(instruction, `Etiqueta no definida: ${instruction.label}.`);
        }
        pc = target;
        break;
      }

      case 'ifgoto': {
        const left = valueOf(state, instruction.a);
        const jump =
          instruction.mode === 'ifFalse'
            ? left === 0
            : (() => {
                const result = evaluateBinary(
                  instruction.op,
                  left,
                  valueOf(state, instruction.b)
                );
                return result.ok && result.value === 1;
              })();
        if (jump) {
          const target = labels.get(instruction.label);
          if (target === undefined) {
            return fail(instruction, `Etiqueta no definida: ${instruction.label}.`);
          }
          pc = target;
        } else {
          pc += 1;
        }
        break;
      }

      case 'print':
        output.push(valueOf(state, instruction.value));
        pc += 1;
        break;

      case 'return':
        ret = instruction.value ? valueOf(state, instruction.value) : undefined;
        pc = program.length;
        break;

      case 'param':
        pc += 1;
        break;

      case 'call':
        verifiable = false;
        if (instruction.dest) state.set(instruction.dest, 0);
        pc += 1;
        break;

      case 'unknown':
        verifiable = false;
        pc += 1;
        break;

      default:
        verifiable = false;
        pc += 1;
        break;
    }
  }

  return {
    ok: true,
    output,
    ret,
    steps,
    verifiable,
    finalState: state,
    arrays: cloneArrayState(arrays)
  };
}

export function observableVariables(program) {
  const variables = new Set();
  for (const instruction of program) {
    if (instruction.kind === 'print' || instruction.kind === 'return') {
      if (instruction.value?.type === 'var' && !isTemp(instruction.value.name)) {
        variables.add(instruction.value.name);
      }
    }
    const dest = definedVariable(instruction);
    if (dest && !isTemp(dest)) variables.add(dest);
  }
  return variables;
}

function sameNumber(a, b) {
  if (a === undefined || b === undefined) return a === b;
  return Object.is(a, b);
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => sameNumber(value, b[index]));
}

function sameArrays(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compara las salidas observables de dos programas.
 * @returns {{status: 'equivalent'|'different'|'manual'|'error', ...}}
 */
export function compareEquivalence(original, optimized) {
  const before = runProgram(original);
  const after = runProgram(optimized);

  if (!before.ok || !after.ok) {
    return {
      status: 'error',
      before,
      after,
      diffs: [],
      reason: before.error?.message ?? after.error?.message ?? 'Error de ejecución.'
    };
  }

  if (!before.verifiable || !after.verifiable) {
    return {
      status: 'manual',
      before,
      after,
      diffs: [],
      reason:
        'El programa contiene llamadas o instrucciones opacas; la equivalencia debe revisarse manualmente.'
    };
  }

  const variables = new Set([
    ...observableVariables(original),
    ...observableVariables(optimized)
  ]);
  const diffs = [];

  if (!sameArray(before.output, after.output)) {
    diffs.push({
      kind: 'print',
      original: before.output,
      optimized: after.output
    });
  }

  if (!sameNumber(before.ret, after.ret)) {
    diffs.push({ kind: 'return', original: before.ret, optimized: after.ret });
  }

  for (const name of [...variables].sort()) {
    const originalValue = before.finalState.has(name) ? before.finalState.get(name) : 0;
    const optimizedValue = after.finalState.has(name) ? after.finalState.get(name) : 0;
    if (!sameNumber(originalValue, optimizedValue)) {
      diffs.push({
        kind: 'variable',
        name,
        original: originalValue,
        optimized: optimizedValue
      });
    }
  }

  if (!sameArrays(before.arrays, after.arrays)) {
    diffs.push({
      kind: 'arrays',
      original: before.arrays,
      optimized: after.arrays
    });
  }

  return {
    status: diffs.length === 0 ? 'equivalent' : 'different',
    before,
    after,
    diffs,
    observable: [...variables].sort()
  };
}

export function formatRunValue(value) {
  if (value === undefined) return '—';
  if (Array.isArray(value)) return `[${value.map(formatNumber).join(', ')}]`;
  return formatNumber(value);
}
