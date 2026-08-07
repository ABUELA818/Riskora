from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class PersonalCreate(BaseModel):
    nombre_completo: str
    correo: EmailStr
    rol: str
    id_carrera: Optional[int] = None
    telefono: Optional[str] = None
    telefono_familiar: Optional[str] = None
    imagen_url: Optional[str] = None

class PersonalOut(BaseModel):
    id_usuario: int
    nombre_completo: str
    correo: str
    rol: str
    estado: bool
    telefono: Optional[str] = None
    telefono_familiar: Optional[str] = None
    imagen_url: Optional[str] = None

    class Config:
        from_attributes = True

class CambioRolIn(BaseModel):
    nuevo_rol: str

class MetricaCarrera(BaseModel):
    carrera: str
    cantidad: int

class MetricasRRHHOut(BaseModel):
    total_docentes: int
    total_tutores: int
    total_psicopedagogia: int
    altas_mes: int
    distribucion_carreras: List[MetricaCarrera]

class LogAuditoriaOut(BaseModel):
    id_log: int
    id_usuario: Optional[int] = None
    nombre_usuario: Optional[str] = None
    accion: Optional[str] = None
    endpoint: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class CasoManualCreate(BaseModel):
    id_estudiante: int
    motivo: str