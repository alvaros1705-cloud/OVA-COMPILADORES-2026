"""Defecto D2: el lexer se caía o se saltaba caracteres tras un error."""
import pytest
from app.compiler.lexical.lexer import Lexer


@pytest.mark.parametrize("fuente", ["int x = 5;@", 'string s = "hola'])
def test_error_lexico_al_final_no_lanza_excepcion(fuente):
    lexer = Lexer(fuente)
    tokens = lexer.tokenize()
    assert lexer.errors, "debe reportarse el error léxico"
    assert tokens[-1].type.name == "EOF"


def test_tras_un_caracter_invalido_no_se_pierde_el_siguiente():
    lexer = Lexer("5@;")
    valores = [t.value for t in lexer.tokenize()]
    assert valores == ["5", ";", ""]  # ';' no debe saltarse
    assert len(lexer.errors) == 1
