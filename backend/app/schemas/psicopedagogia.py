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
    nombre_materia: str
    id_periodo: int
    nombre_periodo: str
    parcial: int
    valor: float

class AsistenciaDetalle(BaseModel):
    fecha: date
    estatus: str

class ObservacionDetalle(BaseModel):
    id_observacion: int
    etiqueta: str
    nota: Optional[str] = None
    fecha_registro: datetime
    nombre_docente: str

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
    fotografia_url: Optional[str] = None
    correo_institucional: Optional[str] = None
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None
    historial_calificaciones: List[CalificacionDetalle]
    historial_asistencia: List[AsistenciaDetalle]
    observaciones: List[ObservacionDetalle]
    intervenciones: List[IntervencionDetalle]
    
    # Análisis Mock Base
    nivel_riesgo_actual: str
    score_riesgo: float
    
    # Campo exclusivo validado por RBAC (HU-07)
    analisis_ia_completo: Optional[Any] = None