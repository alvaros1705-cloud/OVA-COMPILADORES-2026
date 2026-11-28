/**
 * MiniOpt — Grafo de flujo de control y análisis de vivacidad
 *
 * El TAC se divide en bloques básicos a partir de etiquetas, saltos y
 * retornos. Sobre ese grafo se ejecutan la propagación de constantes y la
 * eliminación de código muerto.
 */

import {
  definedVariable,
  isNop,
  usedOperands
} from './ir.js';

function codeEntries(program) {
  const entries = [];
  program.forEach((instruction, index) => {
    if (!isNop(instruction)) entries.push({ instruction, index });
  });
  return entries;
}

export function collectVariables(program) {
  const variables = new Set();
  for (const instruction of program) {
    for (const operand of usedOperands(instruction)) {
      if (operand.type === 'var') variables.add(operand.name);
    }
    const dest = definedVariable(instruction);
    if (dest) variables.add(dest);
    if (instruction.kind === 'load' || instruction.kind === 'store') {
      variables.add(instruction.array);
    }
  }
  return variables;
}

/**
 * Construye bloques básicos y aristas.
 * @returns {{blocks: Array, labelToBlock: Map, entry: number, successors: number[][]}}
 */
export function buildCFG(program) {
  const entries = codeEntries(program);
  if (entries.length === 0) {
    return { blocks: [], labelToBlock: new Map(), entry: -1, successors: [] };
  }

  const leaders = new Set([0]);
  entries.forEach((entry, index) => {
    const { instruction } = entry;
    if (instruction.kind === 'label') leaders.add(index);
    if (
      (instruction.kind === 'goto' ||
        instruction.kind === 'ifgoto' ||
        instruction.kind === 'return') &&
      index + 1 < entries.length
    ) {
      leaders.add(index + 1);
    }
  });

  const sorted = [...leaders].sort((a, b) => a - b);
  const blocks = sorted.map((start, blockIndex) => {
    const end = blockIndex + 1 < sorted.length ? sorted[blockIndex + 1] - 1 : entries.length - 1;
    const instrs = entries.slice(start, end + 1).map((entry) => entry.instruction);
    return {
      index: blockIndex,
      start,
      end,
      instrs,
      label: instrs[0]?.kind === 'label' ? instrs[0].name : null
    };
  });

  const labelToBlock = new Map();
  for (const block of blocks) {
    if (block.label) labelToBlock.set(block.label, block.index);
  }

  const successors = blocks.map(() => []);
  blocks.forEach((block, index) => {
    const last = block.instrs[block.instrs.length - 1];
    if (!last) return;
    const fallthrough = index + 1 < blocks.length ? index + 1 : null;

    if (last.kind === 'goto') {
      const target = labelToBlock.get(last.label);
      if (target !== undefined) successors[index].push(target);
      return;
    }
    if (last.kind === 'ifgoto') {
      const target = labelToBlock.get(last.label);
      if (target !== undefined) successors[index].push(target);
      if (fallthrough !== null) successors[index].push(fallthrough);
      return;
    }
    if (last.kind === 'return') return;
    if (fallthrough !== null) successors[index].push(fallthrough);
  });

  // Elimina duplicados conservando el orden.
  for (let index = 0; index < successors.length; index += 1) {
    successors[index] = [...new Set(successors[index])];
  }

  return { blocks, labelToBlock, entry: 0, successors };
}

/** Variables usadas por una instrucción (las opacas usan todas). */
export function instructionUses(instruction, allVariables) {
  if (instruction.kind === 'call' || instruction.kind === 'unknown') {
    return new Set(allVariables);
  }
  const uses = new Set();
  for (const operand of usedOperands(instruction)) {
    if (operand.type === 'var') uses.add(operand.name);
  }
  return uses;
}

export function blockUseDef(block, allVariables) {
  const use = new Set();
  const def = new Set();
  for (const instruction of block.instrs) {
    for (const name of instructionUses(instruction, allVariables)) {
      if (!def.has(name)) use.add(name);
    }
    const dest = definedVariable(instruction);
    if (dest) def.add(dest);
  }
  return { use, def };
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

/**
 * Liveness hacia atrás sobre el CFG.
 * @returns {{liveIn: Set[], liveOut: Set[], use: Set[], def: Set[], allVariables: Set}}
 */
export function computeLiveness(program, cfg) {
  const allVariables = collectVariables(program);
  const count = cfg.blocks.length;
  const use = new Array(count);
  const def = new Array(count);
  for (let index = 0; index < count; index += 1) {
    const result = blockUseDef(cfg.blocks[index], allVariables);
    use[index] = result.use;
    def[index] = result.def;
  }

  const liveIn = Array.from({ length: count }, () => new Set());
  const liveOut = Array.from({ length: count }, () => new Set());
  let changed = true;
  let guard = 0;

  while (changed && guard < 10000) {
    changed = false;
    guard += 1;
    for (let index = count - 1; index >= 0; index -= 1) {
      const out = new Set();
      for (const successor of cfg.successors[index]) {
        for (const name of liveIn[successor]) out.add(name);
      }
      const inside = new Set(use[index]);
      for (const name of out) {
        if (!def[index].has(name)) inside.add(name);
      }
      if (!sameSet(out, liveOut[index]) || !sameSet(inside, liveIn[index])) {
        liveOut[index] = out;
        liveIn[index] = inside;
        changed = true;
      }
    }
  }

  return { liveIn, liveOut, use, def, allVariables };
}
