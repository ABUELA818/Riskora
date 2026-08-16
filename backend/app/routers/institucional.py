from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Intervencion, Tutor, Usuario, DirectorCarrera, Carrera 
from app.schemas.institucional import IndicadoresOut, GrupoRiesgoOut, CasoEscaladoOut
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.routers.riesgo import calcular_metricas_estudiante, clasificar_riesgo
from app.schemas.carrera import CarreraResumenOut

router = APIRouter(prefix="/api/v1", tags=["Módulo Director / Institucional"])

permitir_acceso = RoleChecker(["Administrador", "Tutor", "Director", "Psicopedagogia", "Mixto"])

def verificar_carrera_director(db: Session, current_user, id_carrera: int):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Director":
        return

    asignacion = db.query(DirectorCarrera).filter(
        DirectorCarrera.id_usuario == current_user.id_usuario,
        DirectorCarrera.id_carrera == id_carrera
    ).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso sobre esta carrera."
        )


def calcular_kpis(estudiantes, db: Session):
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
        if prom < 60.0:
            reprobados += 1
        nivel, _ = clasificar_riesgo(p_asis, prom)
        if nivel == "Alto": r_alto += 1
        elif nivel == "Medio": r_medio += 1
        else: r_bajo += 1

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

def verificar_carrera_director(db: Session, current_user, id_carrera: int):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Director":
        return

    asignacion = db.query(DirectorCarrera).filter(
        DirectorCarrera.id_usuario == current_user.id_usuario,
        DirectorCarrera.id_carrera == id_carrera
    ).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso sobre esta carrera."
        )

@router.get("/carreras/resumen", response_model=List[CarreraResumenOut], dependencies=[Depends(permitir_acceso)])
def obtener_resumen_carreras(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    carreras = db.query(Carrera).all()

    # Si es Director, solo ve las carreras que dirige
    if user_role == "Director":
        mis_carreras_ids = {
            dc.id_carrera for dc in db.query(DirectorCarrera).filter(
                DirectorCarrera.id_usuario == current_user.id_usuario
            ).all()
        }
        carreras = [c for c in carreras if c.id_carrera in mis_carreras_ids]

    resultado = []
    for carrera in carreras:
        estudiantes = db.query(Estudiante).join(Grupo).filter(Grupo.id_carrera == carrera.id_carrera).all()
        kpis = calcular_kpis(estudiantes, db)

        total = kpis["total_estudiantes"]
        pct_riesgo_alto = round((kpis["riesgo_alto"] / total) * 100, 1) if total > 0 else 0.0

        director = db.query(DirectorCarrera, Usuario)\
            .join(Usuario, DirectorCarrera.id_usuario == Usuario.id_usuario)\
            .filter(DirectorCarrera.id_carrera == carrera.id_carrera)\
            .first()

        resultado.append(CarreraResumenOut(
            id_carrera=carrera.id_carrera,
            nombre=carrera.nombre,
            total_estudiantes=total,
            promedio_riesgo_alto_pct=pct_riesgo_alto,
            director_nombre=director[1].nombre_completo if director else None,
            director_id_usuario=director[1].id_usuario if director else None
        ))

    return resultado

@router.get("/director/mi-carrera")
def obtener_mi_carrera(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Director":
        raise HTTPException(status_code=403, detail="Solo Directores tienen carrera asignada.")

    asignacion = db.query(DirectorCarrera).filter(
        DirectorCarrera.id_usuario == current_user.id_usuario
    ).first()
    if not asignacion:
        raise HTTPException(status_code=404, detail="No tienes una carrera asignada. Contacta a RRHH.")

    carrera = db.query(Carrera).filter(Carrera.id_carrera == asignacion.id_carrera).first()
    return {"id_carrera": carrera.id_carrera, "nombre": carrera.nombre}

@router.get("/carreras/{id}/indicadores", response_model=IndicadoresOut, dependencies=[Depends(permitir_acceso)])
def indicadores_carrera(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    verificar_carrera_director(db, current_user, id)
    estudiantes = db.query(Estudiante).join(Grupo).filter(Grupo.id_carrera == id).all()
    return calcular_kpis(estudiantes, db)

@router.get("/carreras/{id}/riesgo-agregado-por-grupo", response_model=List[GrupoRiesgoOut], dependencies=[Depends(permitir_acceso)])
def riesgo_por_grupo(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    verificar_carrera_director(db, current_user, id)
    grupos = db.query(Grupo).filter(Grupo.id_carrera == id).all()
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
    intervenciones = db.query(Intervencion, Usuario.nombre_completo)\
        .outerjoin(Tutor, Intervencion.id_tutor == Tutor.id_tutor)\
        .outerjoin(Usuario, Tutor.id_usuario == Usuario.id_usuario)\
        .filter(Intervencion.escalado == True)\
        .order_by(Intervencion.fecha.desc())\
        .all()

    vistos = set()
    casos = []

    for inter, nombre_tutor in intervenciones:
        if inter.id_estudiante in vistos:
            continue

        estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == inter.id_estudiante).first()
        if not estudiante:
            continue

        p_asis, prom, _ = calcular_metricas_estudiante(db, inter.id_estudiante)
        _, score = clasificar_riesgo(p_asis, prom)

        casos.append(CasoEscaladoOut(
            id_estudiante=estudiante.id_estudiante,
            nombre_completo=estudiante.nombre_completo,
            matricula=estudiante.matricula,
            riesgo_score=score,
            ultimo_acuerdo=inter.acuerdos,
            tutor_nombre=nombre_tutor or "Sin tutor asignado"
        ))
        vistos.add(inter.id_estudiante)

    return casos