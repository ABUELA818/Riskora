from pydantic import BaseModel
from typing import List
from datetime import time

class HorarioItemIn(BaseModel):
    id_materia: int
    id_docente: int
    dia_semana: str
    hora_inicio: time
    hora_fin: time

class HorarioBulkCreate(BaseModel):
    horarios: List[HorarioItemIn]

class HorarioOut(BaseModel):
    id_horario: int
    id_grupo: int
    id_materia: int
    nombre_materia: str
    id_docente: int
    nombre_docente: str
    dia_semana: str
    hora_inicio: str
    hora_fin: str

    class Config:
        from_attributes = True

class DocenteDisponibleOut(BaseModel):
    id_docente: int
    nombre_completo: str

class DocenteCatalogoOut(BaseModel):
    id: int
    nombre: str
    apellidos: str
    correo: str

    class Config:
        from_attributes = True