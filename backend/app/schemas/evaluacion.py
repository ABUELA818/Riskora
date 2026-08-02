from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

# --- CALIFICACIONES ---
class CalificacionCreate(BaseModel):
    id_materia: int
    grupo_id: int # Lo pedimos para validar permisos (RBAC), aunque no se guarde en esta tabla
    id_periodo: int
    parcial: int = Field(..., ge=1, le=3)
    valor: float = Field(..., ge=0, le=100)

class CalificacionOut(BaseModel):
    id_calificacion: int
    id_estudiante: int
    id_materia: int
    id_periodo: int
    parcial: int
    valor: float
    promedio_calculado: Optional[float] = None
    class Config:
        from_attributes = True

class ResumenMateria(BaseModel):
    id_materia: int
    promedio: float
    calificaciones: List[float]

class ResumenCalificacionesOut(BaseModel):
    id_estudiante: int
    promedio_general: float
    tendencia: str
    detalle_materias: List[ResumenMateria]

# --- OBSERVACIONES DE CONDUCTA ---
class ObservacionCreate(BaseModel):
    etiqueta: str
    nota: Optional[str] = None

class ObservacionOut(ObservacionCreate):
    id_observacion: int
    id_estudiante: int
    id_docente: int
    fecha_registro: datetime
    class Config:
        from_attributes = True