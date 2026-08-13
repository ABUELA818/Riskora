from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ReporteEstudianteOut(BaseModel):
    id_estudiante: int
    nombre_completo: str
    matricula: str
    porcentaje_asistencia: float
    promedio_general: float
    nivel_riesgo: str

class NotificacionOut(BaseModel):
    id_notificacion: int
    mensaje: str
    leida: bool
    fecha: datetime

class NotificacionCreate(BaseModel):
    id_estudiante: int

class RiesgoPorCarreraOut(BaseModel):
    id_carrera: int
    carrera: str
    riesgo_bajo: Optional[int] = 0
    riesgo_medio: Optional[int] = 0
    riesgo_alto: Optional[int] = 0
    total_estudiantes: int

class ReprobacionPorMateriaOut(BaseModel):
    id_materia: int
    materia: str
    total_evaluaciones: int
    reprobadas: int
    porcentaje_reprobacion: float

class TendenciaRiesgoPuntoOut(BaseModel):
    periodo: str  # "2026-08"
    riesgo_bajo: int
    riesgo_medio: int
    riesgo_alto: int