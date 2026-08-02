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