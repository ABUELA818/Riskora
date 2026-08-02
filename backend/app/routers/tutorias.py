from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.db.session import SessionLocal
from app.models.models import (
    Estudiante, Grupo, Tutor, Usuario, Intervencion, 
    Calificacion, ObservacionConducta, Asistencia, EstatusAsistenciaEnum
)
from app.schemas.tutoria import IntervencionCreate, IntervencionOut, ResumenCompletoOut
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.routers.riesgo import calcular_metricas_estudiante

router = APIRouter(prefix="/api/v1", tags=["Tutorías e Intervenciones"])
permitir_acceso = RoleChecker(["Tutor", "Administrador"])

# ==========================================
# FUNCIÓN HELPER: VALIDACIÓN DE PERMISOS
# ==========================================
def verificar_permiso_tutor(db: Session, current_user, id_estudiante: int):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id_estudiante).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    
    if user_role == "Administrador":
        return estudiante, None

    tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
    grupo = db.query(Grupo).filter(Grupo.id_grupo == estudiante.id_grupo).first()

    if not tutor or not grupo or grupo.id_tutor != tutor.id_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos sobre este estudiante. No está asignado a tu grupo de tutoría."
        )
    return estudiante, tutor

# ==========================================
# ENDPOINTS DE INTERVENCIONES
# ==========================================
@router.post("/estudiantes/{id_estudiante}/intervenciones", response_model=IntervencionOut, dependencies=[Depends(permitir_acceso)])
def registrar_intervencion(
    id_estudiante: int,
    data: IntervencionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    estudiante, tutor = verificar_permiso_tutor(db, current_user, id_estudiante)
    
    if not tutor:
        tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
        if not tutor:
            raise HTTPException(status_code=403, detail="Tu cuenta de administrador no tiene un perfil de tutor asociado.")

    nueva_intervencion = Intervencion(
        id_estudiante=id_estudiante,
        id_tutor=tutor.id_tutor,
        fecha=date.today(), # Se asigna automáticamente la fecha actual
        acuerdos=data.acuerdos,
        nivel_resolucion=data.nivel_resolucion
    )
    db.add(nueva_intervencion)
    db.commit()
    db.refresh(nueva_intervencion)

    return IntervencionOut(
        id_intervencion=nueva_intervencion.id_intervencion,
        id_estudiante=nueva_intervencion.id_estudiante,
        id_tutor=nueva_intervencion.id_tutor,
        nombre_tutor=current_user.nombre_completo,
        fecha=nueva_intervencion.fecha,
        acuerdos=nueva_intervencion.acuerdos,
        nivel_resolucion=nueva_intervencion.nivel_resolucion
    )

@router.get("/estudiantes/{id_estudiante}/intervenciones", response_model=List[IntervencionOut], dependencies=[Depends(permitir_acceso)])
def historial_intervenciones(id_estudiante: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    verificar_permiso_tutor(db, current_user, id_estudiante)

    resultados = db.query(Intervencion, Usuario.nombre_completo)\
        .join(Tutor, Intervencion.id_tutor == Tutor.id_tutor)\
        .join(Usuario, Tutor.id_usuario == Usuario.id_usuario)\
        .filter(Intervencion.id_estudiante == id_estudiante)\
        .order_by(Intervencion.fecha.desc())\
        .all()

    lista_salida = []
    for inter, nombre in resultados:
        lista_salida.append(IntervencionOut(
            id_intervencion=inter.id_intervencion,
            id_estudiante=inter.id_estudiante,
            id_tutor=inter.id_tutor,
            nombre_tutor=nombre,
            fecha=inter.fecha,
            acuerdos=inter.acuerdos,
            nivel_resolucion=inter.nivel_resolucion
        ))
    return lista_salida

# ==========================================
# ENDPOINT AGREGADOR (BFF): RESUMEN COMPLETO
# ==========================================
@router.get("/estudiantes/{id_estudiante}/resumen-completo", response_model=ResumenCompletoOut, dependencies=[Depends(permitir_acceso)])
def resumen_completo_estudiante(id_estudiante: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    estudiante, _ = verificar_permiso_tutor(db, current_user, id_estudiante)
    grupo = db.query(Grupo).filter(Grupo.id_grupo == estudiante.id_grupo).first()
    
    porcentaje_asistencia, promedio_general, _ = calcular_metricas_estudiante(db, id_estudiante)
    
    if porcentaje_asistencia < 70.0 or promedio_general < 60.0:
        riesgo = {"nivel": "Alto", "score": 0.85}
    elif porcentaje_asistencia < 85.0 or promedio_general < 75.0:
        riesgo = {"nivel": "Medio", "score": 0.55}
    else:
        riesgo = {"nivel": "Bajo", "score": 0.15}

    obs_raw = db.query(ObservacionConducta)\
        .filter(ObservacionConducta.id_estudiante == id_estudiante)\
        .order_by(ObservacionConducta.fecha_registro.desc()).limit(3).all()
    
    observaciones = [{"etiqueta": o.etiqueta, "nota": o.nota, "fecha": o.fecha_registro} for o in obs_raw]

    inter_raw = db.query(Intervencion, Usuario.nombre_completo)\
        .join(Tutor, Intervencion.id_tutor == Tutor.id_tutor)\
        .join(Usuario, Tutor.id_usuario == Usuario.id_usuario)\
        .filter(Intervencion.id_estudiante == id_estudiante)\
        .order_by(Intervencion.fecha.desc()).limit(5).all()

    intervenciones = []
    for inter, nombre in inter_raw:
        intervenciones.append(IntervencionOut(
            id_intervencion=inter.id_intervencion,
            id_estudiante=inter.id_estudiante,
            id_tutor=inter.id_tutor,
            nombre_tutor=nombre,
            fecha=inter.fecha,
            acuerdos=inter.acuerdos,
            nivel_resolucion=inter.nivel_resolucion
        ))

    return {
        "id_estudiante": estudiante.id_estudiante,
        "nombre_completo": estudiante.nombre_completo,
        "matricula": estudiante.matricula,
        "carrera": grupo.carrera if grupo else "N/A",
        "riesgo": {
            "nivel_riesgo": riesgo["nivel"],
            "score": riesgo["score"],
            "es_prediccion_simulada": True
        },
        "porcentaje_asistencia": round(porcentaje_asistencia, 1),
        "promedio_general": round(promedio_general, 1),
        "observaciones_recientes": observaciones,
        "intervenciones_recientes": intervenciones
    }