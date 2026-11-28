/**
 * MiniOpt — Representación intermedia de TAC
 *
 * Cada instrucción conserva la línea de origen para poder explicar cada
 * transformación en la interfaz. Las instrucciones son objetos planos y
 * fáciles de clonar; no se usan clases para mantener el motor portable.
 */

export const TEMP_PATTERN = /^t\d+$/;

export function isTemp(name) {
  return typeof name === 'string' && TEMP_PATTERN.test(name);
}

export function isIdentifier(name) {
  return typeof name === 'string' && /^[A-Za-z_]\w*$/.test(name);
}

/** Operando numérico. `raw` conserva la forma escrita (p. ej. 10.0). */
export function num(value, raw = String(value)) {
  return { type: 'num', value, raw };
}

/** Operando variable. */
export function variable(name) {
  return { type: 'var', name };
}

export function cloneOperand(operand) {
  if (!operand) return operand;
  return operand.type === 'num'
    ? { type: 'num', value: operand.value, raw: operand.raw }
    : { type: 'var', name: operand.name };
}

export function operandToString(operand) {
  if (!operand) return '';
  return operand.type === 'num' ? operand.raw : operand.name;
}

export function cloneInstruction(instruction) {
  const copy = { ...instruction };
  if (instruction.dest !== undefined) copy.dest = instruction.dest;
  if (instruction.a) copy.a = cloneOperand(instruction.a);
  if (instruction.b) copy.b = cloneOperand(instruction.b);
  if (instruction.src) copy.src = cloneOperand(instruction.src);
  if (instruction.value) copy.value = cloneOperand(instruction.value);
  if (instruction.index) copy.index = cloneOperand(instruction.index);
  return copy;
}

export function cloneProgram(program) {
  return program.map(cloneInstruction);
}

/** Instrucciones que no representan código ejecutable. */
export function isNop(instruction) {
  return instruction.kind === 'nop';
}

/** ¿La instrucción puede leerse sin efectos secundarios? */
export function isPure(instruction) {
  return (
    instruction.kind === 'assign' ||
    instruction.kind === 'unary' ||
    instruction.kind === 'copy' ||
    instruction.kind === 'load'
  );
}

/** Variable definida por la instrucción, si existe. */
export function definedVariable(instruction) {
  if (
    instruction.kind === 'assign' ||
    instruction.kind === 'unary' ||
    instruction.kind === 'copy' ||
    instruction.kind === 'load' ||
    (instruction.kind === 'call' && instruction.dest)
  ) {
    return instruction.dest;
  }
  return null;
}

/** Operandos leídos por la instrucción. */
export function usedOperands(instruction) {
  switch (instruction.kind) {
    case 'assign':
      return [instruction.a, instruction.b].filter(Boolean);
    case 'unary':
      return [instruction.a].filter(Boolean);
    case 'copy':
      return [instruction.src].filter(Boolean);
    case 'load':
      return [instruction.array, instruction.index].filter(Boolean);
    case 'store':
      return [instruction.array, instruction.index, instruction.value].filter(Boolean);
    case 'ifgoto':
      return [instruction.a, instruction.b].filter(Boolean);
    case 'print':
      return [instruction.value].filter(Boolean);
    case 'return':
      return [instruction.value].filter(Boolean);
    case 'param':
      return [instruction.value].filter(Boolean);
    default:
      return [];
  }
}

/** ¿La instrucción tiene efectos observables fuera del estado de variables? */
export function hasSideEffects(instruction) {
  return (
    instruction.kind === 'store' ||
    instruction.kind === 'call' ||
    instruction.kind === 'param' ||
    instruction.kind === 'print' ||
    instruction.kind === 'return' ||
    instruction.kind === 'goto' ||
    instruction.kind === 'ifgoto' ||
    instruction.kind === 'label' ||
    instruction.kind === 'unknown'
  );
}

export function formatNumber(value) {
  if (Object.is(value, -0)) return '0';
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value) && Math.abs(value) < 1e21) return String(value);
  return String(value);
}

export function formatInstruction(instruction) {
  switch (instruction.kind) {
    case 'assign':
      return `${instruction.dest} = ${operandToString(instruction.a)} ${instruction.op} ${operandToString(instruction.b)}`;
    case 'unary':
      return `${instruction.dest} = ${instruction.op}${operandToString(instruction.a)}`;
    case 'copy':
      return `${instruction.dest} = ${operandToString(instruction.src)}`;
    case 'load':
      return `${instruction.dest} = ${instruction.array}[${operandToString(instruction.index)}]`;
    case 'store':
      return `${instruction.array}[${operandToString(instruction.index)}] = ${operandToString(instruction.value)}`;
    case 'label':
      return `${instruction.name}:`;
    case 'goto':
      return `goto ${instruction.label}`;
    case 'ifgoto':
      return instruction.mode === 'ifFalse'
        ? `ifFalse ${operandToString(instruction.a)} goto ${instruction.label}`
        : `if ${operandToString(instruction.a)} ${instruction.op} ${operandToString(instruction.b)} goto ${instruction.label}`;
    case 'print':
      return `print ${operandToString(instruction.value)}`;
    case 'return':
      return instruction.value ? `return ${operandToString(instruction.value)}` : 'return';
    case 'param':
      return `param ${operandToString(instruction.value)}`;
    case 'call':
      return instruction.dest
        ? `${instruction.dest} = call ${instruction.fn}, ${instruction.argc}`
        : `call ${instruction.fn}, ${instruction.argc}`;
    case 'nop':
      return instruction.raw ?? '';
    case 'unknown':
      return instruction.raw ?? '';
    default:
      return instruction.raw ?? '';
  }
}

export function formatProgram(program) {
  return program.map(formatInstruction).join('\n');
}

/**
 * Crea una instrucción nueva conservando la línea de origen. Evita que los
 * pases tengan que recordar todos los campos de cada variante.
 */
export function makeInstruction(kind, line, fields = {}) {
  return { kind, line, ...fields };
}
