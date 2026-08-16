from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import SessionLocal
from app.models.models import Calificacion, ObservacionConducta, Grupo, Tutor, Docente, Horario, Estudiante
from app.schemas.evaluacion import (
    CalificacionCreate, CalificacionOut, ResumenCalificacionesOut, ResumenMateria,
    ObservacionCreate, ObservacionOut
)
from app.core.deps import get_db, RoleChecker, get_current_active_user

router = APIRouter(prefix="/api/v1", tags=["Evaluaciones"])
permitir_acceso = RoleChecker(["Docente", "Tutor", "Administrador", "Mixto"])

@router.post("/estudiantes/{id_estudiante}/calificaciones", response_model=CalificacionOut, dependencies=[Depends(permitir_acceso)])
def registrar_calificacion(
    id_estudiante: int,
    data: CalificacionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    if user_role == "Tutor":
        grupo = db.query(Grupo).filter(Grupo.id_grupo == data.grupo_id).first()
        tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
        if not grupo or not tutor or grupo.id_tutor != tutor.id_tutor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes capturar calificaciones de un grupo que no tutoras."
            )

    elif user_role == "Docente":
        docente = db.query(Docente).filter(Docente.id_usuario == current_user.id_usuario).first()
        tiene_horario = db.query(Horario).filter(
            Horario.id_grupo == data.grupo_id,
            Horario.id_materia == data.id_materia,
            Horario.id_docente == (docente.id_docente if docente else None)
        ).first()
        if not docente or not tiene_horario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No impartes esta materia en este grupo."
            )

    nueva_calificacion = Calificacion(
        id_estudiante=id_estudiante,
        id_materia=data.id_materia,
        id_periodo=data.id_periodo,
        parcial=data.parcial,
        valor=data.valor
    )
    db.add(nueva_calificacion)
    db.commit()
    db.refresh(nueva_calificacion)
    return nueva_calificacion

@router.get("/estudiantes/{id_estudiante}/calificaciones/resumen", response_model=ResumenCalificacionesOut, dependencies=[Depends(permitir_acceso)])
def obtener_resumen_calificaciones(id_estudiante: int, db: Session = Depends(get_db)):
    calificaciones = db.query(Calificacion).filter(Calificacion.id_estudiante == id_estudiante).order_by(Calificacion.parcial.asc()).all()
    
    if not calificaciones:
        return ResumenCalificacionesOut(id_estudiante=id_estudiante, promedio_general=0.0, tendencia="Sin datos", detalle_materias=[])

    materias_dict = {}
    suma_total = 0
    
    for c in calificaciones:
        val = float(c.valor)
        suma_total += val
        if c.id_materia not in materias_dict:
            materias_dict[c.id_materia] = []
        materias_dict[c.id_materia].append(val)

    detalle_materias = []
    for m_id, califs in materias_dict.items():
        promedio_materia = sum(califs) / len(califs)
        detalle_materias.append(ResumenMateria(id_materia=m_id, promedio=round(promedio_materia, 2), calificaciones=califs))

    promedio_general = suma_total / len(calificaciones)

    tendencia = "Estable"
    parciales_registrados = sorted(list(set([c.parcial for c in calificaciones])))
    
    if len(parciales_registrados) >= 2:
        ult_parcial = parciales_registrados[-1]
        penult_parcial = parciales_registrados[-2]
        
        califs_ult = [float(c.valor) for c in calificaciones if c.parcial == ult_parcial]
        califs_penult = [float(c.valor) for c in calificaciones if c.parcial == penult_parcial]
        
        promedio_ult = sum(califs_ult) / len(califs_ult) if califs_ult else 0
        promedio_penult = sum(califs_penult) / len(califs_penult) if califs_penult else 0
        
        diferencia = promedio_ult - promedio_penult
        if diferencia >= 3.0: 
            tendencia = "Sube"
        elif diferencia <= -3.0: 
            tendencia = "Baja"

    return ResumenCalificacionesOut(
        id_estudiante=id_estudiante,
        promedio_general=round(promedio_general, 2),
        tendencia=tendencia,
        detalle_materias=detalle_materias
    )

@router.post("/estudiantes/{id_estudiante}/observaciones", response_model=ObservacionOut, dependencies=[Depends(permitir_acceso)])
def registrar_observacion(
    id_estudiante: int,
    data: ObservacionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    docente = db.query(Docente).filter(Docente.id_usuario == current_user.id_usuario).first()
    if not docente:
        raise HTTPException(status_code=403, detail="Solo los docentes pueden registrar observaciones.")

    nueva_obs = ObservacionConducta(
        id_estudiante=id_estudiante,
        id_docente=docente.id_docente,
        etiqueta=data.etiqueta,
        nota=data.nota
    )
    db.add(nueva_obs)
    db.commit()
    db.refresh(nueva_obs)
    return nueva_obs

@router.get("/estudiantes/{id_estudiante}/observaciones", response_model=List[ObservacionOut], dependencies=[Depends(permitir_acceso)])
def historial_observaciones(id_estudiante: int, db: Session = Depends(get_db)):
    observaciones = db.query(ObservacionConducta)\
        .filter(ObservacionConducta.id_estudiante == id_estudiante)\
        .order_by(ObservacionConducta.fecha_registro.desc())\
        .all()
    return observaciones

@router.get("/grupos/{id_grupo}/calificaciones", response_model=List[CalificacionOut], dependencies=[Depends(permitir_acceso)])
def calificaciones_del_grupo(id_grupo: int, id_materia: int, id_periodo: int = 1, db: Session = Depends(get_db)):
    ids_estudiantes = [e.id_estudiante for e in db.query(Estudiante).filter(Estudiante.id_grupo == id_grupo).all()]
    return db.query(Calificacion).filter(
        Calificacion.id_estudiante.in_(ids_estudiantes),
        Calificacion.id_materia == id_materia,
        Calificacion.id_periodo == id_periodo
    ).all()