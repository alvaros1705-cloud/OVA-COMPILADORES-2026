/**
 * MiniOpt — Coalescencia de temporales
 *
 * Si un temporal se define una vez y se usa exactamente una vez en una
 * copia `x = t`, se renombra la definición a `x` y se elimina la copia.
 * Solo se aplica dentro del mismo bloque y sin instrucciones de control
 * entre la definición y la copia.
 */

import { buildCFG } from '../tac/cfg.js';
import {
  cloneProgram,
  definedVariable,
  formatInstruction,
  isTemp,
  usedOperands
} from '../tac/ir.js';

function countUses(program) {
  const counts = new Map();
  for (const instruction of program) {
    for (const operand of usedOperands(instruction)) {
      if (operand.type === 'var') {
        counts.set(operand.name, (counts.get(operand.name) ?? 0) + 1);
      }
    }
  }
  return counts;
}

const BARRIERS = new Set([
  'label',
  'goto',
  'ifgoto',
  'return',
  'call',
  'unknown'
]);

export const tempCoalescing = {
  id: 'coalesce',
  name: 'Coalescencia de temporales',
  short: 'TC',
  description: 'Reutiliza la variable destino cuando un temporal se usa una sola vez.',

  run(program) {
    const out = cloneProgram(program);
    const events = [];
    let changed = false;

    // Las instrucciones opacas pueden leer variables no visibles: no se
    // arriesga el renombrado en ese caso.
    if (out.some((instruction) => instruction.kind === 'unknown')) {
      return { program: out, changed, events, warnings: [] };
    }

    let guard = 0;
    while (guard < 100) {
      guard += 1;
      const cfg = buildCFG(out);
      const indexOf = new Map(out.map((instruction, index) => [instruction, index]));
      const useCount = countUses(out);
      let applied = false;

      for (const block of cfg.blocks) {
        const instrs = block.instrs;
        for (let index = 0; index < instrs.length; index += 1) {
          const copy = instrs[index];
          if (copy.kind !== 'copy') continue;
          if (copy.src.type !== 'var' || !isTemp(copy.src.name)) continue;

          const temporary = copy.src.name;
          const dest = copy.dest;
          if (temporary === dest) continue;
          if ((useCount.get(temporary) ?? 0) !== 1) continue;

          let definitionIndex = -1;
          for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
            if (definedVariable(instrs[cursor]) === temporary) {
              definitionIndex = cursor;
              break;
            }
          }
          if (definitionIndex < 0) continue;

          let safe = true;
          for (let cursor = definitionIndex + 1; cursor < index; cursor += 1) {
            const between = instrs[cursor];
            if (BARRIERS.has(between.kind)) {
              safe = false;
              break;
            }
            if (definedVariable(between) === dest) {
              safe = false;
              break;
            }
            for (const operand of usedOperands(between)) {
              if (operand.type === 'var' && operand.name === dest) {
                safe = false;
                break;
              }
            }
            if (!safe) break;
          }
          if (!safe) continue;

          const definition = instrs[definitionIndex];
          if (!definedVariable(definition)) continue;

          const beforeDefinition = formatInstruction(definition);
          const beforeCopy = formatInstruction(copy);
          definition.dest = dest;
          const copyPosition = indexOf.get(copy);
          if (copyPosition === undefined) continue;
          out.splice(copyPosition, 1);

          events.push({
            rule: 'TC',
            line: copy.line,
            before: `${beforeDefinition} ; ${beforeCopy}`,
            after: formatInstruction(definition),
            reason: `El temporal ${temporary} se usa una sola vez; se renombra a ${dest} y se elimina la copia.`
          });
          changed = true;
          applied = true;
          break;
        }
        if (applied) break;
      }

      if (!applied) break;
    }

    return { program: out, changed, events, warnings: [] };
  }
};
