"""
Pruebas del Reto 2 - Analizador Sintactico (Examen practico 2026-II).

Cada caso tiene el mismo ID que la matriz de pruebas (docs/MATRIZ_PRUEBAS.md).
Las pruebas pasan por la API completa (/api/analyze) para verificar el sistema
de punta a punta: lexer -> parser -> semantico -> TAC -> respuesta JSON.

Ejecutar desde la carpeta analizador-sintactico:
    python -m pytest backend -v
"""
import json
import os

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------- utilidades

def analizar(code: str) -> dict:
    resp = client.post("/api/analyze", json={"code": code})
    assert resp.status_code == 200, f"El servidor respondio {resp.status_code}"
    return resp.json()


def sintacticos(data: dict) -> list:
    return [e for e in data["errors"] if e["type"] == "Sintactico"]


def prefijo(nodo: dict) -> str:
    """AST en notacion prefija: x = (+ 5 (* 3 2))."""
    t = nodo["type"]
    if t == "Program":
        return "; ".join(prefijo(h) for h in nodo["children"])
    if t == "Assign":
        return f"{nodo['children'][0]['label']} = {prefijo(nodo['children'][1])}"
    if t == "BinOp":
        izq, der = nodo["children"]
        return f"({nodo['label']} {prefijo(izq)} {prefijo(der)})"
    return nodo["label"]


def resumen(data: dict) -> str:
    """Texto corto del resultado (se usa tambien para llenar la matriz)."""
    errs = data["errors"]
    if not errs:
        ast = prefijo(data["ast"]) if data["ast"] else ""
        return f"Aceptada. AST: {ast}" if ast else "Aceptada (programa vacio)"
    partes = [f"{e['type']} L{e['line']}:C{e['column']} {e['message']}" for e in errs]
    sent = len(data["ast"]["children"]) if data["ast"] else 0
    return " | ".join(partes) + f" [sentencias en AST: {sent}]"


def un_error(data, linea, columna, texto):
    errs = sintacticos(data)
    assert len(errs) == 1, f"Se esperaba 1 error sintactico, hubo {len(errs)}: {errs}"
    e = errs[0]
    assert (e["line"], e["column"]) == (linea, columna), f"Posicion {e['line']}:{e['column']}"
    assert texto.lower() in e["message"].lower(), e["message"]


def aceptada(data, ast_esperado=None):
    assert data["errors"] == [], data["errors"]
    if ast_esperado is not None:
        assert prefijo(data["ast"]) == ast_esperado


# ---------------------------------------------------------------- casos

PROGRAMA_VARIOS_ERRORES = "a = 10;\nb = a +;\nc = (a * 2;\nd 4;\ne = a - 1\nf = e / 2;\n"

CASOS = [
    # Casos minimos del examen
    ("P-01", "Caso valido principal: precedencia", "x = 5 + 3 * 2;",
     "Aceptada; '*' se agrupa antes que '+': x = (+ 5 (* 3 2))",
     lambda d: aceptada(d, "x = (+ 5 (* 3 2))")),
    ("P-02", "Agrupacion con parentesis", "x = (5 + 3) * 2;",
     "Aceptada; el parentesis agrupa la suma: x = (* (+ 5 3) 2)",
     lambda d: aceptada(d, "x = (* (+ 5 3) 2)")),
    ("P-03", "Caso invalido: expresion incompleta", "x=5+;",
     "Error L1:C4, el operador '+' no tiene operando derecho",
     lambda d: un_error(d, 1, 4, "no tiene operando derecho")),
    ("P-04", "Caso invalido: parentesis sin cerrar", "x = (5 + 3;",
     "Error L1:C5 (el '('), parentesis sin cerrar",
     lambda d: un_error(d, 1, 5, "parentesis sin cerrar")),
    ("P-05", "Caso invalido: asignacion mal formada", "x 5;",
     "Error L1:C3, falta '=' entre 'x' y '5'",
     lambda d: un_error(d, 1, 3, "asignacion mal formada")),

    # Precedencia y asociatividad
    ("P-06", "Asociatividad izquierda de '-'", "x = 10 - 4 - 2;",
     "Aceptada: (10 - 4) - 2", lambda d: aceptada(d, "x = (- (- 10 4) 2)")),
    ("P-07", "Asociatividad izquierda de '/'", "x = 8 / 4 / 2;",
     "Aceptada: (8 / 4) / 2", lambda d: aceptada(d, "x = (/ (/ 8 4) 2)")),
    ("P-08", "Precedencia mixta", "x = 2 * 3 + 4 * 5;",
     "Aceptada: (2*3) + (4*5)", lambda d: aceptada(d, "x = (+ (* 2 3) (* 4 5))")),
    ("P-09", "Parentesis anidados", "x = ((1 + 2) * (3 - 4)) / 5;",
     "Aceptada con la agrupacion indicada",
     lambda d: aceptada(d, "x = (/ (* (+ 1 2) (- 3 4)) 5)")),

    # Variacion de espacios / formato
    ("P-10", "Variacion de formato: sin espacios", "x=5+3*2;",
     "Mismo AST que P-01", lambda d: aceptada(d, "x = (+ 5 (* 3 2))")),
    ("P-11", "Variacion de formato: saltos de linea y tabulaciones", "x\n=\t5 +\n   3 * 2\n;",
     "Mismo AST que P-01", lambda d: aceptada(d, "x = (+ 5 (* 3 2))")),

    # Delimitadores y asignaciones mal formadas
    ("P-12", "Falta ';' al final del codigo", "x = 5",
     "Error L1:C5 falta ';' despues de '5'", lambda d: un_error(d, 1, 5, "falta ';'")),
    ("P-13", "Falta ';' entre lineas (recuperacion)", "x = 5\ny = 3;",
     "1 error en L1; 'y = 3;' se sigue analizando (2 sentencias en el AST)",
     lambda d: (un_error(d, 1, 5, "falta ';'"), _sentencias(d, 2))),
    ("P-14", "Asignacion sin expresion", "x = ;",
     "Error L1:C3 falta la expresion despues de '='", lambda d: un_error(d, 1, 3, "falta la expresion")),
    ("P-15", "Asignacion sin variable", "= 5;",
     "Error L1:C1 falta la variable antes de '='", lambda d: un_error(d, 1, 1, "falta la variable")),
    ("P-16", "Signo '=' repetido", "x = = 5;",
     "Error L1:C5 '=' repetido", lambda d: un_error(d, 1, 5, "repetido")),
    ("P-17", "Lado izquierdo invalido", "5 = x;",
     "Error L1:C3 a la izquierda de '=' debe haber una variable", lambda d: un_error(d, 1, 3, "izquierda de '='")),

    # Operadores sin operandos
    ("P-18", "Operadores seguidos", "x = 5 + * 3;",
     "Error L1:C7 '+' sin operando derecho", lambda d: un_error(d, 1, 7, "operadores seguidos")),
    ("P-19", "Operador sin operando izquierdo", "* 3;",
     "Error L1:C1", lambda d: un_error(d, 1, 1, "sin operando izquierdo")),
    ("P-20", "Parentesis vacios", "x = ();",
     "Error L1:C5 parentesis vacios", lambda d: un_error(d, 1, 5, "parentesis vacios")),
    ("P-21", "')' sobrante al final de la expresion", "x = 5 + 3);",
     "Error L1:C10; la asignacion x se conserva en el AST",
     lambda d: (un_error(d, 1, 10, "sin '(' de apertura"), _sentencias(d, 1))),
    ("P-22", "')' suelto entre sentencias", "x = 1; ) y = 2;",
     "Error L1:C8; 'y = 2;' no se pierde (2 sentencias)",
     lambda d: (un_error(d, 1, 8, "sin '(' de apertura"), _sentencias(d, 2))),
    ("P-23", "Falta operador entre operandos", "x = 5 3;",
     "Error L1:C7 falta un operador", lambda d: un_error(d, 1, 7, "falta un operador")),
    ("P-24", "Menos unario (fuera de la gramatica)", "x = -5;",
     "Error L1:C5 explicando que no esta soportado", lambda d: un_error(d, 1, 5, "unario")),
    ("P-25", "Sentencia vacia", "x = 5;;",
     "Error L1:C7 ';' sobrante; x = 5 se conserva",
     lambda d: (un_error(d, 1, 7, "sobrante"), _sentencias(d, 1))),

    # Recuperacion de errores
    ("P-26", "Varios errores en un programa (6 lineas)", PROGRAMA_VARIOS_ERRORES,
     "4 errores (lineas 2, 3, 4 y 5); sentencias validas a, e, f en el AST",
     lambda d: _varios_errores(d)),

    # Casos limite
    ("P-27", "Limite: codigo vacio", "",
     "Aceptada, AST sin sentencias, sin error 500", lambda d: (aceptada(d), _sentencias(d, 0))),
    ("P-28", "Limite: solo espacios y saltos", "   \n\t  \n",
     "Aceptada, AST sin sentencias", lambda d: (aceptada(d), _sentencias(d, 0))),
    ("P-29", "Limite: 101 parentesis anidados", "x = " + "(" * 101 + "1" + ")" * 101 + ";",
     "Error controlado 'Demasiados parentesis anidados' (100 si se aceptan)",
     lambda d: _anidamiento(d)),
    ("P-30", "Limite: expresion con 1500 sumas", "x = " + "+".join(["1"] * 1500) + ";",
     "Respuesta 200 con error explicado, sin caida del servidor",
     lambda d: un_error(d, 1, 1, "demasiado larga")),
    ("P-31", "Limite: digito Unicode '²'", "x = ²;",
     "Error lexico 'Caracter ilegal', sin caida del servidor (antes: error 500)",
     lambda d: _lexico(d, "²")),
    ("P-32", "Caracter ilegal '$' (sin errores duplicados)", "a = 5 $ 10;",
     "1 error lexico en '$' y 1 sintactico 'falta un operador'; ninguno repetido",
     lambda d: _ilegal(d)),

    # AST coherente con la entrada
    ("P-33", "Rango del nodo Asignacion", "x = 1; y = 2;",
     "Nodo 'x =' termina en el ';' (offset 6), no en el token siguiente",
     lambda d: _rango(d, 0, 0, 6)),
    ("P-34", "Rango con parentesis", "x = (5 + 3) * 2;",
     "Nodo '*' empieza en el '(' (offset 4)",
     lambda d: _rango_binop(d, 4, 15)),

    # Integracion con TAC y regresion
    ("P-35", "TAC solo para programas sin errores sintacticos", "x = 5 +; y = 2;",
     "TAC vacio y error reportado", lambda d: _sin_tac(d)),
    ("P-36", "Regresion: TAC de un programa valido", "x = 5 + 3 * 2;",
     "t0 = 3 * 2 / t1 = 5 + t0 / x = t1",
     lambda d: _tac(d, ["t0 = 3 * 2", "t1 = 5 + t0", "x = t1"])),
    ("P-37", "Regresion: errores semanticos siguen detectandose", "x = y + 1; z = 10 / (5 - 5);",
     "Sin errores sintacticos; 2 semanticos (variable no definida, division por cero)",
     lambda d: _semanticos(d)),
    ("P-38", "Limite: expresion con 300 sumas", "x = " + "+".join(["1"] * 300) + ";",
     "Aceptada (antes: error 500 desde 127 sumas seguidas)",
     lambda d: aceptada(d)),
]


def _sentencias(d, n):
    assert d["ast"] is not None
    assert len(d["ast"]["children"]) == n, f"Sentencias en AST: {len(d['ast']['children'])}"


def _varios_errores(d):
    errs = sintacticos(d)
    assert [e["line"] for e in errs] == [2, 3, 4, 5], errs
    nombres = [s["children"][0]["label"] for s in d["ast"]["children"]]
    assert nombres == ["a", "e", "f"], nombres


def _anidamiento(d):
    un_error(d, 1, 105, "demasiados parentesis")
    ok = analizar("x = " + "(" * 100 + "1" + ")" * 100 + ";")
    aceptada(ok, "x = 1")


def _lexico(d, caracter):
    lex = [e for e in d["errors"] if e["type"] == "Lexico"]
    assert len(lex) == 1 and caracter in lex[0]["message"]


def _ilegal(d):
    _lexico(d, "$")
    errs = sintacticos(d)
    assert len(errs) == 1 and "falta un operador" in errs[0]["message"].lower()
    posiciones = [(e["line"], e["column"]) for e in d["errors"]]
    assert len(posiciones) == len(set(posiciones))


def _rango(d, idx_sentencia, inicio, fin):
    s = d["ast"]["children"][idx_sentencia]
    assert (s["start_idx"], s["end_idx"]) == (inicio, fin), (s["start_idx"], s["end_idx"])


def _rango_binop(d, inicio, fin):
    expr = d["ast"]["children"][0]["children"][1]
    assert expr["label"] == "*"
    assert (expr["start_idx"], expr["end_idx"]) == (inicio, fin), (expr["start_idx"], expr["end_idx"])


def _sin_tac(d):
    assert sintacticos(d)
    assert d["tac"] == []


def _tac(d, esperado):
    aceptada(d)
    assert d["tac"] == esperado


def _semanticos(d):
    assert not sintacticos(d)
    sem = [e["message"] for e in d["errors"] if e["type"] == "Semantico"]
    assert len(sem) == 2
    assert any("no definida" in m for m in sem) and any("Division por cero" in m for m in sem)


@pytest.mark.parametrize("caso", CASOS, ids=[c[0] for c in CASOS])
def test_matriz(caso):
    _id, _escenario, entrada, _esperado, verificar = caso
    verificar(analizar(entrada))


# ---------------------------------------------------------------- regresion general

@pytest.mark.parametrize("n", [126, 127, 300, 450, 1000, 5000])
def test_expresiones_largas_nunca_dan_500(n):
    """Antes: 127 sumas seguidas ya tumbaban el servidor (error 500)."""
    d = analizar("x = " + "+".join(["1"] * n) + ";")
    if d["errors"]:
        un_error(d, 1, 1, "demasiado larga")
    else:
        assert d["ast"] is not None


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_ejemplos_precargados():
    """Los ejemplos de la OVA siguen dando el resultado de su categoria."""
    ejemplos = client.get("/api/examples").json()
    assert len(ejemplos) == 17
    for ej in ejemplos:
        d = analizar(ej["code"])
        tipos = {e["type"] for e in d["errors"]}
        if ej["category"] == "Válido":
            assert not d["errors"], (ej["name"], d["errors"])
        elif "Sintáctico" in ej["category"]:
            assert "Sintactico" in tipos, ej["name"]
        elif "Semántico" in ej["category"]:
            assert tipos == {"Semantico"}, (ej["name"], d["errors"])


def test_traza_balanceada():
    """El modo paso a paso recibe una traza con reglas abiertas y cerradas en pares."""
    d = analizar(PROGRAMA_VARIOS_ERRORES + "g = (1 + 2) * 3 - 4 / 5;")
    entradas = sum(1 for t in d["trace"] if t["action"] == "enter_rule")
    salidas = sum(1 for t in d["trace"] if t["action"] == "exit_rule")
    assert entradas > 0
    # Las reglas interrumpidas por un error no se cierran; en un programa valido deben cuadrar.
    ok = analizar("x = (1 + 2) * 3 - 4 / 5; y = x;")
    e2 = sum(1 for t in ok["trace"] if t["action"] == "enter_rule")
    s2 = sum(1 for t in ok["trace"] if t["action"] == "exit_rule")
    assert e2 == s2
    assert salidas <= entradas


def test_nodos_de_traza_existen_en_ast():
    """Cada nodo creado en la traza existe en el AST que dibuja D3 (programa valido)."""
    d = analizar("area = (base * altura) / 2;")
    ids_ast = set()

    def recorrer(n):
        ids_ast.add(str(n["id"]))
        for h in n["children"]:
            recorrer(h)

    # base y altura no estan definidas (error semantico), pero el AST es valido
    recorrer(d["ast"])
    creados = {str(t["node_id"]) for t in d["trace"] if t["action"] == "create_node"}
    assert creados == ids_ast
