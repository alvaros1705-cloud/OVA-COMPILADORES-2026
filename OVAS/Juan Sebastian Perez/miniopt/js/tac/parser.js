/**
 * MiniOpt — Parser de TAC
 *
 * Acepta el formato infijo que produce la OVA 4 (`t1 = a + b`) y un
 * subconjunto de cuádruplas para importar código de otros generadores.
 * El parser es tolerante: una línea inválida se conserva como instrucción
 * opaca y se reporta con su número de línea, sin detener la herramienta.
 */

import {
  formatNumber,
  isIdentifier,
  makeInstruction,
  num,
  variable
} from './ir.js';

const OPERAND = String.raw`-?(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|[A-Za-z_]\w*`;
const BINARY_RE = new RegExp(
  `^(${OPERAND})\\s*(<=|>=|==|!=|\\+|-|\\*|/|%|<|>)\\s*(${OPERAND})$`
);
const UNARY_RE = new RegExp(`^([-+!])\\s*(${OPERAND})$`);
const OPERAND_RE = new RegExp(`^(${OPERAND})$`);
const RELATIONAL = new Set(['<', '<=', '>', '>=', '==', '!=']);

function parseOperand(text) {
  const value = text.trim();
  const match = OPERAND_RE.exec(value);
  if (!match) return null;
  const token = match[1];
  if (/^-?\d/.test(token)) {
    return num(Number(token), token);
  }
  if (!isIdentifier(token)) return null;
  return variable(token);
}

function stripComment(line) {
  let cut = line.length;
  const slash = line.indexOf('//');
  if (slash >= 0) cut = Math.min(cut, slash);
  const hash = line.indexOf('#');
  if (hash >= 0) cut = Math.min(cut, hash);
  return line.slice(0, cut);
}

function parseCall(rhs) {
  const match = /^call\s+([A-Za-z_]\w*)\s*,\s*(\d+)$/i.exec(rhs);
  if (!match) return null;
  return { fn: match[1], argc: Number(match[2]) };
}

function parseArrayAccess(rhs) {
  const match = /^([A-Za-z_]\w*)\s*\[\s*(.+?)\s*\]$/.exec(rhs);
  if (!match) return null;
  const index = parseOperand(match[2]);
  if (!index) return null;
  return { array: match[1], index };
}

function parseExpression(rhs, line, errors) {
  const direct = parseOperand(rhs);
  if (direct) return { kind: 'operand', operand: direct };

  const binary = BINARY_RE.exec(rhs);
  if (binary) {
    const a = parseOperand(binary[1]);
    const b = parseOperand(binary[3]);
    if (a && b) {
      return { kind: 'binary', op: binary[2], a, b };
    }
  }

  const unary = UNARY_RE.exec(rhs);
  if (unary) {
    const operand = parseOperand(unary[2]);
    if (operand && operand.type === 'var') {
      return { kind: 'unary', op: unary[1], a: operand };
    }
  }

  errors.push({
    line,
    message: `No se reconoce la expresión "${rhs}". Use el formato de tres direcciones (por ejemplo: t1 = a + b).`
  });
  return null;
}

function instructionFromAssignment(lineNumber, dest, rhs, errors) {
  const call = parseCall(rhs);
  if (call) {
    return makeInstruction('call', lineNumber, { dest, ...call });
  }

  const array = parseArrayAccess(rhs);
  if (array) {
    return makeInstruction('load', lineNumber, { dest, ...array });
  }

  const expression = parseExpression(rhs, lineNumber, errors);
  if (!expression) return null;

  if (expression.kind === 'operand') {
    return makeInstruction('copy', lineNumber, { dest, src: expression.operand });
  }
  if (expression.kind === 'unary') {
    return makeInstruction('unary', lineNumber, {
      dest,
      op: expression.op,
      a: expression.a
    });
  }
  return makeInstruction('assign', lineNumber, {
    dest,
    op: expression.op,
    a: expression.a,
    b: expression.b
  });
}

/**
 * Convierte una línea TAC en una instrucción.
 * @returns {{instruction: object|null, errors: Array}}
 */
export function parseLine(rawLine, lineNumber) {
  const errors = [];
  const raw = rawLine.replace(/\r$/, '');
  const withoutComment = stripComment(raw).trim();

  if (withoutComment === '') {
    return { instruction: makeInstruction('nop', lineNumber, { raw }), errors };
  }

  let match = /^([A-Za-z_]\w*)\s*:\s*$/.exec(withoutComment);
  if (match) {
    return {
      instruction: makeInstruction('label', lineNumber, { name: match[1] }),
      errors
    };
  }

  match = /^goto\s+([A-Za-z_]\w*)$/i.exec(withoutComment);
  if (match) {
    return {
      instruction: makeInstruction('goto', lineNumber, { label: match[1] }),
      errors
    };
  }

  match = /^ifFalse\s+(.+?)\s+goto\s+([A-Za-z_]\w*)$/i.exec(withoutComment);
  if (match) {
    const a = parseOperand(match[1]);
    if (a) {
      return {
        instruction: makeInstruction('ifgoto', lineNumber, {
          mode: 'ifFalse',
          a,
          label: match[2]
        }),
        errors
      };
    }
  }

  match = /^if\s+(.+?)\s+goto\s+([A-Za-z_]\w*)$/i.exec(withoutComment);
  if (match) {
    const condition = BINARY_RE.exec(match[1].trim());
    if (condition && RELATIONAL.has(condition[2])) {
      const a = parseOperand(condition[1]);
      const b = parseOperand(condition[3]);
      if (a && b) {
        return {
          instruction: makeInstruction('ifgoto', lineNumber, {
            mode: 'if',
            a,
            op: condition[2],
            b,
            label: match[2]
          }),
          errors
        };
      }
    }
    errors.push({
      line: lineNumber,
      message: 'Condición inválida. Use una comparación relacional, por ejemplo: if a < b goto L1.'
    });
    return {
      instruction: makeInstruction('unknown', lineNumber, { raw: withoutComment }),
      errors
    };
  }

  match = /^print\s+(.+)$/i.exec(withoutComment);
  if (match) {
    const value = parseOperand(match[1]);
    if (value) {
      return {
        instruction: makeInstruction('print', lineNumber, { value }),
        errors
      };
    }
  }

  match = /^return(?:\s+(.+))?$/i.exec(withoutComment);
  if (match) {
    const value = match[1] ? parseOperand(match[1]) : null;
    if (match[1] && !value) {
      errors.push({ line: lineNumber, message: 'Operando inválido en return.' });
      return {
        instruction: makeInstruction('unknown', lineNumber, { raw: withoutComment }),
        errors
      };
    }
    return {
      instruction: makeInstruction('return', lineNumber, { value }),
      errors
    };
  }

  match = /^param\s+(.+)$/i.exec(withoutComment);
  if (match) {
    const value = parseOperand(match[1]);
    if (value) {
      return {
        instruction: makeInstruction('param', lineNumber, { value }),
        errors
      };
    }
  }

  const bareCall = parseCall(withoutComment);
  if (bareCall) {
    return {
      instruction: makeInstruction('call', lineNumber, { dest: null, ...bareCall }),
      errors
    };
  }

  match = /^([A-Za-z_]\w*)\s*\[\s*(.+?)\s*\]\s*=\s*(.+)$/.exec(withoutComment);
  if (match) {
    const index = parseOperand(match[2]);
    const value = parseOperand(match[3]);
    if (index && value) {
      return {
        instruction: makeInstruction('store', lineNumber, {
          array: match[1],
          index,
          value
        }),
        errors
      };
    }
  }

  match = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(withoutComment);
  if (match) {
    const instruction = instructionFromAssignment(
      lineNumber,
      match[1],
      match[2].trim(),
      errors
    );
    if (instruction) return { instruction, errors };
    return {
      instruction: makeInstruction('unknown', lineNumber, { raw: withoutComment }),
      errors
    };
  }

  errors.push({
    line: lineNumber,
    message: `Instrucción no reconocida: "${withoutComment}".`
  });
  return {
    instruction: makeInstruction('unknown', lineNumber, { raw: withoutComment }),
    errors
  };
}

/**
 * Parsea un programa completo.
 * @returns {{program: Array, errors: Array, warnings: Array}}
 */
export function parseProgram(source) {
  const lines = String(source ?? '').split('\n');
  const program = [];
  const errors = [];
  const warnings = [];

  lines.forEach((line, index) => {
    const result = parseLine(line, index + 1);
    program.push(result.instruction);
    errors.push(...result.errors);
  });

  // Normaliza números escritos como 5.0 para que el formato sea estable.
  for (const instruction of program) {
    for (const key of ['a', 'b', 'src', 'value', 'index']) {
      const operand = instruction[key];
      if (operand && operand.type === 'num') {
        operand.raw = formatNumber(operand.value);
      }
    }
  }

  const labels = new Set();
  const referenced = new Set();
  for (const instruction of program) {
    if (instruction.kind === 'label') labels.add(instruction.name);
    if (instruction.kind === 'goto') referenced.add(instruction.label);
    if (instruction.kind === 'ifgoto') referenced.add(instruction.label);
  }
  for (const label of referenced) {
    if (!labels.has(label)) {
      warnings.push({
        line: null,
        message: `La etiqueta "${label}" se usa pero no está definida.`
      });
    }
  }

  return { program, errors, warnings };
}
