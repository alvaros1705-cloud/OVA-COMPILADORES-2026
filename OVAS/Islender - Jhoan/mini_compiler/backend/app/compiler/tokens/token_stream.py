from typing import List, Optional
from .token import Token
from .token_types import TokenType

class TokenStream:
    def __init__(self, tokens: List[Token]):
        self._tokens = tokens
        self._pos = 0

    def peek(self, offset: int = 0) -> Token:
        idx = self._pos + offset
        if idx < len(self._tokens):
            return self._tokens[idx]
        return self._tokens[-1]  # EOF token

    def advance(self) -> Token:
        token = self.peek()
        if self._pos < len(self._tokens) - 1:
            self._pos += 1
        return token

    def expect(self, *types: TokenType) -> Token:
        token = self.peek()
        if token.type not in types:
            # Import local para evitar un ciclo tokens -> errors.
            # Antes se lanzaba el SyntaxError nativo de Python, que el parser
            # no capturaba: el compilador se caía y la API respondía HTTP 500.
            from ..errors.syntax_error import SyntaxError as MCSyntaxError
            expected = ", ".join(t.name for t in types)
            found = "fin del archivo" if token.type == TokenType.EOF else f"'{token.value}'"
            raise MCSyntaxError(
                f"Se esperaba {expected} pero se encontró {token.type.name} {found}",
                token.position,
            )
        return self.advance()

    def match(self, *types: TokenType) -> bool:
        if self.peek().type in types:
            self.advance()
            return True
        return False

    def check(self, *types: TokenType) -> bool:
        return self.peek().type in types

    def is_at_end(self) -> bool:
        return self.peek().type == TokenType.EOF

    @property
    def current_position(self):
        return self.peek().position

    def __len__(self):
        return len(self._tokens)
