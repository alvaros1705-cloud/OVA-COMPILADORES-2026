/**
 * ============================================================================
 * MiniOpt — Motor de Análisis, Optimización y Verificación de Código TAC
 * Universidad Simón Bolívar | Ingeniería de Sistemas | Teoría de Compiladores
 * Reto 6: Optimizador de Código Intermedio de Tres Direcciones (TAC)
 * ============================================================================
 *
 * Compatible con navegador (window.MiniOptEngine) y ES Modules / Node.js tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MiniOptEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const NUMBER_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;
  const TEMP_RE = /^(?:t\d+|_t\d+|tmp\d+)$/i;

  const RESERVED_KEYWORDS = new Set([
    'if', 'iffalse', 'goto', 'print', 'write', 'output',
    'read', 'input', 'param', 'call', 'return', 'true', 'false'
  ]);

  const BINARY_OPS = new Set([
    '+', '-', '*', '/', '%',
    '==', '!=', '<=', '>=', '<', '>',
    '&&', '||'
  ]);

  const UNARY_OPS = new Set(['-', '+', '!']);

  const DEFAULT_OPTIONS = {
    constantFolding: true,
    constantPropagation: true,
    algebraicSimplification: true,
    redundantTempElimination: true,
    deadCodeElimination: true,
    maxIterations: 25
  };

  // ── Utilidades de tipos y formato ─────────────────────────────────────────

  function isNumberLiteral(tok) {
    return typeof tok === 'string' && NUMBER_RE.test(tok);
  }

  function isBoolLiteral(tok) {
    return tok === 'true' || tok === 'false';
  }

  function isConstant(tok) {
    return isNumberLiteral(tok) || isBoolLiteral(tok);
  }

  function isValidIdentifier(tok) {
    return typeof tok === 'string' && IDENT_RE.test(tok) && !RESERVED_KEYWORDS.has(tok.toLowerCase());
  }

  function isTempVar(name) {
    return typeof name === 'string' && TEMP_RE.test(name);
  }

  function parseConstValue(tok) {
    if (tok === 'true') return true;
    if (tok === 'false') return false;
    return Number(tok);
  }

  function formatConstValue(val) {
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (Object.is(val, -0)) return '0';
    if (Number.isInteger(val)) return String(val);
    // Evitar artefactos de punto flotante como 0.30000000000000004
    const rounded = Number(val.toPrecision(12));
    return String(rounded);
  }

  function isZero(tok) {
    return isNumberLiteral(tok) && Number(tok) === 0;
  }

  function isOne(tok) {
    return isNumberLiteral(tok) && Number(tok) === 1;
  }

  // ── Formateador de instrucciones TAC ──────────────────────────────────────

  function formatInstruction(inst) {
    switch (inst.kind) {
      case 'binary':
        return `${inst.dest} = ${inst.arg1} ${inst.op} ${inst.arg2}`;
      case 'unary':
        return `${inst.dest} = ${inst.op}${inst.arg1}`;
      case 'copy':
        return `${inst.dest} = ${inst.arg1}`;
      case 'label':
        return `${inst.label}:`;
      case 'goto':
        return `goto ${inst.target}`;
      case 'ifgoto':
        if (inst.op) {
          return `${inst.negated ? 'ifFalse' : 'if'} ${inst.arg1} ${inst.op} ${inst.arg2} goto ${inst.target}`;
        }
        return `${inst.negated ? 'ifFalse' : 'if'} ${inst.arg1} goto ${inst.target}`;
      case 'print':
        return `${inst.verb || 'print'} ${inst.arg1}`;
      case 'read':
        return `${inst.verb || 'read'} ${inst.dest}`;
      case 'param':
        return `param ${inst.arg1}`;
      case 'call': {
        const rhs = inst.rawCall
          ? inst.rawCall
          : (inst.argc !== null && inst.argc !== undefined
            ? `call ${inst.func}, ${inst.argc}`
            : `call ${inst.func}`);
        return inst.dest ? `${inst.dest} = ${rhs}` : rhs;
      }
      case 'return':
        return inst.arg1 !== null && inst.arg1 !== undefined
          ? `return ${inst.arg1}`
          : 'return';
      default:
        return inst.raw || '';
    }
  }

  function cloneInst(inst) {
    return Object.assign({}, inst, {
      callArgs: inst.callArgs ? inst.callArgs.slice() : undefined
    });
  }

  function cloneProgram(list) {
    return list.map(cloneInst);
  }

  // ── Tokenización ligera de expresiones ────────────────────────────────────

  function stripComment(line) {
    let out = line;
    const slashIdx = out.indexOf('//');
    if (slashIdx !== -1) out = out.slice(0, slashIdx);
    const hashIdx = out.indexOf('#');
    if (hashIdx !== -1) out = out.slice(0, hashIdx);
    return out;
  }

  function tokenizeExpr(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.trim();
    while (i < s.length) {
      if (/\s/.test(s[i])) {
        i++;
        continue;
      }
      // Operadores de 2 caracteres
      const two = s.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
        tokens.push(two);
        i += 2;
        continue;
      }
      // Números (incluye decimales)
      const numMatch = s.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
      if (numMatch) {
        tokens.push(numMatch[0]);
        i += numMatch[0].length;
        continue;
      }
      // Identificadores
      const idMatch = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (idMatch) {
        tokens.push(idMatch[0]);
        i += idMatch[0].length;
        continue;
      }
      // Operadores de 1 carácter
      if ('+-*/%<>!(),'.includes(s[i])) {
        tokens.push(s[i]);
        i++;
        continue;
      }
      return { error: `Carácter no reconocido '${s[i]}'` };
    }

    // Unir signo unario negativo/positivo en literales numéricos cuando corresponde
    // Ej: ['-', '5'] -> ['-5'] si está al inicio o después de un operador binario
    const merged = [];
    for (let k = 0; k < tokens.length; k++) {
      const curr = tokens[k];
      const prev = merged.length > 0 ? merged[merged.length - 1] : null;
      const next = k + 1 < tokens.length ? tokens[k + 1] : null;
      if (
        (curr === '-' || curr === '+') &&
        next !== null &&
        /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(next) &&
        (prev === null || BINARY_OPS.has(prev) || prev === '(' || prev === ',')
      ) {
        merged.push(curr === '-' ? `-${next}` : next);
        k++;
      } else {
        merged.push(curr);
      }
    }

    return { tokens: merged };
  }

  function isValidOperand(tok) {
    return isConstant(tok) || isValidIdentifier(tok);
  }

  // ── Parser TAC ────────────────────────────────────────────────────────────

  function parseTAC(source) {
    if (typeof source !== 'string' || !source.trim()) {
      return {
        instructions: [],
        errors: [{
          line: 1,
          raw: '',
          message: 'La entrada TAC está vacía. Ingresa al menos una instrucción válida (por ejemplo: t1 = 5 + 3).'
        }]
      };
    }

    const instructions = [];
    const errors = [];
    const physicalLines = source.replace(/\r\n/g, '\n').split('\n');
    let nextId = 1;

    for (let lineIdx = 0; lineIdx < physicalLines.length; lineIdx++) {
      const lineNum = lineIdx + 1;
      const cleanLine = stripComment(physicalLines[lineIdx]).trim();
      if (!cleanLine) continue;

      // Permitir múltiples instrucciones separadas por ';' en la misma línea
      const statements = cleanLine.split(';').map(s => s.trim()).filter(Boolean);

      for (const stmt of statements) {
        const parsed = parseStatement(stmt, lineNum, nextId);
        if (parsed.error) {
          errors.push({
            line: lineNum,
            raw: stmt,
            message: parsed.error
          });
        } else if (parsed.instruction) {
          instructions.push(parsed.instruction);
          nextId++;
        }
      }
    }

    if (instructions.length === 0 && errors.length === 0) {
      errors.push({
        line: 1,
        raw: '',
        message: 'Solo se encontraron comentarios o líneas en blanco. Ingresa instrucciones TAC ejecutables.'
      });
    }

    // Validación semántica ligera de etiquetas referenciadas
    const definedLabels = new Set(
      instructions.filter(i => i.kind === 'label').map(i => i.label)
    );
    for (const inst of instructions) {
      if ((inst.kind === 'goto' || inst.kind === 'ifgoto') && !definedLabels.has(inst.target)) {
        errors.push({
          line: inst.line,
          raw: formatInstruction(inst),
          message: `La etiqueta de destino '${inst.target}' no está definida en el programa.`
        });
      }
    }

    return { instructions, errors };
  }

  function parseStatement(stmt, line, id) {
    // 1. Etiqueta: L1:
    const labelMatch = stmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:$/);
    if (labelMatch) {
      const label = labelMatch[1];
      if (RESERVED_KEYWORDS.has(label.toLowerCase())) {
        return { error: `Nombre de etiqueta inválido '${label}': es una palabra reservada.` };
      }
      return {
        instruction: { id, line, kind: 'label', label, sideEffect: true }
      };
    }

    // 2. Salto incondicional: goto L1
    const gotoMatch = stmt.match(/^goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (gotoMatch) {
      return {
        instruction: { id, line, kind: 'goto', target: gotoMatch[1], sideEffect: true }
      };
    }

    // 3. Salto condicional: if / ifFalse <cond> goto <label>
    const ifMatch = stmt.match(/^(ifFalse|if)\s+(.+?)\s+goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifMatch) {
      const negated = ifMatch[1].toLowerCase() === 'iffalse';
      const condRaw = ifMatch[2].trim();
      const target = ifMatch[3];
      const tokRes = tokenizeExpr(condRaw);
      if (tokRes.error) return { error: `Condición inválida en salto condicional: ${tokRes.error}.` };
      const toks = tokRes.tokens;
      if (toks.length === 1 && isValidOperand(toks[0])) {
        return {
          instruction: {
            id, line, kind: 'ifgoto', negated,
            arg1: toks[0], op: null, arg2: null, target, sideEffect: true
          }
        };
      }
      if (toks.length === 3 && isValidOperand(toks[0]) && BINARY_OPS.has(toks[1]) && isValidOperand(toks[2])) {
        return {
          instruction: {
            id, line, kind: 'ifgoto', negated,
            arg1: toks[0], op: toks[1], arg2: toks[2], target, sideEffect: true
          }
        };
      }
      return {
        error: `Condición mal formada '${condRaw}'. Usa 'if x goto L1' o 'if a < b goto L1'.`
      };
    }

    // 4. print / write / output <expr>
    const printMatch = stmt.match(/^(print|write|output)\s+(.+)$/i);
    if (printMatch) {
      const verb = printMatch[1].toLowerCase();
      const arg = printMatch[2].trim();
      if (!isValidOperand(arg)) {
        return { error: `Operando inválido '${arg}' en instrucción '${verb}'.` };
      }
      return {
        instruction: { id, line, kind: 'print', verb, arg1: arg, sideEffect: true }
      };
    }

    // 5. read / input <var>
    const readMatch = stmt.match(/^(read|input)\s+(.+)$/i);
    if (readMatch) {
      const verb = readMatch[1].toLowerCase();
      const dest = readMatch[2].trim();
      if (!isValidIdentifier(dest)) {
        return { error: `Variable destino inválida '${dest}' en instrucción '${verb}'.` };
      }
      return {
        instruction: { id, line, kind: 'read', verb, dest, sideEffect: true }
      };
    }

    // 6. param <operand>
    const paramMatch = stmt.match(/^param\s+(.+)$/i);
    if (paramMatch) {
      const arg = paramMatch[1].trim();
      if (!isValidOperand(arg)) {
        return { error: `Operando inválido '${arg}' en instrucción 'param'.` };
      }
      return {
        instruction: { id, line, kind: 'param', arg1: arg, sideEffect: true }
      };
    }

    // 7. return [operand]
    const returnMatch = stmt.match(/^return(?:\s+(.+))?$/i);
    if (returnMatch) {
      const arg = returnMatch[1] ? returnMatch[1].trim() : null;
      if (arg !== null && !isValidOperand(arg)) {
        return { error: `Operando inválido '${arg}' en instrucción 'return'.` };
      }
      return {
        instruction: { id, line, kind: 'return', arg1: arg, sideEffect: true }
      };
    }

    // 8. call sin destino: call func [, n]
    const bareCallMatch = stmt.match(/^call\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*(\d+))?$/i);
    if (bareCallMatch) {
      return {
        instruction: {
          id, line, kind: 'call', dest: null,
          func: bareCallMatch[1],
          argc: bareCallMatch[2] !== undefined ? Number(bareCallMatch[2]) : null,
          callArgs: [],
          sideEffect: true
        }
      };
    }

    // 9. Llamada estilo función sin asignación: func(a, b)
    const bareFnMatch = stmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)$/);
    if (bareFnMatch && !RESERVED_KEYWORDS.has(bareFnMatch[1].toLowerCase())) {
      const argsList = bareFnMatch[2].trim()
        ? bareFnMatch[2].split(',').map(a => a.trim())
        : [];
      for (const a of argsList) {
        if (!isValidOperand(a)) {
          return { error: `Argumento inválido '${a}' en llamada a '${bareFnMatch[1]}'.` };
        }
      }
      return {
        instruction: {
          id, line, kind: 'call', dest: null,
          func: bareFnMatch[1],
          argc: argsList.length,
          callArgs: argsList,
          rawCall: `${bareFnMatch[1]}(${argsList.join(', ')})`,
          sideEffect: true
        }
      };
    }

    // 10. Asignaciones: dest = rhs
    // Evitar confundir '==' o '!=' sin '=' previo
    const eqIdx = findAssignmentEquals(stmt);
    if (eqIdx === -1) {
      return {
        error: `Instrucción TAC no reconocida: '${stmt}'. Formatos válidos: 'dest = a op b', 'dest = a', 'L1:', 'goto L1', 'if a < b goto L1', 'print x', 'call f, n', 'return x'.`
      };
    }

    const lhs = stmt.slice(0, eqIdx).trim();
    const rhs = stmt.slice(eqIdx + 1).trim();

    if (!lhs) {
      return { error: `Falta la variable destino a la izquierda de '=' en '${stmt}'.` };
    }
    if (!isValidIdentifier(lhs)) {
      return { error: `Identificador de destino inválido '${lhs}'. Debe iniciar con letra o '_' y no ser palabra reservada.` };
    }
    if (!rhs) {
      return { error: `Expresión incompleta: falta el valor a la derecha de '=' en '${stmt}'.` };
    }

    // 10a. dest = call func [, n]
    const rhsCallMatch = rhs.match(/^call\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*(\d+))?$/i);
    if (rhsCallMatch) {
      return {
        instruction: {
          id, line, kind: 'call', dest: lhs,
          func: rhsCallMatch[1],
          argc: rhsCallMatch[2] !== undefined ? Number(rhsCallMatch[2]) : null,
          callArgs: [],
          sideEffect: true
        }
      };
    }

    // 10b. dest = func(a, b)
    const rhsFnMatch = rhs.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)$/);
    if (rhsFnMatch && !RESERVED_KEYWORDS.has(rhsFnMatch[1].toLowerCase())) {
      const argsList = rhsFnMatch[2].trim()
        ? rhsFnMatch[2].split(',').map(a => a.trim())
        : [];
      for (const a of argsList) {
        if (!isValidOperand(a)) {
          return { error: `Argumento inválido '${a}' en llamada a '${rhsFnMatch[1]}'.` };
        }
      }
      return {
        instruction: {
          id, line, kind: 'call', dest: lhs,
          func: rhsFnMatch[1],
          argc: argsList.length,
          callArgs: argsList,
          rawCall: `${rhsFnMatch[1]}(${argsList.join(', ')})`,
          sideEffect: true
        }
      };
    }

    // 10c. Expresión TAC estándar: copia, unaria o binaria (máximo 3 direcciones)
    const tokRes = tokenizeExpr(rhs);
    if (tokRes.error) {
      return { error: `${tokRes.error} en '${stmt}'.` };
    }
    const toks = tokRes.tokens;

    // Copia simple: dest = operand
    if (toks.length === 1) {
      if (!isValidOperand(toks[0])) {
        return { error: `Operando inválido '${toks[0]}' en '${stmt}'.` };
      }
      return {
        instruction: { id, line, kind: 'copy', dest: lhs, arg1: toks[0], sideEffect: false }
      };
    }

    // Unaria: dest = op operand
    if (toks.length === 2) {
      if (UNARY_OPS.has(toks[0]) && isValidOperand(toks[1])) {
        return {
          instruction: { id, line, kind: 'unary', dest: lhs, op: toks[0], arg1: toks[1], sideEffect: false }
        };
      }
      return {
        error: `Expresión incompleta o mal formada '${rhs}' en '${stmt}'. Se esperaba 'op x' o 'a op b'.`
      };
    }

    // Binaria: dest = arg1 op arg2
    if (toks.length === 3) {
      if (isValidOperand(toks[0]) && BINARY_OPS.has(toks[1]) && isValidOperand(toks[2])) {
        return {
          instruction: {
            id, line, kind: 'binary', dest: lhs,
            arg1: toks[0], op: toks[1], arg2: toks[2],
            sideEffect: false
          }
        };
      }
      return {
        error: `Expresión binaria inválida '${rhs}' en '${stmt}'. Operadores permitidos: +, -, *, /, %, ==, !=, <, <=, >, >=, &&, ||.`
      };
    }

    return {
      error: `La instrucción '${stmt}' excede el formato de Código de Tres Direcciones (máximo una operación por instrucción). Descompón la expresión usando temporales.`
    };
  }

  function findAssignmentEquals(stmt) {
    for (let i = 0; i < stmt.length; i++) {
      if (stmt[i] === '=') {
        const prev = i > 0 ? stmt[i - 1] : '';
        const next = i + 1 < stmt.length ? stmt[i + 1] : '';
        if (prev !== '!' && prev !== '<' && prev !== '>' && prev !== '=' && next !== '=') {
          return i;
        }
      }
    }
    return -1;
  }

  // ── Análisis de variables leídas / escritas ───────────────────────────────

  function getUsedVars(inst) {
    const vars = [];
    const add = (tok) => {
      if (tok && isValidIdentifier(tok)) vars.push(tok);
    };
    switch (inst.kind) {
      case 'binary':
        add(inst.arg1);
        add(inst.arg2);
        break;
      case 'unary':
      case 'copy':
      case 'print':
      case 'param':
      case 'return':
        add(inst.arg1);
        break;
      case 'ifgoto':
        add(inst.arg1);
        add(inst.arg2);
        break;
      case 'call':
        if (inst.callArgs) inst.callArgs.forEach(add);
        break;
      default:
        break;
    }
    return vars;
  }

  function getDefinedVar(inst) {
    if (inst.dest && isValidIdentifier(inst.dest)) return inst.dest;
    return null;
  }

  // ── Bloques Básicos (para seguridad en control de flujo) ──────────────────

  function splitIntoBasicBlocks(instructions) {
    const blocks = [];
    let current = [];
    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.kind === 'label') {
        if (current.length > 0) {
          blocks.push(current);
          current = [];
        }
        current.push(i);
      } else {
        current.push(i);
        if (inst.kind === 'goto' || inst.kind === 'ifgoto' || inst.kind === 'return') {
          blocks.push(current);
          current = [];
        }
      }
    }
    if (current.length > 0) blocks.push(current);
    return blocks;
  }

  // ── Evaluación segura de operaciones constantes ───────────────────────────

  function evaluateBinaryConstant(op, aRaw, bRaw) {
    const a = parseConstValue(aRaw);
    const b = parseConstValue(bRaw);

    if (op === '&&' || op === '||') {
      const res = op === '&&' ? Boolean(a) && Boolean(b) : Boolean(a) || Boolean(b);
      return { ok: true, value: formatConstValue(res) };
    }

    if (typeof a !== 'number' || typeof b !== 'number') {
      if (op === '==') return { ok: true, value: formatConstValue(a === b) };
      if (op === '!=') return { ok: true, value: formatConstValue(a !== b) };
      return { ok: false, reason: 'Tipos incompatibles para plegado seguro.' };
    }

    if ((op === '/' || op === '%') && b === 0) {
      return {
        ok: false,
        safetyWarning: `División o módulo por cero detectado (${aRaw} ${op} ${bRaw}). Se conserva la instrucción sin plegar para no alterar el comportamiento en tiempo de ejecución.`
      };
    }

    let result;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = a / b; break;
      case '%': result = a % b; break;
      case '==': result = a === b; break;
      case '!=': result = a !== b; break;
      case '<': result = a < b; break;
      case '<=': result = a <= b; break;
      case '>': result = a > b; break;
      case '>=': result = a >= b; break;
      default:
        return { ok: false };
    }

    if (typeof result === 'number' && !Number.isFinite(result)) {
      return {
        ok: false,
        safetyWarning: `El resultado de ${aRaw} ${op} ${bRaw} no es finito. Se conserva la instrucción por seguridad.`
      };
    }

    return { ok: true, value: formatConstValue(result) };
  }

  function evaluateUnaryConstant(op, aRaw) {
    const a = parseConstValue(aRaw);
    if (op === '!') {
      return { ok: true, value: formatConstValue(!Boolean(a)) };
    }
    if (typeof a !== 'number') return { ok: false };
    if (op === '-') return { ok: true, value: formatConstValue(-a) };
    if (op === '+') return { ok: true, value: formatConstValue(+a) };
    return { ok: false };
  }

  // ── Pasada 1: Plegado de constantes ───────────────────────────────────────

  function runConstantFolding(program, passNum, steps, safetyNotices, seenWarnings) {
    let changed = false;

    for (let i = 0; i < program.length; i++) {
      const inst = program[i];

      if (inst.kind === 'binary' && isConstant(inst.arg1) && isConstant(inst.arg2)) {
        const before = formatInstruction(inst);
        const evalRes = evaluateBinaryConstant(inst.op, inst.arg1, inst.arg2);
        if (evalRes.ok) {
          program[i] = {
            id: inst.id,
            line: inst.line,
            kind: 'copy',
            dest: inst.dest,
            arg1: evalRes.value,
            sideEffect: false
          };
          steps.push({
            pass: passNum,
            ruleId: 'constant-folding',
            ruleName: 'Plegado de constantes',
            line: inst.line,
            before,
            after: formatInstruction(program[i]),
            reason: `Los operandos '${inst.arg1}' y '${inst.arg2}' son constantes conocidas; la operación (${inst.arg1} ${inst.op} ${inst.arg2}) siempre produce '${evalRes.value}'.`
          });
          changed = true;
        } else if (evalRes.safetyWarning) {
          addSafetyNotice(safetyNotices, seenWarnings, inst.line, before, evalRes.safetyWarning);
        }
      } else if (inst.kind === 'unary' && isConstant(inst.arg1)) {
        const before = formatInstruction(inst);
        const evalRes = evaluateUnaryConstant(inst.op, inst.arg1);
        if (evalRes.ok) {
          program[i] = {
            id: inst.id,
            line: inst.line,
            kind: 'copy',
            dest: inst.dest,
            arg1: evalRes.value,
            sideEffect: false
          };
          steps.push({
            pass: passNum,
            ruleId: 'constant-folding',
            ruleName: 'Plegado de constantes',
            line: inst.line,
            before,
            after: formatInstruction(program[i]),
            reason: `El operando '${inst.arg1}' es constante; la operación unaria '${inst.op}${inst.arg1}' se evalúa en tiempo de compilación a '${evalRes.value}'.`
          });
          changed = true;
        }
      }
    }

    return changed;
  }

  // ── Pasada 2: Simplificación algebraica ───────────────────────────────────

  function runAlgebraicSimplification(program, passNum, steps, safetyNotices, seenWarnings) {
    let changed = false;

    for (let i = 0; i < program.length; i++) {
      const inst = program[i];

      if (inst.kind === 'unary' && inst.op === '+') {
        const before = formatInstruction(inst);
        program[i] = {
          id: inst.id, line: inst.line, kind: 'copy',
          dest: inst.dest, arg1: inst.arg1, sideEffect: false
        };
        steps.push({
          pass: passNum,
          ruleId: 'algebraic-simplification',
          ruleName: 'Simplificación algebraica',
          line: inst.line,
          before,
          after: formatInstruction(program[i]),
          reason: `El operador unario '+' no altera el valor de '${inst.arg1}' (+x = x).`
        });
        changed = true;
        continue;
      }

      if (inst.kind !== 'binary') continue;
      // Si ambos son constantes, corresponde a plegado de constantes
      if (isConstant(inst.arg1) && isConstant(inst.arg2)) continue;

      const before = formatInstruction(inst);
      let simplifiedArg = null;
      let identityDesc = null;

      const { op, arg1, arg2 } = inst;

      if (op === '+' && isZero(arg2)) {
        simplifiedArg = arg1;
        identityDesc = `Identidad aditiva (x + 0 = x): sumar 0 a '${arg1}' no cambia su valor.`;
      } else if (op === '+' && isZero(arg1)) {
        simplifiedArg = arg2;
        identityDesc = `Identidad aditiva (0 + x = x): sumar 0 a '${arg2}' no cambia su valor.`;
      } else if (op === '-' && isZero(arg2)) {
        simplifiedArg = arg1;
        identityDesc = `Identidad de resta (x - 0 = x): restar 0 a '${arg1}' no cambia su valor.`;
      } else if (op === '-' && arg1 === arg2 && isValidIdentifier(arg1)) {
        simplifiedArg = '0';
        identityDesc = `Propiedad de inverso aditivo (x - x = 0): restar '${arg1}' consigo misma siempre da 0.`;
      } else if (op === '*' && isOne(arg2)) {
        simplifiedArg = arg1;
        identityDesc = `Identidad multiplicativa (x * 1 = x): multiplicar '${arg1}' por 1 conserva su valor.`;
      } else if (op === '*' && isOne(arg1)) {
        simplifiedArg = arg2;
        identityDesc = `Identidad multiplicativa (1 * x = x): multiplicar '${arg2}' por 1 conserva su valor.`;
      } else if (op === '*' && (isZero(arg2) || isZero(arg1))) {
        simplifiedArg = '0';
        identityDesc = `Propiedad absorbente del cero (x * 0 = 0): multiplicar cualquier valor por 0 resulta en 0.`;
      } else if (op === '/' && isOne(arg2)) {
        simplifiedArg = arg1;
        identityDesc = `Identidad de división (x / 1 = x): dividir '${arg1}' entre 1 conserva su valor.`;
      } else if (op === '/' && isZero(arg2)) {
        addSafetyNotice(
          safetyNotices, seenWarnings, inst.line, before,
          `No se simplifica '${before}' porque la división por 0 es indefinida y debe preservarse por seguridad.`
        );
      } else if (op === '/' && (isZero(arg1) || (arg1 === arg2 && isValidIdentifier(arg1)))) {
        addSafetyNotice(
          safetyNotices, seenWarnings, inst.line, before,
          `No se simplifica '${before}' porque '${arg2}' podría valer 0 en tiempo de ejecución (simplificar omitiría una división por cero).`
        );
      }

      if (simplifiedArg !== null) {
        program[i] = {
          id: inst.id,
          line: inst.line,
          kind: 'copy',
          dest: inst.dest,
          arg1: simplifiedArg,
          sideEffect: false
        };
        steps.push({
          pass: passNum,
          ruleId: 'algebraic-simplification',
          ruleName: 'Simplificación algebraica',
          line: inst.line,
          before,
          after: formatInstruction(program[i]),
          reason: identityDesc
        });
        changed = true;
      }
    }

    return changed;
  }

  // ── Pasada 3: Propagación de constantes (segura por bloque básico) ────────

  function runConstantPropagation(program, passNum, steps, safetyNotices, seenWarnings) {
    let changed = false;
    const blocks = splitIntoBasicBlocks(program);
    const hasLabelsOrJumps = program.some(
      i => i.kind === 'label' || i.kind === 'goto' || i.kind === 'ifgoto'
    );

    if (hasLabelsOrJumps) {
      const firstLabel = program.find(i => i.kind === 'label');
      if (firstLabel) {
        addSafetyNotice(
          safetyNotices, seenWarnings, firstLabel.line, formatInstruction(firstLabel),
          `Al encontrar la etiqueta '${firstLabel.label}:' se reinicia el entorno de constantes conocidas para evitar propagaciones inseguras a través de saltos o ciclos.`
        );
      }
    }

    for (const blockIndices of blocks) {
      const constEnv = new Map();

      for (const idx of blockIndices) {
        const inst = program[idx];
        const before = formatInstruction(inst);
        let instChanged = false;
        const replacements = [];

        const tryReplace = (tok) => {
          if (tok && isValidIdentifier(tok) && constEnv.has(tok)) {
            const val = constEnv.get(tok);
            replacements.push(`${tok} → ${val}`);
            instChanged = true;
            return val;
          }
          return tok;
        };

        if (inst.kind === 'binary') {
          inst.arg1 = tryReplace(inst.arg1);
          inst.arg2 = tryReplace(inst.arg2);
        } else if (inst.kind === 'unary' || inst.kind === 'copy' || inst.kind === 'print' || inst.kind === 'param' || inst.kind === 'return') {
          if (inst.arg1 !== null && inst.arg1 !== undefined) {
            inst.arg1 = tryReplace(inst.arg1);
          }
        } else if (inst.kind === 'ifgoto') {
          inst.arg1 = tryReplace(inst.arg1);
          if (inst.arg2) inst.arg2 = tryReplace(inst.arg2);
        } else if (inst.kind === 'call' && inst.callArgs && inst.callArgs.length > 0) {
          inst.callArgs = inst.callArgs.map(tryReplace);
          inst.rawCall = `${inst.func}(${inst.callArgs.join(', ')})`;
        }

        if (instChanged) {
          steps.push({
            pass: passNum,
            ruleId: 'constant-propagation',
            ruleName: 'Propagación de constantes',
            line: inst.line,
            before,
            after: formatInstruction(inst),
            reason: `Se sustituyó ${replacements.join(', ')} porque su valor constante está garantizado en este punto del bloque básico sin modificaciones intermedias.`
          });
          changed = true;
        }

        // Actualizar el entorno de constantes tras esta instrucción
        const def = getDefinedVar(inst);
        if (inst.kind === 'copy' && isConstant(inst.arg1)) {
          constEnv.set(inst.dest, inst.arg1);
        } else if (def) {
          // Asignación no constante, lectura o llamada invalida el valor conocido
          constEnv.delete(def);
        }
      }
    }

    return changed;
  }

  // ── Pasada 4: Eliminación de temporales redundantes ───────────────────────

  function runRedundantTempElimination(program, passNum, steps) {
    let changed = false;

    // 4A. Auto-asignaciones triviales: x = x
    for (let i = program.length - 1; i >= 0; i--) {
      const inst = program[i];
      if (inst.kind === 'copy' && inst.dest === inst.arg1) {
        const before = formatInstruction(inst);
        program.splice(i, 1);
        steps.push({
          pass: passNum,
          ruleId: 'redundant-temp',
          ruleName: 'Eliminación de temporales redundantes',
          line: inst.line,
          before,
          after: '(eliminada)',
          reason: `Auto-asignación redundante '${before}': copiar una variable sobre sí misma no produce ningún efecto.`
        });
        changed = true;
      }
    }

    // 4B. Propagación local de copias de temporales dentro de cada bloque básico:
    // Si t1 = y (donde y es una variable) y ni t1 ni y cambian, reemplazar usos de t1 por y.
    const blocks = splitIntoBasicBlocks(program);
    for (const blockIndices of blocks) {
      // aliasMap: temp -> sourceVar
      const aliasMap = new Map();

      for (const idx of blockIndices) {
        const inst = program[idx];
        const before = formatInstruction(inst);
        let instChanged = false;
        const replacements = [];

        const resolveAlias = (tok) => {
          if (tok && isTempVar(tok) && aliasMap.has(tok)) {
            const target = aliasMap.get(tok);
            replacements.push(`${tok} → ${target}`);
            instChanged = true;
            return target;
          }
          return tok;
        };

        if (inst.kind === 'binary') {
          inst.arg1 = resolveAlias(inst.arg1);
          inst.arg2 = resolveAlias(inst.arg2);
        } else if (inst.kind === 'unary' || inst.kind === 'copy' || inst.kind === 'print' || inst.kind === 'param' || inst.kind === 'return') {
          if (inst.arg1 !== null && inst.arg1 !== undefined) {
            inst.arg1 = resolveAlias(inst.arg1);
          }
        } else if (inst.kind === 'ifgoto') {
          inst.arg1 = resolveAlias(inst.arg1);
          if (inst.arg2) inst.arg2 = resolveAlias(inst.arg2);
        } else if (inst.kind === 'call' && inst.callArgs && inst.callArgs.length > 0) {
          inst.callArgs = inst.callArgs.map(resolveAlias);
          inst.rawCall = `${inst.func}(${inst.callArgs.join(', ')})`;
        }

        if (instChanged) {
          steps.push({
            pass: passNum,
            ruleId: 'redundant-temp',
            ruleName: 'Eliminación de temporales redundantes',
            line: inst.line,
            before,
            after: formatInstruction(inst),
            reason: `El temporal intermedio (${replacements.join(', ')}) solo reenviaba una copia sin cambios; sustituirlo directamente evita copias innecesarias.`
          });
          changed = true;
        }

        // Invalidar cualquier alias afectado por la escritura actual
        const def = getDefinedVar(inst);
        if (def) {
          aliasMap.delete(def);
          for (const [k, v] of aliasMap.entries()) {
            if (v === def) aliasMap.delete(k);
          }
        }

        // Registrar nuevo alias si es copia de variable a un temporal: t1 = x
        if (inst.kind === 'copy' && isTempVar(inst.dest) && isValidIdentifier(inst.arg1) && inst.dest !== inst.arg1) {
          aliasMap.set(inst.dest, inst.arg1);
        }
      }
    }

    // 4C. Fusión de temporal de uso único consecutivo:
    // t1 = a + b; x = t1  -->  x = a + b  (si t1 no se vuelve a usar en ningún otro lugar)
    for (let i = 0; i < program.length - 1; i++) {
      const first = program[i];
      const second = program[i + 1];
      if (
        (first.kind === 'binary' || first.kind === 'unary') &&
        isTempVar(first.dest) &&
        second.kind === 'copy' &&
        second.arg1 === first.dest &&
        second.dest !== first.dest
      ) {
        const tempName = first.dest;
        // Verificar que tempName no se use en ninguna otra instrucción del programa
        let usedElsewhere = false;
        for (let j = 0; j < program.length; j++) {
          if (j === i || j === i + 1) continue;
          if (getUsedVars(program[j]).includes(tempName)) {
            usedElsewhere = true;
            break;
          }
        }
        if (!usedElsewhere) {
          const beforeCombined = `${formatInstruction(first)}; ${formatInstruction(second)}`;
          const merged = cloneInst(first);
          merged.dest = second.dest;
          merged.line = second.line;
          program.splice(i, 2, merged);
          steps.push({
            pass: passNum,
            ruleId: 'redundant-temp',
            ruleName: 'Eliminación de temporales redundantes',
            line: first.line,
            before: beforeCombined,
            after: formatInstruction(merged),
            reason: `El temporal '${tempName}' se usa únicamente para copiar su resultado a '${second.dest}' y no vuelve a referenciarse; asignar directamente en '${second.dest}' preserva la equivalencia.`
          });
          changed = true;
          break; // Reiniciar índices de forma limpia en la siguiente pasada
        }
      }
    }

    return changed;
  }

  // ── Pasada 5: Eliminación de código muerto (segura) ───────────────────────

  function runDeadCodeElimination(program, passNum, steps, safetyNotices, seenWarnings) {
    let changed = false;

    // Registrar aviso pedagógico por instrucciones con efectos secundarios que se protegen
    for (const inst of program) {
      if (inst.kind === 'call' && inst.dest) {
        const usedAny = program.some((other, idx) => other !== inst && getUsedVars(other).includes(inst.dest));
        if (!usedAny) {
          addSafetyNotice(
            safetyNotices, seenWarnings, inst.line, formatInstruction(inst),
            `Aunque '${inst.dest}' no se utiliza posteriormente, la llamada '${formatInstruction(inst)}' se conserva porque puede producir efectos secundarios externos.`
          );
        }
      } else if (inst.kind === 'read') {
        const usedAny = program.some((other) => other !== inst && getUsedVars(other).includes(inst.dest));
        if (!usedAny) {
          addSafetyNotice(
            safetyNotices, seenWarnings, inst.line, formatInstruction(inst),
            `La instrucción '${formatInstruction(inst)}' se conserva porque realiza entrada interactiva (efecto secundario).`
          );
        }
      }
    }

    // 5A. Código inalcanzable inmediatamente después de goto/return hasta la siguiente etiqueta
    for (let i = 0; i < program.length; i++) {
      if (program[i].kind === 'goto' || program[i].kind === 'return') {
        let j = i + 1;
        while (j < program.length && program[j].kind !== 'label') {
          const dead = program[j];
          const before = formatInstruction(dead);
          program.splice(j, 1);
          steps.push({
            pass: passNum,
            ruleId: 'dead-code',
            ruleName: 'Eliminación de código muerto',
            line: dead.line,
            before,
            after: '(eliminada)',
            reason: `Instrucción inalcanzable: aparece después de un '${program[i].kind}' incondicional sin una etiqueta que permita saltar a ella.`
          });
          changed = true;
        }
      }
    }

    // 5B. Análisis de usos globales y reescrituras muertas dentro de bloque básico
    const globalUseCount = new Map();
    for (const inst of program) {
      for (const v of getUsedVars(inst)) {
        globalUseCount.set(v, (globalUseCount.get(v) || 0) + 1);
      }
    }

    // ¿El programa tiene salidas observables explícitas (print/write/return/param/call)?
    const hasExplicitOutput = program.some(
      i => i.kind === 'print' || i.kind === 'return'
    );

    const blocks = splitIntoBasicBlocks(program);
    const toRemove = new Map(); // index -> reason

    for (const blockIndices of blocks) {
      // Recorrido hacia atrás dentro del bloque básico:
      // Si una variable se define (sin efecto secundario) y luego se vuelve a definir
      // en el MISMO bloque antes de cualquier lectura, la primera definición es muerta.
      const overwrittenBeforeRead = new Set();

      for (let b = blockIndices.length - 1; b >= 0; b--) {
        const idx = blockIndices[b];
        const inst = program[idx];
        const def = getDefinedVar(inst);
        const used = getUsedVars(inst);

        if (def && !inst.sideEffect && overwrittenBeforeRead.has(def)) {
          toRemove.set(
            idx,
            `La asignación a '${def}' se sobrescribe más adelante en el mismo bloque básico antes de ser leída y no tiene efectos secundarios.`
          );
          // No agregamos sus usos a "leídos" porque esta instrucción muerta no se ejecutará
          continue;
        }

        // Si esta instrucción define `def` (y no es leída en su propio RHS), marcar `def` como sobrescrita hacia atrás
        if (def && !used.includes(def)) {
          overwrittenBeforeRead.add(def);
        }
        // Cualquier variable leída aquí NO está sobrescrita antes de leerse
        for (const u of used) {
          overwrittenBeforeRead.delete(u);
        }
      }
    }

    // 5C. Temporales sin ningún uso global (y variables de usuario no usadas si hay salidas explícitas)
    for (let i = 0; i < program.length; i++) {
      if (toRemove.has(i)) continue;
      const inst = program[i];
      if (inst.sideEffect) continue; // NUNCA eliminar instrucciones con efectos secundarios
      const def = getDefinedVar(inst);
      if (!def) continue;

      const uses = globalUseCount.get(def) || 0;
      if (uses === 0) {
        if (isTempVar(def)) {
          toRemove.set(
            i,
            `El temporal '${def}' no se utiliza en ninguna instrucción posterior y su cálculo no produce efectos secundarios.`
          );
        } else if (hasExplicitOutput) {
          toRemove.set(
            i,
            `La variable '${def}' nunca se lee ni afecta ninguna salida del programa (print/return) y la asignación no tiene efectos secundarios.`
          );
        }
      }
    }

    if (toRemove.size > 0) {
      // Eliminar de atrás hacia adelante para conservar índices
      const indicesDesc = Array.from(toRemove.keys()).sort((a, b) => b - a);
      for (const idx of indicesDesc) {
        const inst = program[idx];
        steps.push({
          pass: passNum,
          ruleId: 'dead-code',
          ruleName: 'Eliminación de código muerto',
          line: inst.line,
          before: formatInstruction(inst),
          after: '(eliminada)',
          reason: toRemove.get(idx)
        });
        program.splice(idx, 1);
      }
      changed = true;
    }

    return changed;
  }

  function addSafetyNotice(list, seen, line, instruction, message) {
    const key = `${line}|${instruction}|${message}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push({ line, instruction, message });
    }
  }

  // ── Evaluador / Simulador TAC para Verificación de Equivalencia ───────────

  function evaluateTAC(instructions, initialEnv = {}, maxSteps = 1000) {
    const hasUnsupportedRuntime = instructions.some(
      i => i.kind === 'call' || i.kind === 'read' || i.kind === 'param'
    );
    if (hasUnsupportedRuntime) {
      return {
        canEvaluate: false,
        reason: 'El programa contiene llamadas a funciones o lectura externa (call/read/param); la equivalencia se garantiza de forma estática preservando dichas instrucciones.'
      };
    }

    const labelIndex = new Map();
    instructions.forEach((inst, idx) => {
      if (inst.kind === 'label') labelIndex.set(inst.label, idx);
    });

    const env = Object.assign({}, initialEnv);
    const outputs = [];
    let returnValue = undefined;
    let pc = 0;
    let execSteps = 0;

    // Detectar variables libres (leídas antes de escribirse) y asignarles valores de prueba deterministas si faltan
    const assigned = new Set(Object.keys(env));
    const freeVarsUsed = [];
    for (const inst of instructions) {
      for (const u of getUsedVars(inst)) {
        if (!assigned.has(u) && !freeVarsUsed.includes(u)) {
          freeVarsUsed.push(u);
          env[u] = 4 + freeVarsUsed.length * 3; // Valores de prueba deterministas no-cero (7, 10, 13...)
        }
      }
      const d = getDefinedVar(inst);
      if (d) assigned.add(d);
    }

    const readVal = (tok) => {
      if (isConstant(tok)) return parseConstValue(tok);
      if (Object.prototype.hasOwnProperty.call(env, tok)) return env[tok];
      return 0;
    };

    while (pc < instructions.length) {
      if (execSteps >= maxSteps) {
        return {
          canEvaluate: false,
          reason: `Se alcanzó el límite de ${maxSteps} pasos de simulación (posible ciclo infinito).`
        };
      }
      execSteps++;
      const inst = instructions[pc];

      if (inst.kind === 'label') {
        pc++;
        continue;
      }
      if (inst.kind === 'goto') {
        pc = labelIndex.get(inst.target);
        continue;
      }
      if (inst.kind === 'ifgoto') {
        let condVal;
        if (inst.op) {
          const res = evalOpRuntime(inst.op, readVal(inst.arg1), readVal(inst.arg2));
          if (!res.ok) return { canEvaluate: true, runtimeError: res.error, outputs, env: filterUserVars(env) };
          condVal = Boolean(res.value);
        } else {
          condVal = Boolean(readVal(inst.arg1));
        }
        const jump = inst.negated ? !condVal : condVal;
        pc = jump ? labelIndex.get(inst.target) : pc + 1;
        continue;
      }
      if (inst.kind === 'copy') {
        env[inst.dest] = readVal(inst.arg1);
        pc++;
        continue;
      }
      if (inst.kind === 'unary') {
        const v = readVal(inst.arg1);
        if (inst.op === '-') env[inst.dest] = -v;
        else if (inst.op === '+') env[inst.dest] = +v;
        else if (inst.op === '!') env[inst.dest] = !Boolean(v);
        pc++;
        continue;
      }
      if (inst.kind === 'binary') {
        const res = evalOpRuntime(inst.op, readVal(inst.arg1), readVal(inst.arg2));
        if (!res.ok) return { canEvaluate: true, runtimeError: res.error, outputs, env: filterUserVars(env) };
        env[inst.dest] = res.value;
        pc++;
        continue;
      }
      if (inst.kind === 'print') {
        outputs.push(formatConstValue(readVal(inst.arg1)));
        pc++;
        continue;
      }
      if (inst.kind === 'return') {
        returnValue = inst.arg1 !== null && inst.arg1 !== undefined ? formatConstValue(readVal(inst.arg1)) : null;
        break;
      }
      pc++;
    }

    return {
      canEvaluate: true,
      runtimeError: null,
      execSteps,
      outputs,
      returnValue,
      testInputs: freeVarsUsed.reduce((acc, v) => { acc[v] = env[v]; return acc; }, {}),
      userVars: filterUserVars(env)
    };
  }

  function evalOpRuntime(op, a, b) {
    if ((op === '/' || op === '%') && b === 0) {
      return { ok: false, error: 'División o módulo por cero en tiempo de ejecución' };
    }
    switch (op) {
      case '+': return { ok: true, value: a + b };
      case '-': return { ok: true, value: a - b };
      case '*': return { ok: true, value: a * b };
      case '/': return { ok: true, value: a / b };
      case '%': return { ok: true, value: a % b };
      case '==': return { ok: true, value: a === b };
      case '!=': return { ok: true, value: a !== b };
      case '<': return { ok: true, value: a < b };
      case '<=': return { ok: true, value: a <= b };
      case '>': return { ok: true, value: a > b };
      case '>=': return { ok: true, value: a >= b };
      case '&&': return { ok: true, value: Boolean(a) && Boolean(b) };
      case '||': return { ok: true, value: Boolean(a) || Boolean(b) };
      default: return { ok: false, error: `Operador desconocido: ${op}` };
    }
  }

  function filterUserVars(env) {
    const out = {};
    const keys = Object.keys(env).sort();
    for (const k of keys) {
      if (!isTempVar(k)) {
        const v = env[k];
        out[k] = typeof v === 'number' || typeof v === 'boolean' ? formatConstValue(v) : String(v);
      }
    }
    return out;
  }

  function verifyEquivalence(originalInsts, optimizedInsts) {
    // Recolectar entradas libres del original para pasar el mismo entorno a ambos
    const originalEval = evaluateTAC(originalInsts);
    if (!originalEval.canEvaluate) {
      return {
        status: 'static',
        equivalent: true,
        message: originalEval.reason
      };
    }

    const optimizedEval = evaluateTAC(optimizedInsts, originalEval.testInputs);
    if (!optimizedEval.canEvaluate) {
      return {
        status: 'static',
        equivalent: false,
        message: optimizedEval.reason
      };
    }

    const sameError = originalEval.runtimeError === optimizedEval.runtimeError;
    const sameOutputs = JSON.stringify(originalEval.outputs) === JSON.stringify(optimizedEval.outputs);
    const sameReturn = originalEval.returnValue === optimizedEval.returnValue;

    const hasExplicitOutput = originalInsts.some(i => i.kind === 'print' || i.kind === 'return');
    let sameVars = true;
    if (!hasExplicitOutput) {
      sameVars = JSON.stringify(originalEval.userVars) === JSON.stringify(optimizedEval.userVars);
    }

    const equivalent = sameError && sameOutputs && sameReturn && sameVars;

    return {
      status: equivalent ? 'verified' : 'mismatch',
      equivalent,
      testInputs: originalEval.testInputs,
      original: {
        outputs: originalEval.outputs,
        returnValue: originalEval.returnValue,
        userVars: originalEval.userVars,
        runtimeError: originalEval.runtimeError,
        execSteps: originalEval.execSteps
      },
      optimized: {
        outputs: optimizedEval.outputs,
        returnValue: optimizedEval.returnValue,
        userVars: optimizedEval.userVars,
        runtimeError: optimizedEval.runtimeError,
        execSteps: optimizedEval.execSteps
      },
      message: equivalent
        ? 'Equivalencia semántica verificada: ambos programas producen exactamente el mismo resultado.'
        : 'Alerta: se detectó una diferencia en el resultado evaluado.'
    };
  }

  // ── Orquestador principal de optimización ─────────────────────────────────

  function optimizeTAC(source, userOptions = {}) {
    const options = Object.assign({}, DEFAULT_OPTIONS, userOptions);
    const parsed = parseTAC(source);

    if (parsed.errors.length > 0) {
      return {
        ok: false,
        errors: parsed.errors,
        original: [],
        optimized: [],
        originalCode: '',
        optimizedCode: '',
        steps: [],
        safetyNotices: [],
        summary: null,
        equivalence: null
      };
    }

    const original = cloneProgram(parsed.instructions);
    const working = cloneProgram(parsed.instructions);
    const steps = [];
    const safetyNotices = [];
    const seenWarnings = new Set();
    const passSnapshots = [];

    let iterations = 0;
    for (let pass = 1; pass <= options.maxIterations; pass++) {
      let changedInPass = false;

      if (options.constantFolding) {
        if (runConstantFolding(working, pass, steps, safetyNotices, seenWarnings)) {
          changedInPass = true;
        }
      }
      if (options.algebraicSimplification) {
        if (runAlgebraicSimplification(working, pass, steps, safetyNotices, seenWarnings)) {
          changedInPass = true;
        }
      }
      if (options.constantPropagation) {
        if (runConstantPropagation(working, pass, steps, safetyNotices, seenWarnings)) {
          changedInPass = true;
        }
      }
      if (options.redundantTempElimination) {
        if (runRedundantTempElimination(working, pass, steps)) {
          changedInPass = true;
        }
      }
      if (options.deadCodeElimination) {
        if (runDeadCodeElimination(working, pass, steps, safetyNotices, seenWarnings)) {
          changedInPass = true;
        }
      }

      iterations = pass;
      if (changedInPass) {
        passSnapshots.push({
          pass,
          code: working.map(formatInstruction).join('\n'),
          instructionCount: working.length
        });
      } else {
        break;
      }
    }

    // Numerar pasos secuencialmente
    steps.forEach((s, idx) => { s.step = idx + 1; });

    // Resumen de reglas aplicadas
    const ruleCounts = {
      'constant-folding': 0,
      'constant-propagation': 0,
      'algebraic-simplification': 0,
      'redundant-temp': 0,
      'dead-code': 0
    };
    for (const s of steps) {
      if (Object.prototype.hasOwnProperty.call(ruleCounts, s.ruleId)) {
        ruleCounts[s.ruleId]++;
      }
    }

    const originalCount = original.length;
    const optimizedCount = working.length;
    const removedCount = Math.max(0, originalCount - optimizedCount);
    const reductionPct = originalCount > 0
      ? Number(((removedCount / originalCount) * 100).toFixed(1))
      : 0;

    const equivalence = verifyEquivalence(original, working);

    return {
      ok: true,
      errors: [],
      original,
      optimized: working,
      originalCode: original.map(formatInstruction).join('\n'),
      optimizedCode: working.map(formatInstruction).join('\n'),
      steps,
      passSnapshots,
      safetyNotices,
      summary: {
        originalCount,
        optimizedCount,
        removedCount,
        reductionPct,
        totalTransformations: steps.length,
        iterations,
        ruleCounts
      },
      equivalence
    };
  }

  return {
    parseTAC,
    optimizeTAC,
    formatInstruction,
    evaluateTAC,
    verifyEquivalence,
    DEFAULT_OPTIONS
  };
});
