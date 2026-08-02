from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, datetime

class CasoPendienteOut(BaseModel):
    id_estudiante: int
    nombre_completo: str
    matricula: str
    nivel_riesgo: str
    score_riesgo: float
    fecha_escalamiento: date
    motivo_escalada: str
    tutor_nombre: str

# Esquemas de apoyo para el expediente completo
class CalificacionDetalle(BaseModel):
    id_materia: int
    id_periodo: int
    parcial: int
    valor: float

class AsistenciaDetalle(BaseModel):
    fecha: date
    estatus: str

class ObservacionDetalle(BaseModel):
    etiqueta: str
    nota: str
    fecha_registro: datetime

class IntervencionDetalle(BaseModel):
    tutor_nombre: str
    fecha: date
    nivel_resolucion: str
    acuerdos: str
    escalado: bool

class ExpedienteCompletoOut(BaseModel):
    id_estudiante: int
    nombre_completo: str
    matricula: str
    carrera: str
    historial_calificaciones: List[CalificacionDetalle]
    historial_asistencia: List[AsistenciaDetalle]
    observaciones: List[ObservacionDetalle]
    intervenciones: List[IntervencionDetalle]
    
    # Análisis Mock Base
    nivel_riesgo_actual: str
    score_riesgo: float
    
    # Campo exclusivo validado por RBAC (HU-07)
    analisis_ia_completo: Optional[Any] = None