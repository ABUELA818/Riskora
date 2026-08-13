from pydantic import BaseModel, Field
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

class RiesgoEstudianteDetalleOut(BaseModel):
    estudiante_id: str
    nivel_riesgo: str
    probabilidad: float
    detalle: dict
    modo: str  # "XGBoost" | "fallback"

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

# Schemas para nuevos endpoints
class SocioeconomicoUpdate(BaseModel):
    dificultad_economica: int
    trabaja_actualmente: int
    reporte_emocional: int
    solicitud_baja: int
    acceso_tecnologico: str

class CalificacionRegistro(BaseModel):
    parcial: int
    promedio: float = Field(..., ge=0, le=100)

class AsistenciaRegistro(BaseModel):
    fecha: str
    asistio: bool

class CalificacionHistorialItem(BaseModel):
    parcial: int
    promedio: float
    fecha_registro: Optional[str] = None