from typing import List, Dict, Any, Tuple, Optional
from backend.lexer import Token
from backend.ast_nodes import Node, ProgramNode, AssignNode, BinOpNode, VarNode, NumNode

# ---------------------------------------------------------------------------
# Constantes de apoyo para los mensajes de error (Reto 2 - 2026-II)
# ---------------------------------------------------------------------------

# Nombres legibles de los tipos de token (antes se mostraba 'SEMICOLON', 'RPAREN', 'EOF').
TOKEN_NAMES = {
    'ID': 'un identificador',
    'NUMERO': 'un numero',
    'EQUALS': "'='",
    'PLUS': "'+'",
    'MINUS': "'-'",
    'TIMES': "'*'",
    'DIVIDE': "'/'",
    'LPAREN': "'('",
    'RPAREN': "')'",
    'SEMICOLON': "';'",
    'EOF': 'el fin del codigo',
}

OPERATORS = ('PLUS', 'MINUS', 'TIMES', 'DIVIDE')
EXPR_START = ('ID', 'NUMERO', 'LPAREN')   # FIRST(Expresion)
MAX_NESTING = 100                         # limite de parentesis anidados (evita RecursionError)


def describe(token: Optional[Token]) -> str:
    """Texto legible de un token para los mensajes."""
    if token is None or token.type == 'EOF':
        return 'el fin del codigo'
    return f"'{token.value}'"


class ParseError(Exception):
    def __init__(self, message: str, token: Token):
        super().__init__(message)
        self.token = token


class Parser:
    def __init__(self, tokens: List[Token]):
        # Los tokens ERROR ya fueron reportados por el lexer; si llegan al parser
        # provocan un segundo error duplicado sobre el mismo caracter.
        self.tokens = [t for t in tokens if t.type != 'ERROR']
        if not self.tokens or self.tokens[-1].type != 'EOF':
            last = tokens[-1] if tokens else None
            end = last.end_idx if last else 0
            self.tokens.append(Token("EOF", "EOF", last.line if last else 1, last.column if last else 1, end, end))
        self.pos = 0
        self.errors = []
        self.trace = []
        self._node_id_counter = 0
        self._error_positions = set()
        self._nesting = 0

    def next_node_id(self) -> int:
        self._node_id_counter += 1
        return self._node_id_counter

    @property
    def current_token(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return self.tokens[-1]

    def peek(self, offset: int = 1) -> Token:
        index = self.pos + offset
        if index < len(self.tokens):
            return self.tokens[index]
        return self.tokens[-1]

    def previous(self, offset: int = 1) -> Optional[Token]:
        index = self.pos - offset
        if 0 <= index < len(self.tokens):
            return self.tokens[index]
        return None

    def consume(self) -> Token:
        token = self.current_token
        if token.type != 'EOF':
            self.pos += 1
        self.record_trace("consume", {"token": token.to_dict()})
        return token

    def match(self, expected_type: str) -> Token:
        token = self.current_token
        if token.type == expected_type:
            return self.consume()

        suggestion = "Revisa la sintaxis segun la gramatica."
        if expected_type == 'SEMICOLON':
            suggestion = "Falta un punto y coma ';' al final de la sentencia."
        elif expected_type == 'RPAREN':
            suggestion = "Falta un parentesis de cierre ')'."
        elif expected_type == 'EQUALS':
            suggestion = "Se esperaba '=' para completar la asignacion."

        self.fail(f"Se esperaba {TOKEN_NAMES.get(expected_type, expected_type)} pero se encontro {describe(token)}",
                  token, suggestion)

    def error(self, message: str, token: Token, suggestion: str = ""):
        # Evita errores en cascada reportados sobre la misma posicion.
        key = (token.line, token.column)
        if key in self._error_positions:
            return
        self._error_positions.add(key)

        err_data = {
            "type": "Sintactico",
            "message": message,
            "line": token.line,
            "column": token.column,
            "start_idx": token.start_idx,
            "end_idx": max(token.end_idx, token.start_idx + 1),
            "suggestion": suggestion or "Verifica la sintaxis de la gramatica."
        }
        self.errors.append(err_data)
        self.record_trace("error", err_data)

    def fail(self, message: str, token: Token, suggestion: str = ""):
        """Registra el error y lanza ParseError para activar la recuperacion."""
        self.error(message, token, suggestion)
        raise ParseError(message, token)

    def record_trace(self, action: str, data: Dict[str, Any]):
        self.trace.append({"action": action, **data})

    def parse(self) -> Tuple[ProgramNode, List[Dict[str, Any]], List[Dict[str, Any]]]:
        self.record_trace("enter_rule", {"rule": "Programa"})

        start_line = self.current_token.line
        start_col = self.current_token.column
        start_idx = self.current_token.start_idx

        statements = self.sentencias()

        # sentencias() solo termina en EOF, por lo que no hay tokens sobrantes.
        root_id = self.next_node_id()
        root_node = ProgramNode(root_id, statements, start_line, start_col, start_idx, self.current_token.end_idx)

        self.record_trace("create_node", {
            "node_id": root_id,
            "label": "Programa",
            "type": "Program",
            "line": start_line,
            "col": start_col,
            "start_idx": start_idx,
            "end_idx": self.current_token.end_idx
        })

        for stmt in statements:
            self.record_trace("add_child", {"parent_id": root_id, "child_id": stmt.id})

        self.record_trace("exit_rule", {"rule": "Programa", "node_id": root_id})
        return root_node, self.errors, self.trace

    def sentencias(self) -> List[Node]:
        """Sentencias -> Sentencia Sentencias | e"""
        self.record_trace("enter_rule", {"rule": "Sentencias"})
        statements = []

        # Antes el ciclo tambien se detenia en ')': un ')' suelto cortaba el analisis
        # y todas las sentencias siguientes se perdian sin ser reportadas.
        while self.current_token.type != 'EOF':
            initial_pos = self.pos

            try:
                node = self.sentencia()
                if node is not None:
                    statements.append(node)
            except ParseError:
                self.synchronize()

            if self.pos == initial_pos and self.current_token.type != 'EOF':
                self.consume()

        self.record_trace("exit_rule", {"rule": "Sentencias"})
        return statements

    def sentencia(self) -> Optional[Node]:
        """Sentencia -> Asignacion | Expresion ";" """
        self.record_trace("enter_rule", {"rule": "Sentencia"})

        tok = self.current_token
        nxt = self.peek(1)

        # LL(2): ID seguido de '=' es asignacion
        if tok.type == 'ID' and nxt.type == 'EQUALS':
            node = self.asignacion()

        # ID seguido de otro operando en la misma linea: "x 5;" -> falta el '='
        elif tok.type == 'ID' and nxt.type in EXPR_START and nxt.line == tok.line:
            self.fail(f"Asignacion mal formada: falta '=' entre '{tok.value}' y {describe(nxt)}",
                      nxt, f"La forma correcta es: identificador = expresion;  (ej: {tok.value} = {nxt.value};)")

        elif tok.type in EXPR_START:
            node = self.expresion()
            self.fin_sentencia()

        elif tok.type == 'EQUALS':
            self.fail("Asignacion mal formada: falta la variable antes de '='",
                      tok, "La forma correcta es: identificador = expresion;  (ej: x = 5;)")

        elif tok.type == 'SEMICOLON':
            # Sentencia vacia: se reporta y se descarta el ';' sin perder lo que sigue.
            self.error("';' sobrante: sentencia vacia", tok,
                       "La gramatica no admite sentencias vacias. Elimina el ';' extra.")
            self.consume()
            node = None

        elif tok.type == 'RPAREN':
            # Se reporta y se descarta solo el ')' para no perder la sentencia siguiente.
            self.error("Parentesis de cierre ')' sin '(' de apertura", tok,
                       "Elimina el ')' o agrega el '(' que le corresponde.")
            self.consume()
            node = None

        elif tok.type == 'MINUS' and nxt.type in EXPR_START:
            self.fail("El operador unario '-' no esta soportado por la gramatica", tok,
                      "Escribe el valor negativo como una resta, por ejemplo (0 - 5).")

        elif tok.type in OPERATORS:
            self.fail(f"Operador '{tok.value}' sin operando izquierdo", tok,
                      "Un operador binario necesita un valor a cada lado (ej: a + b).")

        else:
            self.fail(f"Sentencia no valida: no puede comenzar con {describe(tok)}", tok,
                      "Una sentencia debe comenzar con una variable, un numero o '('.")

        self.record_trace("exit_rule", {"rule": "Sentencia"})
        return node

    def fin_sentencia(self) -> Optional[Token]:
        """Consume el ';' que cierra una sentencia y explica con precision por que falta."""
        tok = self.current_token
        if tok.type == 'SEMICOLON':
            return self.consume()

        prev = self.previous()

        # Caso "x = 5 +\ny = 3;": el operando de '+' se tomo de la linea siguiente
        # y luego aparece '='. El error real es la expresion incompleta de la linea anterior.
        before = self.previous(2)
        if (tok.type == 'EQUALS' and prev is not None and prev.type == 'ID'
                and before is not None and before.type in OPERATORS and before.line < prev.line):
            self.pos -= 1   # devolvemos el ID para que la siguiente sentencia se analice completa
            self.fail(f"Expresion incompleta: el operador '{before.value}' no tiene operando derecho",
                      before, f"Completa la expresion o agrega ';' al final de la linea {before.line}.")

        # Falta ';' al final de la linea (o del codigo). Recuperacion a nivel de frase:
        # se asume el ';' y se sigue analizando la siguiente linea sin descartarla.
        if tok.type == 'EOF' or (prev is not None and tok.line > prev.line):
            self.error(f"Falta ';' al final de la sentencia, despues de {describe(prev)}",
                       prev or tok, f"Agrega el punto y coma ';' despues de {describe(prev)} (linea {(prev or tok).line}).")
            return None

        if tok.type == 'RPAREN':
            # ')' sobrante al final de la expresion: se reporta, se descarta y se
            # sigue esperando el ';' (la asignacion no se pierde).
            self.error("Parentesis de cierre ')' sin '(' de apertura", tok,
                       "Elimina el ')' o agrega el '(' que le corresponde.")
            self.consume()
            return self.fin_sentencia()

        if tok.type in EXPR_START:
            self.fail(f"Falta un operador entre {describe(prev)} y {describe(tok)}", tok,
                      "Agrega un operador (+, -, *, /) o un ';' si son sentencias distintas.")

        if tok.type == 'EQUALS':
            self.fail("Asignacion mal formada: a la izquierda de '=' debe haber una sola variable", tok,
                      "La forma correcta es: identificador = expresion;  (no se permite 5 = x ni x = y = 2)")

        self.fail(f"Se esperaba ';' pero se encontro {describe(tok)}", tok,
                  "Falta un punto y coma ';' al final de la sentencia.")

    def asignacion(self) -> Node:
        """Asignacion -> ID "=" Expresion ";" """
        self.record_trace("enter_rule", {"rule": "Asignacion"})

        start_line = self.current_token.line
        start_col = self.current_token.column
        start_idx = self.current_token.start_idx

        id_token = self.match('ID')
        self.match('EQUALS')
        expr_node = self.expresion()
        semicolon = self.fin_sentencia()

        # Antes se usaba el token SIGUIENTE al ';' como fin del nodo (rango incorrecto).
        end_idx = semicolon.end_idx if semicolon else expr_node.end_idx

        node_id = self.next_node_id()
        node = AssignNode(node_id, id_token.value, expr_node, start_line, start_col, start_idx, end_idx)

        self.record_trace("create_node", {
            "node_id": node_id,
            "label": f"{id_token.value} =",
            "type": "Assign",
            "line": start_line,
            "col": start_col,
            "start_idx": start_idx,
            "end_idx": end_idx
        })

        var_sub_id = f"{node_id}_var"
        self.record_trace("create_node", {
            "node_id": var_sub_id,
            "label": id_token.value,
            "type": "Variable",
            "line": id_token.line,
            "col": id_token.column,
            "start_idx": id_token.start_idx,
            "end_idx": id_token.end_idx
        })

        self.record_trace("add_child", {"parent_id": node_id, "child_id": var_sub_id})
        self.record_trace("add_child", {"parent_id": node_id, "child_id": expr_node.id})

        self.record_trace("exit_rule", {"rule": "Asignacion", "node_id": node_id})
        return node

    def expresion(self) -> Node:
        """Expresion -> Termino Expresion'"""
        self.record_trace("enter_rule", {"rule": "Expresion"})
        node = self.termino()
        node = self.expresion_prime(node)
        self.record_trace("exit_rule", {"rule": "Expresion"})
        return node

    def expresion_prime(self, left_node: Node) -> Node:
        """Expresion' -> ("+" | "-") Termino Expresion' | e

        Se implementa con un ciclo (equivalente a la recursion por la cola) para que
        expresiones largas como 1+1+...+1 no agoten la pila de Python. La traza
        generada es identica a la version recursiva. Asociatividad: izquierda.
        """
        node = left_node
        depth = 0
        while True:
            self.record_trace("enter_rule", {"rule": "Expresion'"})
            depth += 1
            if self.current_token.type not in ('PLUS', 'MINUS'):
                break
            op_token = self.consume()
            right_node = self.termino()
            node = self._build_binop(op_token, node, right_node)

        for _ in range(depth):
            self.record_trace("exit_rule", {"rule": "Expresion'"})
        return node

    def termino(self) -> Node:
        """Termino -> Factor Termino'"""
        self.record_trace("enter_rule", {"rule": "Termino"})
        node = self.factor()
        node = self.termino_prime(node)
        self.record_trace("exit_rule", {"rule": "Termino"})
        return node

    def termino_prime(self, left_node: Node) -> Node:
        """Termino' -> ("*" | "/") Factor Termino' | e   (ciclo, asociatividad izquierda)"""
        node = left_node
        depth = 0
        while True:
            self.record_trace("enter_rule", {"rule": "Termino'"})
            depth += 1
            if self.current_token.type not in ('TIMES', 'DIVIDE'):
                break
            op_token = self.consume()
            right_node = self.factor()
            node = self._build_binop(op_token, node, right_node)

        for _ in range(depth):
            self.record_trace("exit_rule", {"rule": "Termino'"})
        return node

    def _build_binop(self, op_token: Token, left_node: Node, right_node: Node) -> Node:
        node_id = self.next_node_id()
        new_node = BinOpNode(
            node_id, op_token.value, left_node, right_node,
            left_node.line, left_node.col, left_node.start_idx, right_node.end_idx
        )

        self.record_trace("create_node", {
            "node_id": node_id,
            "label": op_token.value,
            "type": "BinOp",
            "line": op_token.line,
            "col": op_token.column,
            "start_idx": left_node.start_idx,
            "end_idx": right_node.end_idx
        })

        self.record_trace("add_child", {"parent_id": node_id, "child_id": left_node.id})
        self.record_trace("add_child", {"parent_id": node_id, "child_id": right_node.id})
        return new_node

    def factor(self) -> Node:
        """Factor -> "(" Expresion ")" | ID | NUMERO"""
        self.record_trace("enter_rule", {"rule": "Factor"})

        token = self.current_token

        if token.type == 'LPAREN':
            if self._nesting >= MAX_NESTING:
                self.fail(f"Demasiados parentesis anidados (maximo {MAX_NESTING})", token,
                          "Simplifica la expresion reduciendo los niveles de parentesis.")
            lparen = self.match('LPAREN')
            self._nesting += 1
            try:
                node = self.expresion()
            finally:
                self._nesting -= 1

            closing = self.current_token
            if closing.type != 'RPAREN':
                if closing.type in EXPR_START and closing.line == self.previous().line:
                    self.fail(f"Falta un operador entre {describe(self.previous())} y {describe(closing)}", closing,
                              "Agrega un operador (+, -, *, /) entre los dos valores.")
                self.fail(f"Parentesis sin cerrar: el '(' de la linea {lparen.line}, columna {lparen.column} "
                          f"no tiene su ')' (se encontro {describe(closing)})",
                          lparen, "Agrega el parentesis de cierre ')' antes de " + describe(closing) + ".")
            rparen = self.consume()

            # El rango de una operacion entre parentesis incluye los parentesis,
            # asi el nodo padre ("(5 + 3) * 2") resalta desde el '(' en el editor.
            if isinstance(node, BinOpNode):
                node.start_idx = lparen.start_idx
                node.end_idx = rparen.end_idx

        elif token.type == 'ID':
            self.consume()
            node_id = self.next_node_id()
            node = VarNode(node_id, token.value, token.line, token.column, token.start_idx, token.end_idx)

            self.record_trace("create_node", {
                "node_id": node_id,
                "label": token.value,
                "type": "Variable",
                "line": token.line,
                "col": token.column,
                "start_idx": token.start_idx,
                "end_idx": token.end_idx
            })

        elif token.type == 'NUMERO':
            self.consume()
            node_id = self.next_node_id()
            val = float(token.value) if '.' in token.value else int(token.value)
            node = NumNode(node_id, val, token.line, token.column, token.start_idx, token.end_idx)

            self.record_trace("create_node", {
                "node_id": node_id,
                "label": str(val),
                "type": "Number",
                "line": token.line,
                "col": token.column,
                "start_idx": token.start_idx,
                "end_idx": token.end_idx
            })

        else:
            self.factor_error(token)

        self.record_trace("exit_rule", {"rule": "Factor"})
        return node

    def factor_error(self, token: Token):
        """Explica por que falta un operando segun el token anterior (operador, '=', '(')."""
        prev = self.previous()
        prev_type = prev.type if prev else None

        if token.type == 'MINUS' and self.peek(1).type in EXPR_START:
            self.fail("El operador unario '-' no esta soportado por la gramatica", token,
                      "Escribe el valor negativo como una resta, por ejemplo (0 - 5).")

        if prev_type in OPERATORS:
            if token.type in OPERATORS:
                self.fail(f"Operadores seguidos: el operador '{prev.value}' no tiene operando derecho "
                          f"antes de '{token.value}'", prev,
                          "Coloca un numero, variable o '(' entre los dos operadores.")
            self.fail(f"Expresion incompleta: el operador '{prev.value}' no tiene operando derecho "
                      f"(se encontro {describe(token)})", prev,
                      f"Agrega un numero, variable o '(' despues de '{prev.value}'.")

        if prev_type == 'EQUALS':
            if token.type == 'EQUALS':
                self.fail("Asignacion mal formada: signo '=' repetido", token,
                          "Usa un solo '=' (ej: x = 5;). La gramatica no tiene operador '=='.")
            if token.type in OPERATORS:
                self.fail(f"Operador '{token.value}' sin operando izquierdo", token,
                          "Un operador binario necesita un valor a cada lado (ej: a + b).")
            self.fail("Asignacion incompleta: falta la expresion despues de '='", prev,
                      "La forma correcta es: identificador = expresion;  (ej: x = 5;)")

        if prev_type == 'LPAREN':
            if token.type == 'RPAREN':
                self.fail("Parentesis vacios: se esperaba una expresion dentro de '( )'", prev,
                          "Escribe una expresion dentro de los parentesis o eliminalos.")
            if token.type in OPERATORS:
                self.fail(f"Operador '{token.value}' sin operando izquierdo", token,
                          "Un operador binario necesita un valor a cada lado (ej: a + b).")

        self.fail(f"Se esperaba un numero, una variable o '(' pero se encontro {describe(token)}", token,
                  "Revisa si falta un operando o hay un operador suelto.")

    def synchronize(self):
        """Recuperacion de errores (modo panico): avanza hasta ';' o EOF.

        Mejora: si una linea nueva empieza con "ID =", se detiene ahi porque casi
        seguro es una sentencia nueva (por ejemplo cuando falto el ';' de la linea
        anterior). Antes esa sentencia se descartaba sin analizarse.
        """
        self.record_trace("synchronize", {"message": "Sincronizando parser..."})
        while self.current_token.type not in ('SEMICOLON', 'EOF'):
            tok = self.current_token
            prev = self.previous()
            if (prev is not None and tok.line > prev.line
                    and tok.type == 'ID' and self.peek(1).type == 'EQUALS'):
                return
            self.consume()
        if self.current_token.type == 'SEMICOLON':
            self.consume()
