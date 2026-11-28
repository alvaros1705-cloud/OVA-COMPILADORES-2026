/**
 * MiniOpt — Propagación de copias
 *
 * Propagación local al bloque básico. Es deliberadamente conservadora:
 * al salir del bloque se descarta toda información, y cualquier llamada o
 * instrucción opaca limpia el mapa.
 */

import { buildCFG } from '../tac/cfg.js';
import {
  cloneOperand,
  cloneProgram,
  formatInstruction
} from '../tac/ir.js';

function substitute(instruction, copies) {
  const keys = ['a', 'b', 'src', 'value', 'index'];
  const used = [];
  for (const key of keys) {
    const operand = instruction[key];
    if (operand && operand.type === 'var' && copies.has(operand.name)) {
      const replacement = copies.get(operand.name);
      instruction[key] = cloneOperand(replacement);
      used.push(`${operand.name} → ${replacement.type === 'num' ? replacement.raw : replacement.name}`);
    }
  }
  return used;
}

export const copyPropagation = {
  id: 'copyProp',
  name: 'Propagación de copias',
  short: 'CPY',
  description: 'Reemplaza variables copiadas por su origen dentro del bloque.',

  run(program) {
    const out = cloneProgram(program);
    const cfg = buildCFG(out);
    const indexOf = new Map(out.map((instruction, index) => [instruction, index]));
    const events = [];
    let changed = false;

    for (const block of cfg.blocks) {
      const copies = new Map();

      for (const instruction of block.instrs) {
        const position = indexOf.get(instruction);
        const before = formatInstruction(instruction);
        const substitutions = substitute(instruction, copies);

        if (instruction.kind === 'copy' && instruction.dest) {
          const source = instruction.src;
          if (source.type === 'var' && copies.has(source.name)) {
            instruction.src = cloneOperand(copies.get(source.name));
          }
          copies.delete(instruction.dest);
          for (const [key, value] of [...copies]) {
            if (value.type === 'var' && value.name === instruction.dest) {
              copies.delete(key);
            }
          }
          copies.set(instruction.dest, cloneOperand(instruction.src));
        } else if (
          instruction.kind === 'assign' ||
          instruction.kind === 'unary' ||
          instruction.kind === 'load' ||
          (instruction.kind === 'call' && instruction.dest)
        ) {
          const dest = instruction.dest;
          copies.delete(dest);
          for (const [key, value] of [...copies]) {
            if (value.type === 'var' && value.name === dest) {
              copies.delete(key);
            }
          }
        }

        if (instruction.kind === 'call' || instruction.kind === 'unknown') {
          copies.clear();
        }

        if (substitutions.length > 0) {
          changed = true;
          events.push({
            rule: 'CPY',
            line: instruction.line,
            before,
            after: formatInstruction(instruction),
            reason: `Copia conocida: ${substitutions.join(', ')}.`
          });
        }

        if (position === undefined) continue;
        out[position] = instruction;
      }
    }

    return { program: out, changed, events, warnings: [] };
  }
};
