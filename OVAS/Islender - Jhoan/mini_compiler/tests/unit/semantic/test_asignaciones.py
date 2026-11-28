"""Defecto D3: 'x = expr;' no validaba la expresión y generaba TAC inválido."""


def test_variable_no_declarada_en_lado_derecho(compilar):
    r = compilar("int x = 1;\nx = y + 1;")
    assert not r.success
    assert r.quadruples == []
    assert any("'y' no declarada" in e for e in r.errors)


def test_asignacion_de_tipo_incompatible(compilar):
    r = compilar('int x = 1;\nx = "hola";')
    assert not r.success
    assert any(e.startswith("[Semántico]") for e in r.errors)


def test_asignacion_valida_int_a_float(compilar):
    assert compilar("float f = 1.0;\nf = 2;").success
