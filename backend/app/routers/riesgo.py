from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Asistencia, Calificacion, EstatusAsistenciaEnum, Tutor
from app.schemas.riesgo import RiesgoEstudianteOut, RiesgoResumenOut, FactorRiesgo, AlumnoAtencionOut
from app.core.deps import get_db, RoleChecker, get_current_active_user

router = APIRouter(prefix="/api/v1", tags=["IA - Riesgo (Mock)"])
permitir_acceso = RoleChecker(["Docente", "Tutor", "Administrador"])

def calcular_metricas_estudiante(db: Session, id_estudiante: int):
    registros_asis = db.query(Asistencia).filter(Asistencia.id_estudiante == id_estudiante).all()
    total_clases = len(registros_asis)
    
    if total_clases > 0:
        validas = sum(1 for r in registros_asis if r.estatus in [EstatusAsistenciaEnum.PRESENTE, EstatusAsistenciaEnum.RETARDO])
        porcentaje_asistencia = (validas / total_clases) * 100
    else:
        porcentaje_asistencia = 100.0 

    calificaciones = db.query(Calificacion).filter(Calificacion.id_estudiante == id_estudiante).all()
    if calificaciones:
        vals = [float(c.valor) for c in calificaciones]
        promedio_general = sum(vals) / len(vals)
        
        parciales = sorted(list(set([c.parcial for c in calificaciones])))
        tendencia = "Estable"
        if len(parciales) >= 2:
            ult = [float(c.valor) for c in calificaciones if c.parcial == parciales[-1]]
            penult = [float(c.valor) for c in calificaciones if c.parcial == parciales[-2]]
            p_ult = sum(ult) / len(ult) if ult else 0
            p_penult = sum(penult) / len(penult) if penult else 0
            if p_ult - p_penult >= 3.0: tendencia = "Sube"
            elif p_ult - p_penult <= -3.0: tendencia = "Baja"
    else:
        promedio_general = 85.0 
        tendencia = "Estable"

    return porcentaje_asistencia, promedio_general, tendencia

@router.get("/estudiantes/{id}/riesgo", response_model=RiesgoEstudianteOut, dependencies=[Depends(permitir_acceso)])
def obtener_riesgo_estudiante(id: int, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    porcentaje_asistencia, promedio_general, tendencia = calcular_metricas_estudiante(db, id)

    if porcentaje_asistencia < 70.0 or promedio_general < 60.0:
        nivel_riesgo = "Alto"
        score = 0.85
    elif porcentaje_asistencia < 85.0 or promedio_general < 75.0:
        nivel_riesgo = "Medio"
        score = 0.55
    else:
        nivel_riesgo = "Bajo"
        score = 0.15

    factores = [
        FactorRiesgo(variable="porcentaje_asistencia", peso=0.4, valor=f"{round(porcentaje_asistencia, 1)}%"),
        FactorRiesgo(variable="promedio_general", peso=0.35, valor=f"{round(promedio_general, 1)}"),
        FactorRiesgo(variable="tendencia_calificaciones", peso=0.25, valor=tendencia)
    ]

    return RiesgoEstudianteOut(
        estudiante_id=str(id),
        nivel_riesgo=nivel_riesgo,
        score=score,
        factores=factores,
        fecha_calculo=date.today().isoformat(),
        es_prediccion_simulada=True
    )

@router.get("/riesgo/resumen", response_model=RiesgoResumenOut, dependencies=[Depends(permitir_acceso)])
def obtener_resumen_riesgo(
    grupo_id: Optional[int] = Query(None),
    carrera: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Estudiante).filter(Estudiante.estado == True)

    if grupo_id or carrera:
        query = query.join(Grupo)
        if grupo_id:
            query = query.filter(Grupo.id_grupo == grupo_id)
        if carrera:
            query = query.filter(Grupo.id_carrera == carrera)

    estudiantes = query.all()
    conteo = {"Bajo": 0, "Medio": 0, "Alto": 0}

    for est in estudiantes:
        p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
        
        if p_asis < 70.0 or prom < 60.0:
            conteo["Alto"] += 1
        elif p_asis < 85.0 or prom < 75.0:
            conteo["Medio"] += 1
        else:
            conteo["Bajo"] += 1

    return RiesgoResumenOut(
        bajo=conteo["Bajo"],
        medio=conteo["Medio"],
        alto=conteo["Alto"],
        total_estudiantes=len(estudiantes)
    )

@router.get("/riesgo/alumnos-atencion", response_model=List[AlumnoAtencionOut])
def obtener_alumnos_requieren_atencion(
    limite: int = Query(5, le=20),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Tutor":
        raise HTTPException(status_code=403, detail="Solo disponible para el rol Tutor")

    tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
    if not tutor:
        raise HTTPException(status_code=400, detail="Tu cuenta no tiene un perfil de tutor asociado")

    grupos_ids = [g.id_grupo for g in db.query(Grupo).filter(Grupo.id_tutor == tutor.id_tutor).all()]
    if not grupos_ids:
        return []

    estudiantes = db.query(Estudiante).filter(
        Estudiante.id_grupo.in_(grupos_ids),
        Estudiante.estado == True
    ).all()

    resultados = []
    for est in estudiantes:
        p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)

        if p_asis < 70.0 or prom < 60.0:
            nivel, score = "Alto", 0.85
        elif p_asis < 85.0 or prom < 75.0:
            nivel, score = "Medio", 0.55
        else:
            nivel, score = "Bajo", 0.15

        if nivel == "Bajo":
            continue

        resultados.append(AlumnoAtencionOut(
            id_estudiante=est.id_estudiante,
            nombre_completo=est.nombre_completo,
            matricula=est.matricula,
            correo_institucional=est.correo_institucional,
            nivel_riesgo=nivel,
            score=score
        ))

    orden_prioridad = {"Alto": 0, "Medio": 1}
    resultados.sort(key=lambda r: orden_prioridad.get(r.nivel_riesgo, 2))

    return resultados[:limite]