import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.schemas import AnalyzeRequest, AnalyzeResponse
from backend.lexer import Lexer
from backend.parser import Parser
from backend.analyzer import ASTAnalyzer
from backend.tac_generator import TACGenerator

app = FastAPI(
    title="Analizador Sintactico EBNF",
    description="API para analisis lexico, sintactico y semantico.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMPLES_PATH = os.path.join(BASE_DIR, "ejemplos", "ejemplos.json")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_code(request: AnalyzeRequest):
    code = request.code

    lexer = Lexer(code)
    tokens, lexical_errors = lexer.tokenize()
    serialized_tokens = [tok.to_dict() for tok in tokens]

    try:
        parser = Parser(tokens)
        ast_root, syntactic_errors, trace = parser.parse()

        symbols = []
        semantic_errors = []
        if ast_root:
            analyzer = ASTAnalyzer()
            symbols, semantic_errors = analyzer.analyze(ast_root)

        all_errors = lexical_errors + syntactic_errors + semantic_errors

        # El codigo intermedio solo se genera para programas lexica y
        # sintacticamente validos: traducir un programa con errores daba un TAC
        # incompleto (faltaban las sentencias descartadas) sin ninguna advertencia.
        tac_instructions = []
        if ast_root and not lexical_errors and not syntactic_errors:
            tac_gen = TACGenerator()
            tac_instructions = tac_gen.generate(ast_root)

        serialized_ast = ast_root.to_dict() if ast_root else None

        # Se serializa aqui (y no con el response_model de FastAPI) porque el
        # serializador de Pydantic admite ~254 niveles de anidamiento: un AST con
        # mas de ~126 operadores seguidos (1+1+...+1) provocaba un error 500.
        body = json.dumps({
            "tokens": serialized_tokens,
            "ast": serialized_ast,
            "symbols": symbols,
            "errors": all_errors,
            "trace": trace,
            "tac": tac_instructions
        }, ensure_ascii=False)
    except RecursionError:
        # Entradas extremas que superan la pila de Python o el limite de
        # anidamiento del JSON. Antes el servidor respondia 500 y el frontend
        # mostraba "No se pudo conectar"; ahora se explica el limite.
        last = tokens[-1]
        body = json.dumps({
            "tokens": serialized_tokens,
            "ast": None,
            "symbols": [],
            "errors": lexical_errors + [{
                "type": "Sintactico",
                "message": "La expresion es demasiado larga o profunda para analizarse.",
                "line": 1, "column": 1, "start_idx": 0, "end_idx": max(1, last.end_idx),
                "suggestion": "Divide la expresion en varias asignaciones mas cortas."
            }],
            "trace": [],
            "tac": []
        }, ensure_ascii=False)

    return Response(content=body, media_type="application/json")

@app.get("/api/examples")
def get_examples():
    if not os.path.exists(EXAMPLES_PATH):
        raise HTTPException(status_code=404, detail="Archivo de ejemplos no encontrado.")
    try:
        with open(EXAMPLES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo ejemplos: {str(e)}")

if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
