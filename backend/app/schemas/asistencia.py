from pydantic import BaseModel
from typing import List
from datetime import date
from app.models.models import EstatusAsistenciaEnum

class AsistenciaEstudiante(BaseModel):
    id_estudiante: int
    estatus: EstatusAsistenciaEnum

class AsistenciaMasiva(BaseModel):
    grupo_id: int
    id_horario: int
    fecha: date
    asistencias: List[AsistenciaEstudiante]

class AsistenciaOut(BaseModel):
    id_asistencia: int
    id_estudiante: int
    id_horario: int
    fecha: date
    estatus: EstatusAsistenciaEnum

    class Config:
        from_attributes = True

class ResumenAsistenciaOut(BaseModel):
    id_estudiante: int
    total_clases: int
    asistencias: int
    ausencias: int
    porcentaje_asistencia: float