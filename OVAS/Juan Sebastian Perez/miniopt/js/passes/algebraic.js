/**
 * MiniOpt — Simplificación algebraica
 *
 * Aplica identidades válidas para números: x+0, x-0, x*1, x*0, x/1, x-x.
 * En TAC leer una variable no produce efectos secundarios, por lo que
 * reemplazar x*0 por 0 es seguro dentro del modelo del lenguaje.
 */

import {
  cloneProgram,
  formatInstruction,
  makeInstruction
} from '../tac/ir.js';
import {
  isOne,
  isZero,
  makeNumber,
  sameOperand
} from './common.js';

function copyOf(instruction, operand) {
  return makeInstruction('copy', instruction.line, {
    dest: instruction.dest,
    src: operand
  });
}

export const algebraic = {
  id: 'algebraic',
  name: 'Simplificación algebraica',
  short: 'AS',
  description: 'Aplica identidades como x + 0 = x y x * 1 = x.',

  run(program) {
    const out = cloneProgram(program);
    const events = [];
    let changed = false;

    for (let index = 0; index < out.length; index += 1) {
      const instruction = out[index];
      if (instruction.kind !== 'assign') continue;

      const { a, b, op, dest } = instruction;
      let replacement = null;
      let rule = null;
      let reason = null;

      if (op === '+') {
        if (isZero(b)) {
          replacement = copyOf(instruction, a);
          rule = 'AS-ADD-0';
          reason = `x + 0 = x`;
        } else if (isZero(a)) {
          replacement = copyOf(instruction, b);
          rule = 'AS-0-ADD';
          reason = `0 + x = x`;
        }
      } else if (op === '-') {
        if (isZero(b)) {
          replacement = copyOf(instruction, a);
          rule = 'AS-SUB-0';
          reason = `x - 0 = x`;
        } else if (sameOperand(a, b)) {
          replacement = copyOf(instruction, makeNumber(0));
          rule = 'AS-SUB-SELF';
          reason = `x - x = 0`;
        }
      } else if (op === '*') {
        if (isOne(b)) {
          replacement = copyOf(instruction, a);
          rule = 'AS-MUL-1';
          reason = `x * 1 = x`;
        } else if (isOne(a)) {
          replacement = copyOf(instruction, b);
          rule = 'AS-1-MUL';
          reason = `1 * x = x`;
        } else if (isZero(b) || isZero(a)) {
          replacement = copyOf(instruction, makeNumber(0));
          rule = 'AS-MUL-0';
          reason = `x * 0 = 0`;
        }
      } else if (op === '/') {
        if (isOne(b)) {
          replacement = copyOf(instruction, a);
          rule = 'AS-DIV-1';
          reason = `x / 1 = x`;
        }
      }

      if (replacement) {
        const before = formatInstruction(instruction);
        out[index] = replacement;
        events.push({
          rule,
          line: instruction.line,
          before,
          after: formatInstruction(replacement),
          reason
        });
        changed = true;
      }
    }

    return { program: out, changed, events, warnings: [] };
  }
};
