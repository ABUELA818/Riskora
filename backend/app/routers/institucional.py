from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Intervencion, Tutor, Usuario
from app.schemas.institucional import IndicadoresOut, GrupoRiesgoOut, CasoEscaladoOut
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.routers.riesgo import calcular_metricas_estudiante

router = APIRouter(prefix="/api/v1", tags=["Módulo Director / Institucional"])

# Permisos generales para el módulo (Tutor y Administrador)
permitir_acceso = RoleChecker(["Administrador", "Tutor", "Director", "Psicopedagogia"])

def calcular_kpis(estudiantes, db: Session):
    # Criterio de aceptación: Evitar error 500 si no hay estudiantes
    if not estudiantes:
        return {
            "total_estudiantes": 0,
            "promedio_general_carrera": 0.0,
            "porcentaje_reprobacion": 0.0,
            "riesgo_bajo": 0,
            "riesgo_medio": 0,
            "riesgo_alto": 0
        }

    total = len(estudiantes)
    reprobados = 0
    suma_promedios = 0
    r_bajo = r_medio = r_alto = 0

    for est in estudiantes:
        p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
        suma_promedios += prom

        # Criterio: Reprobación es promedio < 60.0 (en escala 0-100)
        if prom < 60.0:
            reprobados += 1

        # Criterio: Clasificación de riesgo coherente con el mock
        if p_asis < 70.0 or prom < 60.0:
            r_alto += 1
        elif p_asis < 85.0 or prom < 75.0:
            r_medio += 1
        else:
            r_bajo += 1

    promedio_final = suma_promedios / total
    porcentaje_rep = (reprobados / total) * 100

    return {
        "total_estudiantes": total,
        "promedio_general_carrera": round(promedio_final, 1),
        "porcentaje_reprobacion": round(porcentaje_rep, 1),
        "riesgo_bajo": r_bajo,
        "riesgo_medio": r_medio,
        "riesgo_alto": r_alto
    }

@router.get("/carreras/{id}/indicadores", response_model=IndicadoresOut, dependencies=[Depends(permitir_acceso)])
def indicadores_carrera(id: str, db: Session = Depends(get_db)):
    # Asumimos que id mapea al campo "carrera" en la tabla Grupo
    estudiantes = db.query(Estudiante).join(Grupo).filter(Grupo.carrera == id).all()
    return calcular_kpis(estudiantes, db)

@router.get("/carreras/{id}/riesgo-agregado-por-grupo", response_model=List[GrupoRiesgoOut], dependencies=[Depends(permitir_acceso)])
def riesgo_por_grupo(id: str, db: Session = Depends(get_db)):
    grupos = db.query(Grupo).filter(Grupo.carrera == id).all()
    resultados = []

    for grupo in grupos:
        estudiantes = db.query(Estudiante).filter(Estudiante.id_grupo == grupo.id_grupo).all()
        kpis = calcular_kpis(estudiantes, db)
        
        resultados.append(GrupoRiesgoOut(
            id_grupo=grupo.id_grupo,
            nombre_grupo=grupo.nombre_grupo,
            total_estudiantes=kpis["total_estudiantes"],
            riesgo_bajo=kpis["riesgo_bajo"],
            riesgo_medio=kpis["riesgo_medio"],
            riesgo_alto=kpis["riesgo_alto"]
        ))
        
    return resultados

@router.get("/institucional/indicadores", response_model=IndicadoresOut)
def indicadores_institucionales(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Criterio de aceptación: Bloqueo estricto a Docentes (403)
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role == "Docente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acceso denegado. Un docente no puede consultar indicadores a nivel institucional."
        )

    estudiantes = db.query(Estudiante).filter(Estudiante.estado == True).all()
    return calcular_kpis(estudiantes, db)

@router.get("/casos-escalados", response_model=List[CasoEscaladoOut], dependencies=[Depends(permitir_acceso)])
def casos_escalados(db: Session = Depends(get_db)):
    # Buscamos intervenciones marcadas como escaladas
    intervenciones = db.query(Intervencion, Usuario.nombre_completo)\
        .join(Tutor, Intervencion.id_tutor == Tutor.id_tutor)\
        .join(Usuario, Tutor.id_usuario == Usuario.id_usuario)\
        .filter(Intervencion.escalado == True)\
        .order_by(Intervencion.fecha.desc())\
        .all()

    vistos = set()
    casos = []

    for inter, nombre_tutor in intervenciones:
        if inter.id_estudiante in vistos:
            continue
        
        # Validamos si actualmente está en riesgo Alto
        p_asis, prom, _ = calcular_metricas_estudiante(db, inter.id_estudiante)
        if p_asis < 70.0 or prom < 60.0:
            estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == inter.id_estudiante).first()
            if estudiante:
                casos.append(CasoEscaladoOut(
                    id_estudiante=estudiante.id_estudiante,
                    nombre_completo=estudiante.nombre_completo,
                    matricula=estudiante.matricula,
                    riesgo_score=0.85, # Score fijo de riesgo Alto según el mock
                    ultimo_acuerdo=inter.acuerdos,
                    tutor_nombre=nombre_tutor
                ))
                vistos.add(inter.id_estudiante)
                
    return casos