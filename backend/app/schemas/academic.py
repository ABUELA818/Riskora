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
    horas_semana: Optional[int] = None
    id_carrera: Optional[int] = None
    estado: Optional[bool] = True

class MateriaCreate(MateriaBase): pass
class MateriaOut(MateriaBase):
    id_materia: int
    nombre_carrera: Optional[str] = None
    class Config: 
        from_attributes = True

class MateriaUpdate(BaseModel):
    nombre_materia: Optional[str] = None
    clave_materia: Optional[str] = None
    creditos: Optional[int] = None
    horas_semana: Optional[int] = None
    id_carrera: Optional[int] = None
    estado: Optional[bool] = None

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
    nombre_tutor: Optional[str] = None
    class Config: 
        from_attributes = True

# --- ESTUDIANTES ---
class EstudianteBase(BaseModel):
    nombre_completo: str
    id_grupo: Optional[int] = None
    datos_socioeconomicos: Optional[str] = None
    fecha_ingreso: date
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None
    edad: Optional[int] = None            
    celular: Optional[str] = None         
    fotografia_url: Optional[str] = None      

class EstudianteCreate(EstudianteBase): pass
class EstudianteOut(EstudianteBase):
    id_estudiante: int
    matricula: str
    correo_institucional: Optional[str] = None
    estado: bool
    motivo_baja: Optional[str] = None
    fecha_baja: Optional[date] = None
    nivel_riesgo: Optional[str] = None
    probabilidad_riesgo: Optional[float] = None
    nombre_grupo: Optional[str] = None
    nombre_carrera: Optional[str] = None 
    class Config:
        from_attributes = True

class EstudianteBajaIn(BaseModel):
    motivo_baja: str

class EstudianteAltaCreate(BaseModel):
    nombre_completo: str
    id_carrera: int
    datos_socioeconomicos: Optional[str] = None
    fecha_ingreso: date
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None
    edad: Optional[int] = None
    celular: Optional[str] = None
    fotografia_url: Optional[str] = None

class ClaseDocenteOut(BaseModel):
    id_horario: int
    id_grupo: int
    nombre_grupo: str
    id_materia: int
    nombre_materia: str
    dia_semana: str
    hora_inicio: str
    hora_fin: str
    num_alumnos: int

class HistorialAcademicoPrevioBase(BaseModel):
    institucion: str
    nivel: str
    periodo: Optional[str] = None
    documento_url: Optional[str] = None

class HistorialAcademicoPrevioCreate(HistorialAcademicoPrevioBase):
    pass

class HistorialAcademicoPrevioOut(HistorialAcademicoPrevioBase):
    id_historial: int
    id_estudiante: int
    class Config:
        from_attributes = True