import pytest
from app.compiler.compiler_pipeline import CompilerPipeline


@pytest.fixture
def compilar():
    """Compila un programa MiniC y devuelve el CompileResult."""
    return lambda fuente: CompilerPipeline().compile(fuente)
