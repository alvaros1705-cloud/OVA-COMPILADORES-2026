"""Regresión: ejemplos del proyecto y API HTTP."""
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from main import app

EJEMPLOS = Path(__file__).resolve().parents[2] / "examples"
client = TestClient(app)


@pytest.mark.parametrize("archivo", ["hello_world.mc", "functions.mc", "control_structures.mc"])
def test_ejemplos_validos_siguen_compilando(compilar, archivo):
    r = compilar((EJEMPLOS / "valid" / archivo).read_text(encoding="utf-8"))
    assert r.success, r.errors


def test_api_compila_programa_valido():
    resp = client.post("/api/compile", json={"source": "int x = 2 + 3;"})
    assert resp.status_code == 200 and resp.json()["success"] is True


@pytest.mark.parametrize("fuente", ["x 5;", "int x = 5;@", "int x = (5 + 3;"])
def test_api_responde_200_con_errores_en_vez_de_500(fuente):
    resp = client.post("/api/compile", json={"source": fuente})
    assert resp.status_code == 200
    assert resp.json()["success"] is False and resp.json()["errors"]
