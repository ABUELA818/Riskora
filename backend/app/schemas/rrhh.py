from pydantic import BaseModel, EmailStr
from typing import List, Optional

class PersonalCreate(BaseModel):
    nombre_completo: str
    correo: EmailStr # El frontend envía "correo"
    rol: str
    carrera_asignada: Optional[str] = None

class PersonalOut(BaseModel):
    id_usuario: int
    nombre_completo: str
    correo: str # El frontend espera "correo"
    rol: str
    estado: bool
    
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
    distribucion_carreras: List[MetricaCarrera]