from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.models.models import (
    Estudiante, Grupo, Intervencion, Tutor, Usuario, 
    Calificacion, Asistencia, ObservacionConducta, EstatusAsistenciaEnum, Carrera
)
from app.schemas.psicopedagogia import CasoPendienteOut, ExpedienteCompletoOut
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.routers.riesgo import calcular_metricas_estudiante

router = APIRouter(prefix="/api/v1/psicopedagogia", tags=["Módulo Psicopedagogía"])

permitir_psico_admin = RoleChecker(["Psicopedagogia", "Administrador"])
permitir_expediente = RoleChecker(["Psicopedagogia", "Administrador", "Tutor", "Docente"])

@router.get("/casos-pendientes", response_model=List[CasoPendienteOut], dependencies=[Depends(permitir_psico_admin)])
def obtener_casos_pendientes(db: Session = Depends(get_db)):
    intervenciones = db.query(Intervencion, Usuario.nombre_completo)\
        .join(Tutor, Intervencion.id_tutor == Tutor.id_tutor)\
        .join(Usuario, Tutor.id_usuario == Usuario.id_usuario)\
        .filter(Intervencion.escalado == True)\
        .all()

    casos = []
    vistos = set()

    for inter, nombre_tutor in intervenciones:
        if inter.id_estudiante in vistos:
            continue
            
        metricas = calcular_metricas_estudiante(db, inter.id_estudiante)
        p_asis = metricas[0] if len(metricas) > 0 else 0
        prom = metricas[1] if len(metricas) > 1 else 0
        
        if p_asis < 70.0 or prom < 60.0:
            nivel = "Alto"
            score = 0.85
        elif p_asis < 85.0 or prom < 75.0:
            nivel = "Medio"
            score = 0.55
        else:
            nivel = "Bajo"
            score = 0.15

        estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == inter.id_estudiante).first()
        
        if estudiante:
            casos.append({
                "id_estudiante": estudiante.id_estudiante,
                "nombre_completo": estudiante.nombre_completo,
                "matricula": estudiante.matricula,
                "nivel_riesgo": nivel,
                "score_riesgo": score,
                "fecha_escalamiento": inter.fecha,
                "motivo_escalada": inter.acuerdos,
                "tutor_nombre": nombre_tutor
            })
            vistos.add(inter.id_estudiante)

    casos.sort(key=lambda x: (
        0 if x["nivel_riesgo"] == "Alto" else 1 if x["nivel_riesgo"] == "Medio" else 2,
        x["fecha_escalamiento"]
    ))

    return casos

@router.get("/estudiantes/{id_estudiante}/expediente-completo", response_model=ExpedienteCompletoOut, dependencies=[Depends(permitir_expediente)])
def obtener_expediente_completo(
    id_estudiante: int, 
    vista: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id_estudiante).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
    grupo = db.query(Grupo).filter(Grupo.id_grupo == estudiante.id_grupo).first()
    nombre_carrera = "Sin carrera"
    if grupo and grupo.id_carrera:
        carrera_obj = db.query(Carrera).filter(Carrera.id_carrera == grupo.id_carrera).first()
        if carrera_obj:
            nombre_carrera = carrera_obj.nombre

    calificaciones = db.query(Calificacion).filter(Calificacion.id_estudiante == id_estudiante).all()
    asistencias = db.query(Asistencia).filter(Asistencia.id_estudiante == id_estudiante).all()
    observaciones = db.query(ObservacionConducta).filter(ObservacionConducta.id_estudiante == id_estudiante).all()
    
    intervenciones = db.query(Intervencion, Usuario.nombre_completo)\
        .join(Tutor, Intervencion.id_tutor == Tutor.id_tutor)\
        .join(Usuario, Tutor.id_usuario == Usuario.id_usuario)\
        .filter(Intervencion.id_estudiante == id_estudiante).order_by(Intervencion.fecha.desc()).all()

    metricas = calcular_metricas_estudiante(db, id_estudiante)
    p_asis = metricas[0] if len(metricas) > 0 else 0
    prom = metricas[1] if len(metricas) > 1 else 0
    tendencia = metricas[2] if len(metricas) > 2 else "Estable"

    if p_asis < 70.0 or prom < 60.0:
        nivel_riesgo, score = "Alto", 0.85
    elif p_asis < 85.0 or prom < 75.0:
        nivel_riesgo, score = "Medio", 0.55
    else:
        nivel_riesgo, score = "Bajo", 0.15

    respuesta = ExpedienteCompletoOut(
        id_estudiante=estudiante.id_estudiante,
        nombre_completo=estudiante.nombre_completo,
        matricula=estudiante.matricula,
        carrera=nombre_carrera,
        historial_calificaciones=[{"id_materia": c.id_materia, "id_periodo": c.id_periodo, "parcial": c.parcial, "valor": float(c.valor)} for c in calificaciones],
        historial_asistencia=[{"fecha": a.fecha, "estatus": a.estatus.value if hasattr(a.estatus, 'value') else a.estatus} for a in asistencias],
        observaciones=[{"etiqueta": o.etiqueta, "nota": o.nota, "fecha_registro": o.fecha_registro} for o in observaciones],
        intervenciones=[{"tutor_nombre": n, "fecha": i.fecha, "nivel_resolucion": i.nivel_resolucion, "acuerdos": i.acuerdos, "escalado": i.escalado} for i, n in intervenciones],
        nivel_riesgo_actual=nivel_riesgo,
        score_riesgo=score
    )

    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if vista == "psicopedagogia" and user_role in ["Psicopedagogia", "Administrador"]:
        respuesta.analisis_ia_completo = {
            "es_prediccion_simulada": True,
            "factores": [
                {"variable": "porcentaje_asistencia", "peso": 0.4, "valor": f"{round(p_asis, 1)}%"},
                {"variable": "promedio_general", "peso": 0.35, "valor": f"{round(prom, 1)}"},
                {"variable": "tendencia_calificaciones", "peso": 0.25, "valor": tendencia}
            ]
        }
    
    return respuesta