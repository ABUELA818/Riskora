# backend/app/schemas/carrera.py
from pydantic import BaseModel
from typing import Optional

class CarreraOut(BaseModel):
    id_carrera: int
    nombre: str

    class Config:
        from_attributes = True


# NUEVO — P4
class CarreraResumenOut(BaseModel):
    id_carrera: int
    nombre: str
    total_estudiantes: int
    promedio_riesgo_alto_pct: float 
    director_nombre: Optional[str] = None
    director_id_usuario: Optional[int] = None