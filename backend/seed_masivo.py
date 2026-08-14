"""
SEED MASIVO — Riskora / EduPredict AI
=======================================================
Genera una población grande y realista para pruebas funcionales:

  - N carreras, cada una con:
      * 1 Director
      * >= 15 Docentes
      * >= 10 Tutores
      * >= 5  Materias
      * 1 Plan de Estudio (con sus materias asignadas por cuatrimestre)
      * >= 10 Grupos (ligados a su plan de estudio), cada uno con 20-25 alumnos
  - 1 Administrador
  - 5 personal de RRHH
  - 5 personal de Psicopedagogía
  - Horarios (materia/docente/día/hora) por grupo
  - Relación Docente-Materia (tabla docente_materia) derivada de los horarios
    y complementada con materias adicionales que el docente puede impartir
  - Calificaciones y asistencias "clásicas" (tablas calificaciones / asistencias,
    usadas por las vistas de captura del docente)
  - Historial de calificaciones y asistencias (tablas historial_calificaciones /
    historial_asistencia, usadas por el motor de riesgo /estudiantes/{id}/riesgo)
  - nivel_riesgo y probabilidad_riesgo ya calculados en cada Estudiante, con la
    MISMA lógica de umbrales que app/routers/riesgo.py::clasificar_riesgo
    (no requiere modelo.pkl / XGBoost para poblarse).
  - Observaciones de conducta y avisos de ejemplo, para que las pantallas de
    Docente/Director/Tutor no se vean vacías.

CÓMO EJECUTARLO
----------------
1. Asegúrate de tener backend/.env configurado (DATABASE_URL, JWT_SECRET, etc.)
2. Aplica las migraciones si no lo has hecho:
       cd backend
       alembic upgrade head
3. Copia este archivo dentro de backend/ (junto a seed.py) y ejecútalo:
       python seed_masivo.py

Es SEGURO volver a correrlo, pero generará datos duplicados adicionales
(no hace "upsert"); si quieres una base limpia, vacía las tablas antes.

Todos los usuarios de personal quedan con la contraseña: password123
"""

import random
from datetime import datetime, date, time, timedelta

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    Usuario, Docente, Tutor, Administrador, PerfilRRHH,
    Carrera, DirectorCarrera, DocenteCarrera, DocenteMateria,
    Periodo, PlanEstudio, PlanMateria,
    Grupo, Estudiante, Materia, Aula, Horario,
    Asistencia, Calificacion, HistorialCalificacion, HistorialAsistencia,
    ObservacionConducta, Aviso,
    RolEnum, DiaSemanaEnum, EstatusAsistenciaEnum,
)

# ============================================================
# CONFIGURACIÓN — ajusta estos números si quieres más/menos volumen
# ============================================================
CARRERAS = [
    ("Ingeniería en Sistemas Computacionales", "ISC"),
    ("Ingeniería Industrial", "II"),
    ("Licenciatura en Administración", "LA"),
    ("Arquitectura", "ARQ"),
    ("Psicología", "PSI"),
]

DOCENTES_POR_CARRERA = 15
TUTORES_POR_CARRERA = 10
GRUPOS_POR_CARRERA = 10
ALUMNOS_MIN_POR_GRUPO = 20
ALUMNOS_MAX_POR_GRUPO = 25
MATERIAS_POR_CARRERA = 5
HORARIOS_POR_GRUPO = 4          # cuántas de las materias tienen horario asignado por grupo
PARCIALES = 3
DIAS_HISTORIAL_ASISTENCIA = 25  # días calendario hacia atrás para historial_asistencia (IA)
FECHAS_ASISTENCIA_CLASE = 8     # "sesiones" simuladas por horario para la tabla 'asistencias'
NUM_RRHH = 5
NUM_PSICOPEDAGOGIA = 5
MATERIAS_EXTRA_POR_DOCENTE = (0, 2)  # rango de materias extra (sin horario) que puede impartir un docente
OBSERVACIONES_POR_GRUPO = (1, 4)     # rango de observaciones de conducta por grupo
NUM_AVISOS_POR_CARRERA = 2
PASSWORD_DEFAULT = "password123"

ETIQUETAS_CONDUCTA = [
    "Participativo", "Distraído", "Colaborativo", "Impuntual",
    "Bajo rendimiento", "Mejora notable", "Conflicto con compañeros",
    "Actitud positiva", "Falta de tareas", "Excelente desempeño",
]

NOTAS_CONDUCTA = [
    "Muestra buena disposición en clase y entrega trabajos a tiempo.",
    "Ha faltado a varias sesiones sin justificación.",
    "Se observa mejora en su participación durante las últimas semanas.",
    "Presenta dificultades para trabajar en equipo con sus compañeros.",
    "Solicita apoyo adicional para comprender los temas vistos en clase.",
    "Mantiene un desempeño constante y actitud respetuosa.",
    "Se le llamó la atención por uso de celular durante la clase.",
    "Muestra iniciativa y apoya a otros compañeros del grupo.",
]

AVISOS_TITULO_CONTENIDO = [
    ("Entrega de calificaciones parciales", "Se les recuerda a los docentes capturar las calificaciones del parcial en curso antes de la fecha límite establecida por control escolar."),
    ("Reunión de academia", "Se convoca a los docentes de la carrera a la reunión de academia para revisar avances del plan de estudios."),
    ("Semana de tutorías", "Se invita a los tutores a reforzar el seguimiento de los estudiantes con riesgo medio y alto durante esta semana."),
    ("Actualización de horarios", "Favor de verificar los horarios asignados a sus grupos, ya que se realizaron ajustes menores en algunas aulas."),
]

NOMBRES = [
    "Juan", "Carlos", "Miguel", "José", "Luis", "Fernando", "Roberto", "Alejandro", "Diego", "Ricardo",
    "Javier", "Pedro", "Manuel", "Antonio", "Francisco", "David", "Sergio", "Raúl", "Eduardo", "Óscar",
    "María", "Ana", "Laura", "Sofía", "Valentina", "Camila", "Fernanda", "Isabella", "Ximena", "Andrea",
    "Patricia", "Carmen", "Rosa", "Elena", "Lucía", "Daniela", "Mónica", "Verónica", "Claudia", "Beatriz",
]
APELLIDOS = [
    "García", "López", "Martínez", "Rodríguez", "González", "Pérez", "Sánchez", "Ramírez", "Cruz", "Flores",
    "Torres", "Rivera", "Morales", "Reyes", "Jiménez", "Mendoza", "Castillo", "Castro", "Ortiz", "Silva",
    "Ramos", "Vargas", "Delgado", "Rojas", "Aguilar", "Guerrero", "Medina", "Herrera", "Cortés", "Núñez",
]

MATERIAS_BASE = [
    "Fundamentos I", "Fundamentos II", "Metodología de la Investigación", "Estadística Aplicada",
    "Ética Profesional", "Taller de Proyectos", "Herramientas Digitales", "Gestión de Calidad",
    "Comunicación Efectiva", "Análisis de Datos", "Legislación Aplicada", "Innovación y Emprendimiento",
]

DIAS_SEMANA_LIST = [
    DiaSemanaEnum.LUNES, DiaSemanaEnum.MARTES, DiaSemanaEnum.MIERCOLES,
    DiaSemanaEnum.JUEVES, DiaSemanaEnum.VIERNES,
]

BLOQUES_HORARIO = [
    (time(8, 0), time(9, 30)),
    (time(9, 30), time(11, 0)),
    (time(11, 0), time(12, 30)),
    (time(12, 30), time(14, 0)),
]

# contadores globales para garantizar unicidad de correos / números de empleado
_contador_empleado = {"docente": 0, "tutor": 0}
_contador_matricula = 0


def nombre_aleatorio():
    return f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"


def clasificar_riesgo(pct_asistencia: float, promedio: float):
    """Misma lógica que app/routers/riesgo.py::clasificar_riesgo, duplicada aquí
    para no depender de prediction_service.py (que exige modelo.pkl al importarse)."""
    if pct_asistencia < 70.0 or promedio < 60.0:
        return "Alto", 0.85
    elif pct_asistencia < 85.0 or promedio < 75.0:
        return "Medio", 0.55
    else:
        return "Bajo", 0.15


def perfil_aleatorio():
    """15% Alto riesgo, 20% Medio riesgo, 65% Bajo riesgo (distribución realista)."""
    return random.choices(["Alto", "Medio", "Bajo"], weights=[15, 20, 65], k=1)[0]


# ============================================================
# ADMIN / RRHH / PSICOPEDAGOGÍA
# ============================================================
def crear_admin_rrhh_psico(db):
    print("-> Creando Administrador, RRHH y Psicopedagogía...")

    admin = Usuario(
        nombre_completo="Administrador General",
        correo_institucional="admin@edupredict.edu",
        password_hash=get_password_hash(PASSWORD_DEFAULT),
        rol=RolEnum.ADMINISTRADOR, estado=True, token_version=1,
    )
    db.add(admin)
    db.flush()
    db.add(Administrador(id_usuario=admin.id_usuario, puesto="Dirección General"))

    for i in range(1, NUM_RRHH + 1):
        u = Usuario(
            nombre_completo=f"{nombre_aleatorio()}",
            correo_institucional=f"rrhh{i}@edupredict.edu",
            password_hash=get_password_hash(PASSWORD_DEFAULT),
            rol=RolEnum.RRHH, estado=True, token_version=1,
        )
        db.add(u)
        db.flush()
        db.add(PerfilRRHH(id_usuario=u.id_usuario, departamento="Recursos Humanos"))

    for i in range(1, NUM_PSICOPEDAGOGIA + 1):
        u = Usuario(
            nombre_completo=f"{nombre_aleatorio()}",
            correo_institucional=f"psicopedagogia{i}@edupredict.edu",
            password_hash=get_password_hash(PASSWORD_DEFAULT),
            rol=RolEnum.PSICOPEDAGOGIA, estado=True, token_version=1,
        )
        db.add(u)

    db.commit()
    print(f"   Admin: 1 | RRHH: {NUM_RRHH} | Psicopedagogía: {NUM_PSICOPEDAGOGIA}")


# ============================================================
# PERIODO / AULAS / CARRERAS
# ============================================================
def crear_periodo(db):
    periodo = Periodo(
        nombre_periodo="Semestre 2026-1",
        fecha_inicio=date(2026, 1, 12),
        fecha_fin=date(2026, 6, 12),
    )
    db.add(periodo)
    db.commit()
    db.refresh(periodo)
    return periodo


def crear_aulas(db, cantidad=25):
    aulas = []
    for i in range(1, cantidad + 1):
        a = Aula(nombre_aula=f"Aula {100 + i}", capacidad=random.choice([30, 35, 40, 45]))
        db.add(a)
        aulas.append(a)
    db.commit()
    for a in aulas:
        db.refresh(a)
    return aulas


def crear_carreras(db):
    carreras = []
    for nombre, sigla in CARRERAS:
        c = Carrera(nombre=nombre)
        db.add(c)
        db.flush()
        carreras.append((c, sigla))
    db.commit()
    return carreras


# ============================================================
# DIRECTOR / DOCENTES / TUTORES / MATERIAS POR CARRERA
# ============================================================
def crear_director(db, carrera, sigla, idx_global):
    u = Usuario(
        nombre_completo=nombre_aleatorio(),
        correo_institucional=f"director.{sigla.lower()}{idx_global}@edupredict.edu",
        password_hash=get_password_hash(PASSWORD_DEFAULT),
        rol=RolEnum.DIRECTOR, estado=True, token_version=1,
    )
    db.add(u)
    db.flush()
    db.add(DirectorCarrera(id_usuario=u.id_usuario, id_carrera=carrera.id_carrera))
    return u


def crear_docentes(db, carrera, sigla, cantidad):
    docentes = []
    for _ in range(cantidad):
        _contador_empleado["docente"] += 1
        n = _contador_empleado["docente"]
        u = Usuario(
            nombre_completo=nombre_aleatorio(),
            correo_institucional=f"docente.{sigla.lower()}{n}@edupredict.edu",
            password_hash=get_password_hash(PASSWORD_DEFAULT),
            rol=RolEnum.DOCENTE, estado=True, token_version=1,
        )
        db.add(u)
        db.flush()
        doc = Docente(id_usuario=u.id_usuario, numero_empleado=f"DOC-{1000 + n}", especialidad=carrera.nombre)
        db.add(doc)
        db.flush()
        db.add(DocenteCarrera(id_docente=doc.id_docente, id_carrera=carrera.id_carrera))
        docentes.append(doc)
    return docentes


def crear_tutores(db, sigla, cantidad):
    tutores = []
    for _ in range(cantidad):
        _contador_empleado["tutor"] += 1
        n = _contador_empleado["tutor"]
        u = Usuario(
            nombre_completo=nombre_aleatorio(),
            correo_institucional=f"tutor.{sigla.lower()}{n}@edupredict.edu",
            password_hash=get_password_hash(PASSWORD_DEFAULT),
            rol=RolEnum.TUTOR, estado=True, token_version=1,
        )
        db.add(u)
        db.flush()
        t = Tutor(id_usuario=u.id_usuario, numero_empleado=f"TUT-{1000 + n}")
        db.add(t)
        db.flush()
        tutores.append(t)
    return tutores


def crear_materias(db, sigla):
    nombres = random.sample(MATERIAS_BASE, MATERIAS_POR_CARRERA)
    materias = []
    for i, nombre in enumerate(nombres, start=1):
        m = Materia(
            nombre_materia=f"{nombre} ({sigla})",
            clave_materia=f"{sigla}-{100 + i}",
            creditos=random.choice([4, 6, 8]),
            horas_semana=random.choice([3, 4, 5]),
            estado=True,
        )
        db.add(m)
        db.flush()
        materias.append(m)
    return materias


# ============================================================
# PLAN DE ESTUDIO / PLAN-MATERIA
# ============================================================
def crear_plan_estudio(db, carrera, sigla, periodo, materias):
    """Crea un plan de estudio por carrera y distribuye las materias
    entre cuatrimestres (1 a 9), dejando el plan listo para usarse
    en Grupo.id_plan_estudio."""
    plan = PlanEstudio(
        nombre_plan=f"Plan de Estudios {carrera.nombre} ({sigla}) 2026",
        id_periodo=periodo.id_periodo,
    )
    db.add(plan)
    db.flush()

    for materia in materias:
        cuatrimestre = random.randint(1, 9)
        db.add(PlanMateria(
            id_plan_estudio=plan.id_plan_estudio,
            id_materia=materia.id_materia,
            cuatrimestre_asignado=cuatrimestre,
        ))

    db.flush()
    return plan


# ============================================================
# DOCENTE - MATERIA
# ============================================================
def asignar_docente_materia(db, docentes_carrera, materias_carrera, horarios_carrera):
    """Puebla la tabla docente_materia (relación directa docente-materia),
    a partir de:
      1. Las materias que cada docente ya imparte según sus horarios.
      2. Un par de materias adicionales aleatorias (sin horario asignado
         todavía), para simular que un docente está habilitado para dar
         más materias de las que le tocaron en el cuatrimestre actual."""
    asignaciones_existentes = set()

    # 1) A partir de los horarios ya generados
    for h in horarios_carrera:
        clave = (h.id_docente, h.id_materia)
        if clave not in asignaciones_existentes:
            asignaciones_existentes.add(clave)
            db.add(DocenteMateria(id_docente=h.id_docente, id_materia=h.id_materia))

    # 2) Materias extra por docente (habilitación, sin horario aún)
    for docente in docentes_carrera:
        cantidad_extra = random.randint(*MATERIAS_EXTRA_POR_DOCENTE)
        candidatas = [m for m in materias_carrera
                      if (docente.id_docente, m.id_materia) not in asignaciones_existentes]
        for materia in random.sample(candidatas, min(cantidad_extra, len(candidatas))):
            clave = (docente.id_docente, materia.id_materia)
            asignaciones_existentes.add(clave)
            db.add(DocenteMateria(id_docente=docente.id_docente, id_materia=materia.id_materia))

    db.flush()


# ============================================================
# GRUPOS / ALUMNOS / HORARIOS
# ============================================================
def generar_matricula():
    global _contador_matricula
    _contador_matricula += 1
    return f"MAT-2026{_contador_matricula:05d}"


def crear_grupo(db, carrera, sigla, idx, tutor, plan_estudio):
    g = Grupo(
        nombre_grupo=f"{sigla}-{idx + 1:02d}",
        id_carrera=carrera.id_carrera,
        id_plan_estudio=plan_estudio.id_plan_estudio,
        cuatrimestre=random.randint(1, 9),
        id_tutor=tutor.id_tutor,
    )
    db.add(g)
    db.flush()
    return g


def crear_horarios_grupo(db, grupo, materias_carrera, docentes_carrera, aulas):
    materias_grupo = random.sample(materias_carrera, min(HORARIOS_POR_GRUPO, len(materias_carrera)))
    dias_usados = random.sample(DIAS_SEMANA_LIST, min(len(materias_grupo), len(DIAS_SEMANA_LIST)))

    horarios = []
    for i, materia in enumerate(materias_grupo):
        docente = random.choice(docentes_carrera)
        aula = random.choice(aulas)
        dia = dias_usados[i % len(dias_usados)]
        h_ini, h_fin = BLOQUES_HORARIO[i % len(BLOQUES_HORARIO)]
        h = Horario(
            id_grupo=grupo.id_grupo, id_materia=materia.id_materia,
            id_docente=docente.id_docente, id_aula=aula.id_aula,
            dia_semana=dia, hora_inicio=h_ini, hora_fin=h_fin,
        )
        db.add(h)
        db.flush()
        horarios.append(h)
    return horarios


def crear_estudiantes_grupo(db, grupo, cantidad):
    estudiantes = []
    for _ in range(cantidad):
        nombre = nombre_aleatorio()
        matricula = generar_matricula()
        est = Estudiante(
            matricula=matricula,
            nombre_completo=nombre,
            id_grupo=grupo.id_grupo,
            correo_institucional=f"{matricula.lower()}@alumno.edupredict.edu",
            fecha_ingreso=date(2026, 1, 10) - timedelta(days=random.randint(0, 720)),
            estado=True,
            edad=random.randint(17, 27),
            celular=f"618{random.randint(1000000, 9999999)}",
            contacto_emergencia_nombre=nombre_aleatorio(),
            contacto_emergencia_telefono=f"618{random.randint(1000000, 9999999)}",
            acceso_tecnologico=random.choices(
                ["Completo", "Parcial", "Sin acceso"], weights=[55, 35, 10]
            )[0],
        )
        db.add(est)
        estudiantes.append(est)
    db.flush()
    return estudiantes


# ============================================================
# OBSERVACIONES DE CONDUCTA / AVISOS
# ============================================================
def crear_observaciones_grupo(db, estudiantes, docentes_carrera):
    """Genera algunas observaciones de conducta por grupo, escritas por
    docentes al azar de la carrera, para que la vista de docente/tutor
    tenga datos con los que trabajar."""
    cantidad = random.randint(*OBSERVACIONES_POR_GRUPO)
    if not estudiantes or not docentes_carrera:
        return
    for _ in range(cantidad):
        est = random.choice(estudiantes)
        docente = random.choice(docentes_carrera)
        db.add(ObservacionConducta(
            id_estudiante=est.id_estudiante,
            id_docente=docente.id_docente,
            etiqueta=random.choice(ETIQUETAS_CONDUCTA),
            nota=random.choice(NOTAS_CONDUCTA),
            fecha_registro=datetime.now() - timedelta(days=random.randint(0, 60)),
        ))


def crear_avisos_carrera(db, administrador, carrera):
    """Crea avisos de ejemplo con alcance a nivel de carrera."""
    for _ in range(NUM_AVISOS_POR_CARRERA):
        titulo, contenido = random.choice(AVISOS_TITULO_CONTENIDO)
        db.add(Aviso(
            id_administrador=administrador.id_administrador,
            titulo=titulo,
            contenido=contenido,
            alcance="Carrera",
            id_referencia_alcance=carrera.id_carrera,
            urgente=random.random() < 0.2,
            fecha_publicacion=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
        ))


# ============================================================
# PERFIL ACADÉMICO: calificaciones + asistencias (clásicas e historial IA)
# ============================================================
def aplicar_perfil_academico(db, estudiante, periodo, horarios_grupo):
    perfil = perfil_aleatorio()

    if perfil == "Alto":
        rango_calif, prob_falta = (40, 59), 0.42
        dificultad_economica, trabaja, reporte_emocional = 1, random.choice([0, 1]), random.choice([0, 1])
    elif perfil == "Medio":
        rango_calif, prob_falta = (60, 74), 0.20
        dificultad_economica, trabaja, reporte_emocional = random.choice([0, 1]), random.choice([0, 1]), 0
    else:
        rango_calif, prob_falta = (75, 100), 0.06
        dificultad_economica, trabaja, reporte_emocional = 0, 0, 0

    estudiante.dificultad_economica = dificultad_economica
    estudiante.trabaja_actualmente = trabaja
    estudiante.reporte_emocional = reporte_emocional
    estudiante.solicitud_baja = 1 if (perfil == "Alto" and random.random() < 0.08) else 0

    # ---- HistorialCalificacion (usado por el motor de riesgo) ----
    proms_parcial = []
    for parcial in range(1, PARCIALES + 1):
        valor = round(random.uniform(*rango_calif), 1)
        if perfil == "Alto" and parcial == PARCIALES:
            valor = max(0, valor - random.uniform(3, 8))
        proms_parcial.append(valor)
        db.add(HistorialCalificacion(
            estudiante_id=estudiante.id_estudiante, parcial=parcial, promedio=valor,
            fecha_registro=datetime.now() - timedelta(days=(PARCIALES - parcial) * 30),
        ))
    promedio_final = sum(proms_parcial) / len(proms_parcial)

    # ---- HistorialAsistencia (usado por el motor de riesgo) ----
    presentes, total_dias = 0, 0
    hoy = datetime.now()
    for d in range(DIAS_HISTORIAL_ASISTENCIA):
        fecha = (hoy - timedelta(days=d)).date()
        if fecha.weekday() >= 5:  # solo días hábiles
            continue
        asistio = random.random() > prob_falta
        db.add(HistorialAsistencia(estudiante_id=estudiante.id_estudiante, fecha=fecha, asistio=asistio))
        total_dias += 1
        if asistio:
            presentes += 1
    pct_asistencia = (presentes / total_dias * 100) if total_dias else 100.0

    nivel, score = clasificar_riesgo(pct_asistencia, promedio_final)
    estudiante.nivel_riesgo = nivel
    estudiante.probabilidad_riesgo = score

    # ---- Calificacion "clásica" por materia/parcial (vista docente) ----
    for h in horarios_grupo:
        for parcial in range(1, PARCIALES + 1):
            valor = round(max(0, min(100, random.uniform(*rango_calif))), 2)
            db.add(Calificacion(
                id_estudiante=estudiante.id_estudiante, id_materia=h.id_materia,
                id_periodo=periodo.id_periodo, parcial=parcial, valor=valor,
            ))

    # ---- Asistencia "clásica" ligada a horario (bitácora docente) ----
    for h in horarios_grupo:
        for f in range(FECHAS_ASISTENCIA_CLASE):
            fecha = (hoy - timedelta(days=f * 7)).date()  # una fecha por semana
            r = random.random()
            if r < prob_falta:
                estatus = EstatusAsistenciaEnum.AUSENTE
            elif r < prob_falta + 0.08:
                estatus = EstatusAsistenciaEnum.RETARDO
            else:
                estatus = EstatusAsistenciaEnum.PRESENTE
            db.add(Asistencia(
                id_estudiante=estudiante.id_estudiante, id_horario=h.id_horario,
                fecha=fecha, estatus=estatus,
            ))


# ============================================================
# MAIN
# ============================================================
def main():
    db = SessionLocal()
    try:
        print("=" * 70)
        print("SEED MASIVO — RISKORA / EDUPREDICT AI")
        print("=" * 70)

        crear_admin_rrhh_psico(db)
        administrador = db.query(Administrador).first()
        periodo = crear_periodo(db)
        aulas = crear_aulas(db, cantidad=25)
        carreras = crear_carreras(db)

        total_docentes = total_tutores = total_grupos = total_alumnos = total_materias = 0
        total_docente_materia = 0
        total_observaciones = total_avisos = 0

        for idx_carrera, (carrera, sigla) in enumerate(carreras, start=1):
            print(f"\n[{idx_carrera}/{len(carreras)}] Carrera: {carrera.nombre}")

            crear_director(db, carrera, sigla, idx_carrera)
            db.commit()

            materias = crear_materias(db, sigla)
            db.commit()
            total_materias += len(materias)

            plan_estudio = crear_plan_estudio(db, carrera, sigla, periodo, materias)
            db.commit()

            docentes = crear_docentes(db, carrera, sigla, DOCENTES_POR_CARRERA)
            db.commit()
            total_docentes += len(docentes)

            tutores = crear_tutores(db, sigla, TUTORES_POR_CARRERA)
            db.commit()
            total_tutores += len(tutores)

            print(f"   Director: 1 | Docentes: {len(docentes)} | Tutores: {len(tutores)} | "
                  f"Materias: {len(materias)} | Plan de Estudio: {plan_estudio.nombre_plan}")

            horarios_carrera = []

            if administrador:
                crear_avisos_carrera(db, administrador, carrera)
                db.commit()
                total_avisos += NUM_AVISOS_POR_CARRERA

            for idx_grupo in range(GRUPOS_POR_CARRERA):
                tutor = tutores[idx_grupo % len(tutores)]
                grupo = crear_grupo(db, carrera, sigla, idx_grupo, tutor, plan_estudio)
                db.commit()

                horarios_grupo = crear_horarios_grupo(db, grupo, materias, docentes, aulas)
                db.commit()
                horarios_carrera.extend(horarios_grupo)

                num_alumnos = random.randint(ALUMNOS_MIN_POR_GRUPO, ALUMNOS_MAX_POR_GRUPO)
                estudiantes = crear_estudiantes_grupo(db, grupo, num_alumnos)
                db.commit()

                for est in estudiantes:
                    aplicar_perfil_academico(db, est, periodo, horarios_grupo)

                crear_observaciones_grupo(db, estudiantes, docentes)
                db.commit()
                total_observaciones += OBSERVACIONES_POR_GRUPO[1]  # aprox., solo para el resumen

                total_grupos += 1
                total_alumnos += len(estudiantes)
                print(f"     Grupo {grupo.nombre_grupo}: {len(estudiantes)} alumnos, "
                      f"{len(horarios_grupo)} horarios")

            # Relación docente-materia por carrera (con base en TODOS los horarios de la carrera)
            asignar_docente_materia(db, docentes, materias, horarios_carrera)
            db.commit()
            total_docente_materia += len(docentes)

        print("\n" + "=" * 70)
        print("RESUMEN FINAL")
        print("=" * 70)
        print(f"Carreras:              {len(carreras)}")
        print(f"Directores:            {len(carreras)}")
        print(f"Docentes:              {total_docentes}")
        print(f"Tutores:               {total_tutores}")
        print(f"Grupos:                {total_grupos}")
        print(f"Materias:              {total_materias}")
        print(f"Planes de Estudio:     {len(carreras)}")
        print(f"Estudiantes:           {total_alumnos}")
        print(f"Docente-Materia:       poblada para {total_docente_materia} docentes")
        print(f"Observaciones (aprox): {total_observaciones}")
        print(f"Avisos:                {total_avisos}")
        print(f"Admin: 1 | RRHH: {NUM_RRHH} | Psicopedagogía: {NUM_PSICOPEDAGOGIA}")
        print("\nTodos los usuarios de personal tienen contraseña: " + PASSWORD_DEFAULT)
        print("Ejemplos de acceso:")
        print("  admin@edupredict.edu")
        print("  director.<sigla><n>@edupredict.edu   (ej. director.isc1@edupredict.edu)")
        print("  docente.<sigla><n>@edupredict.edu")
        print("  tutor.<sigla><n>@edupredict.edu")
        print("  rrhh<n>@edupredict.edu")
        print("  psicopedagogia<n>@edupredict.edu")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR durante el seed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()