from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class SolicitudPersonalCreate(BaseModel):
    nombre_completo: str
    correo: EmailStr
    telefono: Optional[str] = None
    telefono_familiar: Optional[str] = None
    imagen_url: Optional[str] = None
    horas_semanales: Optional[int] = None
    rol_solicitado: str = "Docente"
    id_carrera: int

class SolicitudPersonalOut(BaseModel):
    id_solicitud: int
    nombre_completo: str
    correo: str
    telefono: Optional[str] = None
    telefono_familiar: Optional[str] = None
    imagen_url: Optional[str] = None
    horas_semanales: Optional[int] = None
    rol_solicitado: str
    id_carrera: Optional[int] = None
    nombre_carrera: Optional[str] = None
    estado: str
    nombre_solicitante: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    fecha_solicitud: datetime

    class Config:
        from_attributes = True

class SolicitudRechazoIn(BaseModel):
    motivo_rechazo: Optional[str] = None