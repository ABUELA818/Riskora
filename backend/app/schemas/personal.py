from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MateriaImpartidaOut(BaseModel):
    id_materia: int
    nombre_materia: str
    clave_materia: str

class ObservacionEnviadaOut(BaseModel):
    id_observacion: int
    id_estudiante: int
    nombre_estudiante: str
    etiqueta: str
    nota: Optional[str] = None
    fecha_registro: datetime

class PersonalDetalleOut(BaseModel):
    id_usuario: int
    nombre_completo: str
    correo: str
    rol: str
    estado: bool
    telefono: Optional[str] = None
    telefono_familiar: Optional[str] = None
    imagen_url: Optional[str] = None
    antiguedad_texto: str
    carreras: List[str] = []
    materias_impartidas: List[MateriaImpartidaOut] = []
    observaciones_enviadas: List[ObservacionEnviadaOut] = []

class PersonalUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    telefono: Optional[str] = None
    telefono_familiar: Optional[str] = None
    imagen_url: Optional[str] = None

class AsignarMateriaIn(BaseModel):
    id_materia: int