from pydantic import BaseModel
from typing import List

class IndicadoresOut(BaseModel):
    total_estudiantes: int
    promedio_general_carrera: float
    porcentaje_reprobacion: float
    riesgo_bajo: int
    riesgo_medio: int
    riesgo_alto: int

class GrupoRiesgoOut(BaseModel):
    id_grupo: int
    nombre_grupo: str
    total_estudiantes: int
    riesgo_bajo: int
    riesgo_medio: int
    riesgo_alto: int

class CasoEscaladoOut(BaseModel):
    id_estudiante: int
    nombre_completo: str
    matricula: str
    riesgo_score: float
    ultimo_acuerdo: str
    tutor_nombre: str