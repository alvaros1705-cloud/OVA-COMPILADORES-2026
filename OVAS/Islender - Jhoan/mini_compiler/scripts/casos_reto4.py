"""Catálogo de casos del Reto 4 (Mini compilador TAC).

Ejecuta cada caso contra CompilerPipeline y muestra el resultado
(éxito, errores o excepción no controlada) junto con las cuádruplas.
Sirve para comparar el comportamiento antes y después de los cambios:

    cd mini_compiler
    python scripts/casos_reto4.py > docs/reto4/evidencias/salida_despues.txt

Los mismos casos se verifican de forma automática en tests/.
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from app.compiler.compiler_pipeline import CompilerPipeline  # noqa: E402

CASOS = [
    # ── Casos válidos: generación de TAC ───────────────────────────────
    ("TAC-01", "Expresión aritmética simple", "int x = 2 + 3;"),
    ("TAC-02", "Precedencia: * antes que +", "int x = 2 + 3 * 4;"),
    ("TAC-03", "Paréntesis alteran la precedencia", "int x = (2 + 3) * 4;"),
    ("TAC-04", "Asociatividad izquierda de -", "int x = 10 - 4 - 3;"),
    ("TAC-05", "Asignaciones consecutivas",
     "int a = 1;\nint b = a + 2;\na = b * 3;\nb = a - b;\nprint(a);\nprint(b);"),
    ("TAC-06", "Asignación encadenada", "int a;\nint b;\na = b = 5;\nprint(a);"),
    ("TAC-07", "if / else",
     "int x = 10;\nif (x > 5) {\n    print(1);\n} else {\n    print(0);\n}"),
    ("TAC-08", "if sin else", "int x = 1;\nif (x > 0) {\n    x = 2;\n}\nprint(x);"),
    ("TAC-09", "Ciclo while",
     "int i = 0;\nwhile (i < 3) {\n    print(i);\n    i = i + 1;\n}"),
    ("TAC-10", "Ciclo for", "for (int i = 0; i < 3; i = i + 1) {\n    print(i);\n}"),
    ("TAC-11", "if anidado dentro de while",
     "int i = 0;\nwhile (i < 4) {\n    if (i % 2 == 0) {\n        print(i);\n    }\n    i = i + 1;\n}"),
    ("TAC-12", "Programa con varios temporales",
     "int r = (1 + 2) * (3 + 4) - (5 + 6) / (7 - 6);\nprint(r);"),
    ("TAC-13", "Operadores unarios",
     "int a = 3;\nint b = -a * 2;\nbool c = !(a > 1);\nprint(b);\nprint(c);"),
    ("TAC-14", "Declaración y llamada de función",
     "func suma(int a, int b) : int {\n    return a + b;\n}\nint r = suma(10, 20);\nprint(r);"),
    ("TAC-15", "Llamadas anidadas",
     "func f(int a, int b) : int {\n    return a + b;\n}\nint r = f(f(1, 2), 3);\nprint(r);"),
    ("TAC-16", "Recursión (factorial)",
     "func fact(int n) : int {\n    if (n <= 1) {\n        return 1;\n    }\n    return n * fact(n - 1);\n}\nprint(fact(5));"),
    ("TAC-19", "Aritmética con float", "float f = 1.5 * 2;\nprint(f);"),
    # ── Errores que deben detectarse ANTES de generar TAC ──────────────
    ("ERR-01", "Léxico: carácter no reconocido", "int x = 5 @ 3;"),
    ("ERR-02", "Léxico: carácter inválido al final del archivo", "int x = 5;@"),
    ("ERR-03", "Léxico: cadena sin cerrar", 'string s = "hola;'),
    ("ERR-04", "Sintáctico: falta punto y coma", "int x = 5\nprint(x);"),
    ("ERR-05", "Sintáctico: asignación mal formada", "x 5;"),
    ("ERR-06", "Sintáctico: paréntesis sin cerrar", "int x = (5 + 3;"),
    ("ERR-07", "Sintáctico: expresión incompleta", "int x = 5 + ;"),
    ("ERR-08", "Semántico: variable no declarada (lado izquierdo)", "y = 3;"),
    ("ERR-09", "Semántico: variable no declarada (lado derecho)", "int x = 1;\nx = y + 1;"),
    ("ERR-10", "Semántico: asignación de tipo incompatible", 'int x = 1;\nx = "hola";'),
    ("ERR-11", "Semántico: inicialización de tipo incompatible", 'int x = "hola";'),
    ("ERR-12", "Semántico: declaración duplicada", "int x;\nint x;"),
    ("ERR-16", "Semántico: condición no booleana", "int x = 1;\nif (x) {\n    print(x);\n}"),
    ("ERR-19", "Varios errores sintácticos (recuperación)", "int a = ;\nint b = 2\nint c = 3;"),
    # ── Casos límite ───────────────────────────────────────────────────
    ("LIM-01", "Programa vacío", ""),
    ("LIM-02", "Solo comentarios", "// comentario\n/* bloque */"),
    ("LIM-03", "50 niveles de paréntesis", "int x = " + "(" * 50 + "1" + ")" * 50 + ";"),
    ("LIM-04", "2000 niveles de paréntesis (anidamiento excesivo)",
     "int x = " + "(" * 2000 + "1" + ")" * 2000 + ";"),
    # ── Variación de formato ───────────────────────────────────────────
    ("FMT-01", "Formato compacto", "int x=2+3*4;if(x>10){print(x);}"),
    ("FMT-02", "Mismo programa con espacios, tabs y saltos de línea",
     "int   x =\n\t2 +  3\n *  4 ;\n\n\nif ( x > 10 )\n{\n\tprint( x ) ;\n}\n"),
]


def ejecutar(fuente: str):
    try:
        r = CompilerPipeline().compile(fuente)
    except BaseException as exc:  # se reporta cualquier caída del compilador
        return "EXCEPCIÓN", [f"{type(exc).__name__}: {exc}"], []
    estado = "OK" if r.success else "ERROR"
    return estado, [str(e) for e in r.errors], r.quadruples


def main():
    for cid, desc, fuente in CASOS:
        estado, errores, quads = ejecutar(fuente)
        print(f"=== {cid} · {desc}")
        mostrar = fuente if len(fuente) <= 200 else fuente[:120] + " …(recortado)"
        print("Fuente:")
        for linea in (mostrar.splitlines() or [""]):
            print(f"    {linea}")
        print(f"Resultado: {estado}")
        for e in errores:
            print(f"  error: {e[:300]}")
        if quads:
            print("Cuádruplas:")
            for i, q in enumerate(quads, 1):
                print(f"  {i:>3}. {q!r}")
        print()


if __name__ == "__main__":
    main()
