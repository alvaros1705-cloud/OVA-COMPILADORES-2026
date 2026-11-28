/**
 * MiniOpt — Plegado de constantes
 *
 * Resuelve operaciones cuyos dos operandos son literales. No pliega
 * divisiones o módulos por cero, ni resultados no finitos.
 */

import {
  cloneProgram,
  formatInstruction,
  makeInstruction
} from '../tac/ir.js';
import {
  evaluateBinary,
  evaluateUnary,
  makeNumber
} from './common.js';

export const folding = {
  id: 'folding',
  name: 'Plegado de constantes',
  short: 'CF',
  description: 'Evalúa operaciones con operandos literales.',

  run(program) {
    const out = cloneProgram(program);
    const events = [];
    const warnings = [];
    let changed = false;

    for (let index = 0; index < out.length; index += 1) {
      const instruction = out[index];
      const before = formatInstruction(instruction);

      if (
        instruction.kind === 'assign' &&
        instruction.a.type === 'num' &&
        instruction.b.type === 'num'
      ) {
        const result = evaluateBinary(
          instruction.op,
          instruction.a.value,
          instruction.b.value
        );
        if (result.ok) {
          out[index] = makeInstruction('copy', instruction.line, {
            dest: instruction.dest,
            src: makeNumber(result.value)
          });
          events.push({
            rule: 'CF',
            line: instruction.line,
            before,
            after: formatInstruction(out[index]),
            reason: `${instruction.a.raw} ${instruction.op} ${instruction.b.raw} = ${result.value}`
          });
          changed = true;
        } else {
          warnings.push({
            line: instruction.line,
            message: `No se plegó "${before}": ${result.reason}.`
          });
        }
      } else if (instruction.kind === 'unary' && instruction.a.type === 'num') {
        const result = evaluateUnary(instruction.op, instruction.a.value);
        if (result.ok) {
          out[index] = makeInstruction('copy', instruction.line, {
            dest: instruction.dest,
            src: makeNumber(result.value)
          });
          events.push({
            rule: 'CF',
            line: instruction.line,
            before,
            after: formatInstruction(out[index]),
            reason: `${instruction.op}${instruction.a.raw} = ${result.value}`
          });
          changed = true;
        } else {
          warnings.push({
            line: instruction.line,
            message: `No se plegó "${before}": ${result.reason}.`
          });
        }
      }
    }

    return { program: out, changed, events, warnings };
  }
};
