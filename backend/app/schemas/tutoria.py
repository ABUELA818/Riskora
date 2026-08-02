from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class IntervencionCreate(BaseModel):
    acuerdos: str
    nivel_resolucion: str

class IntervencionOut(BaseModel):
    id_intervencion: int
    id_estudiante: int
    id_tutor: int
    nombre_tutor: str  
    fecha: date
    acuerdos: str
    nivel_resolucion: str

    class Config:
        from_attributes = True

# --- Esquemas para el Resumen Completo ---
class RiesgoResumen(BaseModel):
    nivel_riesgo: str
    score: float
    es_prediccion_simulada: bool

class ResumenCompletoOut(BaseModel):
    id_estudiante: int
    nombre_completo: str
    matricula: str
    carrera: str
    riesgo: RiesgoResumen
    porcentaje_asistencia: float
    promedio_general: float
    observaciones_recientes: list
    intervenciones_recientes: List[IntervencionOut]