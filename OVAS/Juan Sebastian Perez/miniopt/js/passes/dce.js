/**
 * MiniOpt — Eliminación de código muerto
 *
 * Usa vivacidad sobre el CFG. Solo elimina instrucciones puras cuyo destino
 * no está vivo. Por defecto protege las variables de usuario (se consideran
 * salidas observables del programa) y elimina temporales muertos; el modo
 * agresivo permite eliminar también variables de usuario muertas.
 */

import {
  buildCFG,
  computeLiveness,
  instructionUses
} from '../tac/cfg.js';
import {
  cloneProgram,
  definedVariable,
  formatInstruction,
  isPure,
  isTemp
} from '../tac/ir.js';

export const deadCodeElimination = {
  id: 'dce',
  name: 'Eliminación de código muerto',
  short: 'DCE',
  description: 'Retira asignaciones puras cuyo resultado no se vuelve a usar.',

  run(program, options = {}) {
    const aggressive = options.aggressiveDce === true;
    const out = cloneProgram(program);
    const cfg = buildCFG(out);
    const liveness = computeLiveness(out, cfg);
    const indexOf = new Map(out.map((instruction, index) => [instruction, index]));
    const removed = new Set();
    const events = [];

    for (const block of cfg.blocks) {
      const live = new Set(liveness.liveOut[block.index]);

      for (let index = block.instrs.length - 1; index >= 0; index -= 1) {
        const instruction = block.instrs[index];
        const dest = definedVariable(instruction);

        if (
          isPure(instruction) &&
          dest &&
          !live.has(dest) &&
          (isTemp(dest) || aggressive)
        ) {
          const position = indexOf.get(instruction);
          if (position !== undefined) removed.add(position);
          events.push({
            rule: 'DCE',
            line: instruction.line,
            before: formatInstruction(instruction),
            after: '(eliminada)',
            reason: isTemp(dest)
              ? `El temporal ${dest} no se usa después y la instrucción no tiene efectos secundarios.`
              : `La variable ${dest} no se usa después y la instrucción no tiene efectos secundarios.`
          });
          continue;
        }

        if (dest) live.delete(dest);
        for (const name of instructionUses(instruction, liveness.allVariables)) {
          live.add(name);
        }
      }
    }

    const result = out.filter((_, index) => !removed.has(index));
    return {
      program: result,
      changed: removed.size > 0,
      events,
      warnings: []
    };
  }
};
