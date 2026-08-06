from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# --- PERIODOS ---
class PeriodoBase(BaseModel):
    nombre_periodo: str
    fecha_inicio: date
    fecha_fin: date

class PeriodoCreate(PeriodoBase): pass
class PeriodoOut(PeriodoBase):
    id_periodo: int
    class Config: 
        from_attributes = True

# --- MATERIAS ---
class MateriaBase(BaseModel):
    nombre_materia: str
    clave_materia: str
    creditos: int
    estado: Optional[bool] = True

class MateriaCreate(MateriaBase): pass
class MateriaOut(MateriaBase):
    id_materia: int
    class Config: 
        from_attributes = True

# --- GRUPOS ---
class GrupoBase(BaseModel):
    nombre_grupo: str
    id_carrera: int
    cuatrimestre: int
    id_plan_estudio: Optional[int] = None
    id_tutor: Optional[int] = None

class GrupoCreate(GrupoBase): pass
class GrupoOut(GrupoBase):
    id_grupo: int
    nombre_carrera: Optional[str] = None
    class Config: 
        from_attributes = True

# --- ESTUDIANTES ---
class EstudianteBase(BaseModel):
    matricula: str
    nombre_completo: str
    id_grupo: Optional[int] = None
    datos_socioeconomicos: Optional[str] = None
    fecha_ingreso: date
    # El correo se maneja desde la tabla de usuarios cuando se les da acceso al sistema.

class EstudianteCreate(EstudianteBase): pass
class EstudianteOut(EstudianteBase):
    id_estudiante: int
    estado: bool
    # Opcional: devolvemos los datos del grupo asociado
    # grupo: Optional[GrupoOut] = None 
    class Config: 
        from_attributes = True