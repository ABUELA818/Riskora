from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Time, Enum, DECIMAL, Text, DateTime, Float
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
import enum


# --- ENUMS ---
class RolEnum(enum.Enum):
    ADMINISTRADOR = "Administrador"
    DOCENTE = "Docente"
    TUTOR = "Tutor"
    DIRECTOR = "Director"
    RRHH = "RRHH"
    PSICOPEDAGOGIA = "Psicopedagogia"

class DiaSemanaEnum(enum.Enum):
    LUNES = "Lunes"
    MARTES = "Martes"
    MIERCOLES = "Miercoles"
    JUEVES = "Jueves"
    VIERNES = "Viernes"

class EstatusAsistenciaEnum(enum.Enum):
    PRESENTE = "Presente"
    AUSENTE = "Ausente"
    RETARDO = "Retardo"

class RiesgoEnum(enum.Enum):
    SIN_RIESGO = "Sin Riesgo"
    BAJO = "Riesgo Bajo"
    MEDIO = "Riesgo Medio"
    ALTO = "Riesgo Alto"

# --- 1. DOMINIO IDENTIDAD Y ACCESO ---
class Usuario(Base):
    __tablename__ = 'usuarios'
    id_usuario = Column(Integer, primary_key=True, index=True)
    correo_institucional = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    estado = Column(Boolean, default=True)
    token_recuperacion = Column(String(255), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    token_version = Column(Integer, default=1)
    telefono = Column(String(20), nullable=True)
    telefono_familiar = Column(String(20), nullable=True)
    imagen_url = Column(String(255), nullable=True)

class Docente(Base):
    __tablename__ = 'docentes'
    id_docente = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey('usuarios.id_usuario'))
    numero_empleado = Column(String(20), unique=True)
    especialidad = Column(String(100))

class Tutor(Base):
    __tablename__ = 'tutores'
    id_tutor = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey('usuarios.id_usuario'))
    numero_empleado = Column(String(20), unique=True)

class Administrador(Base):
    __tablename__ = 'administradores'
    id_administrador = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey('usuarios.id_usuario'))
    puesto = Column(String(100))

class PerfilRRHH(Base):
    __tablename__ = "rrhh"
    id_rrhh = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"))
    departamento = Column(String(100))

# --- 2. DOMINIO ACADÉMICO-CURRICULAR ---
class Periodo(Base):
    __tablename__ = 'periodos'
    id_periodo = Column(Integer, primary_key=True, index=True)
    nombre_periodo = Column(String(50))
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)

class PlanEstudio(Base):
    __tablename__ = 'planes_estudio'
    id_plan_estudio = Column(Integer, primary_key=True, index=True)
    nombre_plan = Column(String(120))
    id_periodo = Column(Integer, ForeignKey('periodos.id_periodo'))

class Grupo(Base):
    __tablename__ = 'grupos'
    id_grupo = Column(Integer, primary_key=True, index=True)
    nombre_grupo = Column(String(50))
    id_tutor = Column(Integer, ForeignKey('tutores.id_tutor'))
    id_plan_estudio = Column(Integer, ForeignKey('planes_estudio.id_plan_estudio'))
    id_carrera = Column(Integer, ForeignKey('carreras.id_carrera'))
    cuatrimestre = Column(Integer)

class Estudiante(Base):
    __tablename__ = 'estudiantes'
    id_estudiante = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), unique=True, index=True, nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    fotografia_url = Column(String(255))
    id_grupo = Column(Integer, ForeignKey('grupos.id_grupo'))
    datos_socioeconomicos = Column(Text)
    fecha_ingreso = Column(Date)
    estado = Column(Boolean, default=True)

class Materia(Base):
    __tablename__ = 'materias'
    id_materia = Column(Integer, primary_key=True, index=True)
    nombre_materia = Column(String(120))
    clave_materia = Column(String(20), unique=True)
    creditos = Column(Integer)
    horas_semana = Column(Integer, nullable=True)
    estado = Column(Boolean, default=True)

class PlanMateria(Base):
    __tablename__ = 'plan_materia'
    id_plan_materia = Column(Integer, primary_key=True, index=True)
    id_plan_estudio = Column(Integer, ForeignKey('planes_estudio.id_plan_estudio', ondelete="RESTRICT"))
    id_materia = Column(Integer, ForeignKey('materias.id_materia', ondelete="RESTRICT"))
    cuatrimestre_asignado = Column(Integer)

class Aula(Base):
    __tablename__ = 'aulas'
    id_aula = Column(Integer, primary_key=True, index=True)
    nombre_aula = Column(String(50))
    capacidad = Column(Integer)

class Horario(Base):
    __tablename__ = 'horarios'
    id_horario = Column(Integer, primary_key=True, index=True)
    id_grupo = Column(Integer, ForeignKey('grupos.id_grupo'))
    id_materia = Column(Integer, ForeignKey('materias.id_materia', ondelete="RESTRICT"))
    id_docente = Column(Integer, ForeignKey('docentes.id_docente'))
    id_aula = Column(Integer, ForeignKey('aulas.id_aula'))
    dia_semana = Column(Enum(DiaSemanaEnum))
    hora_inicio = Column(Time)
    hora_fin = Column(Time)

# --- 3. DOMINIO OPERATIVO-TRANSACCIONAL ---
class Asistencia(Base):
    __tablename__ = 'asistencias'
    id_asistencia = Column(Integer, primary_key=True, index=True)
    id_estudiante = Column(Integer, ForeignKey('estudiantes.id_estudiante'))
    id_horario = Column(Integer, ForeignKey('horarios.id_horario'))
    fecha = Column(Date)
    estatus = Column(Enum(EstatusAsistenciaEnum), default=EstatusAsistenciaEnum.PRESENTE)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

class Calificacion(Base):
    __tablename__ = 'calificaciones'
    id_calificacion = Column(Integer, primary_key=True, index=True)
    id_estudiante = Column(Integer, ForeignKey('estudiantes.id_estudiante'))
    id_materia = Column(Integer, ForeignKey('materias.id_materia'))
    id_periodo = Column(Integer, ForeignKey('periodos.id_periodo'))
    parcial = Column(Integer)
    valor = Column(DECIMAL(5,2))             
    promedio_calculado = Column(DECIMAL(5,2)) 

class ObservacionConducta(Base):
    __tablename__ = 'observaciones_conducta'
    id_observacion = Column(Integer, primary_key=True, index=True)
    id_estudiante = Column(Integer, ForeignKey('estudiantes.id_estudiante'))
    id_docente = Column(Integer, ForeignKey('docentes.id_docente'))
    etiqueta = Column(String(50))
    nota = Column(Text)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

# --- 4. DOMINIO ANALÍTICO (IA) Y SEGUIMIENTO ---
class Alerta(Base):
    __tablename__ = 'alertas'
    id_alerta = Column(Integer, primary_key=True, index=True)
    id_estudiante = Column(Integer, ForeignKey('estudiantes.id_estudiante'))
    nivel_riesgo = Column(Enum(RiesgoEnum))
    probabilidad = Column(DECIMAL(5,4))
    porcentaje_inasistencia = Column(DECIMAL(5,2))
    promedio_ponderado = Column(DECIMAL(4,2))
    fecha_calculo = Column(DateTime, default=datetime.utcnow)
    leida = Column(Boolean, default=False)

class Intervencion(Base):
    __tablename__ = 'intervenciones'
    id_intervencion = Column(Integer, primary_key=True, index=True)
    id_estudiante = Column(Integer, ForeignKey('estudiantes.id_estudiante'))
    id_tutor = Column(Integer, ForeignKey('tutores.id_tutor'))
    fecha = Column(Date)
    acuerdos = Column(Text)
    nivel_resolucion = Column(String(50))
    escalado = Column(Boolean, default=False)
    id_usuario_creador = Column(Integer, ForeignKey('usuarios.id_usuario'), nullable=True)

class Aviso(Base):
    __tablename__ = 'avisos'
    id_aviso = Column(Integer, primary_key=True, index=True)
    id_administrador = Column(Integer, ForeignKey('administradores.id_administrador'))
    titulo = Column(String(150))
    contenido = Column(Text)
    alcance = Column(String(50))
    id_referencia_alcance = Column(Integer)
    urgente = Column(Boolean, default=False)
    fecha_publicacion = Column(DateTime, default=datetime.utcnow)

class Notificacion(Base):
    __tablename__ = "notificaciones"
    
    id_notificacion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario")) # Puede ser el Tutor
    mensaje = Column(String(255))
    leida = Column(Boolean, default=False)
    fecha = Column(DateTime, default=datetime.utcnow)

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"
    
    id_log = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    accion = Column(String(255))
    endpoint = Column(String(255))
    timestamp = Column(DateTime, default=datetime.utcnow)

class Carrera(Base):
    __tablename__ = 'carreras'
    id_carrera = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

class DocenteCarrera(Base):
    __tablename__ = 'docente_carrera'
    id_docente_carrera = Column(Integer, primary_key=True, index=True)
    id_docente = Column(Integer, ForeignKey('docentes.id_docente'), nullable=False)
    id_carrera = Column(Integer, ForeignKey('carreras.id_carrera'), nullable=False)

class DirectorCarrera(Base):
    __tablename__ = 'director_carrera'
    id_director_carrera = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey('usuarios.id_usuario'), nullable=False)
    id_carrera = Column(Integer, ForeignKey('carreras.id_carrera'), nullable=False)

class DocenteMateria(Base):
    __tablename__ = 'docente_materia'
    id_docente_materia = Column(Integer, primary_key=True, index=True)
    id_docente = Column(Integer, ForeignKey('docentes.id_docente'), nullable=False)
    id_materia = Column(Integer, ForeignKey('materias.id_materia'), nullable=False)