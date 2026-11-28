"""Defecto D1: los errores de expect() tumbaban el compilador (HTTP 500)."""
import pytest


@pytest.mark.parametrize("fuente, fragmento", [
    ("int x = 5\nprint(x);", "SEMICOLON"),   # falta ';'
    ("x 5;", "SEMICOLON"),                   # asignación mal formada
    ("int x = (5 + 3;", "RPAREN"),           # paréntesis sin cerrar
])
def test_error_sintactico_se_reporta_sin_excepcion(compilar, fuente, fragmento):
    r = compilar(fuente)
    assert not r.success
    assert r.quadruples == []
    assert any(e.startswith("[Sintáctico]") and fragmento in e for e in r.errors)


def test_recuperacion_reporta_varios_errores(compilar):
    r = compilar("int a = ;\nint b = 2\nint c = 3;")
    assert len([e for e in r.errors if e.startswith("[Sintáctico]")]) == 2


def test_anidamiento_excesivo_es_error_controlado(compilar):
    r = compilar("int x = " + "(" * 2000 + "1" + ")" * 2000 + ";")
    assert not r.success and r.errors
