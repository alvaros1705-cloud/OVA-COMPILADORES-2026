"""Generación de cuádruplas: precedencia, temporales y control de flujo."""


def quads(compilar, fuente):
    r = compilar(fuente)
    assert r.success, r.errors
    return [(q.op, q.arg1, q.arg2, q.result) for q in r.quadruples]


def test_precedencia_y_temporales(compilar):
    assert quads(compilar, "int x = 2 + 3 * 4;") == [
        ("*", "3", "4", "t1"),
        ("+", "2", "t1", "t2"),
        ("=", "t2", None, "x"),
    ]


def test_parentesis(compilar):
    assert quads(compilar, "int x = (2 + 3) * 4;") == [
        ("+", "2", "3", "t1"),
        ("*", "t1", "4", "t2"),
        ("=", "t2", None, "x"),
    ]


def test_funcion_no_queda_en_el_flujo_principal(compilar):
    """Defecto D4: el cuerpo de la función se ejecutaba al iniciar el programa."""
    q = quads(compilar, "func f() : int { return 1; }\nint x = f();")
    assert q[0] == ("GOTO", None, None, "L1")
    assert q[1][0] == "FUNC_BEGIN"
    fin = [op for op, *_ in q].index("FUNC_END")
    assert q[fin + 1] == ("LABEL", None, None, "L1")
    assert q[fin + 2:] == [("CALL", "f", "0", "t1"), ("=", "t1", None, "x")]


def test_if_sin_else_no_genera_saltos_sobrantes(compilar):
    assert quads(compilar, "int x = 1;\nif (x > 0) { x = 2; }") == [
        ("=", "1", None, "x"),
        (">", "x", "0", "t1"),
        ("IF_FALSE", "t1", None, "L1"),
        ("=", "2", None, "x"),
        ("LABEL", None, None, "L1"),
    ]


def test_if_else_y_while(compilar):
    q = quads(compilar, "int i = 0;\nwhile (i < 3) { if (i == 1) { print(i); } else { print(0); } i = i + 1; }")
    ops = [op for op, *_ in q]
    assert ops.count("LABEL") == 4 and ops.count("GOTO") == 2 and ops.count("IF_FALSE") == 2
