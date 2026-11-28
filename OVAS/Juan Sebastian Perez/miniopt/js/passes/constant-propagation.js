/**
 * MiniOpt — Propagación de constantes
 *
 * Análisis de datos hacia adelante sobre el CFG. En cada punto solo se
 * propaga un valor si todas las rutas que llegan coinciden; si una ruta
 * desconoce el valor o hay una redefinición, la variable pasa a "no
 * constante" y no se sustituye. Llamadas y líneas opacas actúan como
 * barreras conservadoras.
 */

import {
  buildCFG
} from '../tac/cfg.js';
import {
  cloneProgram,
  formatInstruction,
  formatNumber,
  num
} from '../tac/ir.js';
import { evaluateBinary, evaluateUnary } from './common.js';

function lookup(state, operand) {
  if (!operand) return undefined;
  if (operand.type === 'num') return operand.value;
  return state.has(operand.name) ? state.get(operand.name) : undefined;
}

function transferInstruction(instruction, state) {
  const out = new Map(state);

  switch (instruction.kind) {
    case 'assign': {
      const left = lookup(state, instruction.a);
      const right = lookup(state, instruction.b);
      if (left !== undefined && right !== undefined) {
        const result = evaluateBinary(instruction.op, left, right);
        if (result.ok) out.set(instruction.dest, result.value);
        else out.delete(instruction.dest);
      } else {
        out.delete(instruction.dest);
      }
      break;
    }
    case 'unary': {
      const value = lookup(state, instruction.a);
      if (value !== undefined) {
        const result = evaluateUnary(instruction.op, value);
        if (result.ok) out.set(instruction.dest, result.value);
        else out.delete(instruction.dest);
      } else {
        out.delete(instruction.dest);
      }
      break;
    }
    case 'copy': {
      const value = lookup(state, instruction.src);
      if (value !== undefined) out.set(instruction.dest, value);
      else out.delete(instruction.dest);
      break;
    }
    case 'load':
      out.delete(instruction.dest);
      break;
    case 'call':
    case 'unknown':
      out.clear();
      break;
    default:
      break;
  }

  return out;
}

function sameMap(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (!b.has(key) || b.get(key) !== value) return false;
  }
  return true;
}

function meet(states) {
  if (states.length === 0) return new Map();
  const result = new Map(states[0]);
  for (let index = 1; index < states.length; index += 1) {
    for (const [key, value] of [...result]) {
      if (!states[index].has(key) || states[index].get(key) !== value) {
        result.delete(key);
      }
    }
  }
  return result;
}

function substituteOperands(instruction, state) {
  const keys = ['a', 'b', 'src', 'value', 'index'];
  const substitutions = [];
  for (const key of keys) {
    const operand = instruction[key];
    if (operand && operand.type === 'var' && state.has(operand.name)) {
      const value = state.get(operand.name);
      instruction[key] = num(value, formatNumber(value));
      substitutions.push(`${operand.name} = ${formatNumber(value)}`);
    }
  }
  return substitutions;
}

export const constantPropagation = {
  id: 'constProp',
  name: 'Propagación de constantes',
  short: 'CP',
  description: 'Sustituye variables por valores conocidos en todas las rutas.',

  run(program) {
    const out = cloneProgram(program);
    const cfg = buildCFG(out);
    const events = [];
    const warnings = [];

    if (cfg.blocks.length === 0) {
      return { program: out, changed: false, events, warnings };
    }

    const predecessors = cfg.blocks.map(() => []);
    cfg.successors.forEach((successors, block) => {
      successors.forEach((successor) => predecessors[successor].push(block));
    });

    const inStates = cfg.blocks.map(() => null);
    const outStates = cfg.blocks.map(() => null);
    inStates[cfg.entry] = new Map();
    const queue = [cfg.entry];
    const queued = new Set(queue);

    while (queue.length > 0) {
      const blockIndex = queue.shift();
      queued.delete(blockIndex);
      const state = inStates[blockIndex];
      if (state === null) continue;

      const outgoing = cfg.blocks[blockIndex].instrs.reduce(
        (current, instruction) => transferInstruction(instruction, current),
        state
      );
      outStates[blockIndex] = outgoing;

      for (const successor of cfg.successors[blockIndex]) {
        if (successor === cfg.entry) continue;
        const incoming = predecessors[successor]
          .map((predecessor) => outStates[predecessor])
          .filter((candidate) => candidate !== null);
        const merged = meet(incoming);
        if (inStates[successor] === null || !sameMap(inStates[successor], merged)) {
          inStates[successor] = merged;
          if (!queued.has(successor)) {
            queue.push(successor);
            queued.add(successor);
          }
        }
      }
    }

    let changed = false;
    for (const block of cfg.blocks) {
      const entryState = inStates[block.index];
      if (entryState === null) continue;
      let state = new Map(entryState);

      for (const instruction of block.instrs) {
        const before = formatInstruction(instruction);
        const substitutions = substituteOperands(instruction, state);
        if (substitutions.length > 0) {
          changed = true;
          events.push({
            rule: 'CP',
            line: instruction.line,
            before,
            after: formatInstruction(instruction),
            reason: `Valores conocidos: ${substitutions.join(', ')}.`
          });
        }
        state = transferInstruction(instruction, state);
      }
    }

    return { program: out, changed, events, warnings };
  }
};
