/**
 * MiniOpt — Utilidades compartidas por los pases.
 */

import { formatNumber, num } from '../tac/ir.js';

export function constantOf(operand) {
  if (!operand || operand.type !== 'num') return null;
  return Number.isFinite(operand.value) ? operand.value : null;
}

export function makeNumber(value) {
  return num(value, formatNumber(value));
}

export function evaluateBinary(op, left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return { ok: false, reason: 'operando no finito' };
  }
  if ((op === '/' || op === '%') && right === 0) {
    return { ok: false, reason: 'división por cero' };
  }

  let value;
  switch (op) {
    case '+':
      value = left + right;
      break;
    case '-':
      value = left - right;
      break;
    case '*':
      value = left * right;
      break;
    case '/':
      value = left / right;
      break;
    case '%':
      value = left % right;
      break;
    case '==':
      value = left === right ? 1 : 0;
      break;
    case '!=':
      value = left !== right ? 1 : 0;
      break;
    case '<':
      value = left < right ? 1 : 0;
      break;
    case '<=':
      value = left <= right ? 1 : 0;
      break;
    case '>':
      value = left > right ? 1 : 0;
      break;
    case '>=':
      value = left >= right ? 1 : 0;
      break;
    default:
      return { ok: false, reason: `operador no soportado (${op})` };
  }

  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'resultado no finito' };
  }
  return { ok: true, value };
}

export function evaluateUnary(op, value) {
  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'operando no finito' };
  }
  switch (op) {
    case '-':
      return { ok: true, value: -value };
    case '+':
      return { ok: true, value };
    case '!':
      return { ok: true, value: value === 0 ? 1 : 0 };
    default:
      return { ok: false, reason: `operador no soportado (${op})` };
  }
}

export function isZero(operand) {
  return operand?.type === 'num' && operand.value === 0;
}

export function isOne(operand) {
  return operand?.type === 'num' && operand.value === 1;
}

export function sameOperand(a, b) {
  if (!a || !b) return false;
  if (a.type === 'num' && b.type === 'num') return a.value === b.value;
  if (a.type === 'var' && b.type === 'var') return a.name === b.name;
  return false;
}

/** Reemplaza un operando dentro de una instrucción ya clonada. */
export function setOperand(instruction, key, operand) {
  if (instruction[key] === undefined) return false;
  instruction[key] = operand;
  return true;
}
