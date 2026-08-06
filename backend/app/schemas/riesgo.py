from pydantic import BaseModel
from typing import List, Optional

class FactorRiesgo(BaseModel):
    variable: str
    peso: float
    valor: str

class RiesgoEstudianteOut(BaseModel):
    estudiante_id: str
    nivel_riesgo: str  # "Bajo" | "Medio" | "Alto"
    score: float       # 0.0 a 1.0
    factores: List[FactorRiesgo]
    fecha_calculo: str
    es_prediccion_simulada: bool

class RiesgoResumenOut(BaseModel):
    bajo: int
    medio: int
    alto: int
    total_estudiantes: int

class AlumnoAtencionOut(BaseModel):
    id_estudiante: int
    nombre_completo: str
    matricula: str
    correo_institucional: Optional[str] = None
    nivel_riesgo: str
    score: float