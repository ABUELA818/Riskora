from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.db.session import SessionLocal
from app.models.models import Asistencia, Grupo, Horario, Tutor, EstatusAsistenciaEnum
from app.schemas.asistencia import AsistenciaMasiva, AsistenciaOut, ResumenAsistenciaOut
from app.core.deps import get_db, RoleChecker, get_current_active_user

router = APIRouter(prefix="/api/v1", tags=["Asistencia"])

# Permitimos acceso a Docentes, Tutores y Administradores
permitir_acceso = RoleChecker(["Docente", "Tutor", "Administrador"])

@router.post("/asistencia", dependencies=[Depends(permitir_acceso)])
def registrar_asistencia_masiva(
    data: AsistenciaMasiva,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # 1. Validar que el grupo exista
    grupo = db.query(Grupo).filter(Grupo.id_grupo == data.grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    # 2. Validar propiedad del grupo (RBAC - 403)
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    
    if user_role != "Administrador":
        # Buscamos el ID del tutor asociado al usuario actual
        tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
        
        # En el MER, el grupo tiene un id_tutor asignado
        if not tutor or grupo.id_tutor != tutor.id_tutor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para tomar asistencia de un grupo que no tienes asignado."
            )

    # 3. Regla de no-duplicidad (409)
    asistencia_existente = db.query(Asistencia).filter(
        Asistencia.fecha == data.fecha,
        Asistencia.id_horario == data.id_horario
    ).first()

    if asistencia_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un registro de asistencia para este grupo en este horario y fecha."
        )

    # 4. Inserción de registros
    nuevas_asistencias = []
    for ast in data.asistencias:
        nueva = Asistencia(
            id_estudiante=ast.id_estudiante,
            id_horario=data.id_horario,
            fecha=data.fecha,
            estatus=ast.estatus
        )
        db.add(nueva)
        nuevas_asistencias.append(nueva)

    db.commit()
    return {"message": f"Asistencia registrada correctamente para {len(nuevas_asistencias)} estudiantes."}

@router.get("/asistencia", response_model=List[AsistenciaOut], dependencies=[Depends(permitir_acceso)])
def consultar_asistencia(grupo_id: int, fecha: date, db: Session = Depends(get_db)):
    # Extraemos los IDs de los horarios que pertenecen a este grupo
    horarios_grupo = db.query(Horario.id_horario).filter(Horario.id_grupo == grupo_id).subquery()
    
    asistencias = db.query(Asistencia).filter(
        Asistencia.fecha == fecha,
        Asistencia.id_horario.in_(horarios_grupo)
    ).all()
    
    return asistencias

@router.get("/estudiantes/{id}/asistencia/resumen", response_model=ResumenAsistenciaOut, dependencies=[Depends(permitir_acceso)])
def resumen_asistencia(id: int, db: Session = Depends(get_db)):
    registros = db.query(Asistencia).filter(Asistencia.id_estudiante == id).all()
    total_clases = len(registros)

    # Si no hay registros, devolvemos 0 para evitar divisiones por cero
    if total_clases == 0:
        return {
            "id_estudiante": id,
            "total_clases": 0,
            "asistencias": 0,
            "ausencias": 0,
            "porcentaje_asistencia": 0.0
        }

    # Contamos Presentes y Retardos como asistencias válidas
    asistencias_validas = sum(1 for r in registros if r.estatus in [EstatusAsistenciaEnum.PRESENTE, EstatusAsistenciaEnum.RETARDO])
    ausencias = sum(1 for r in registros if r.estatus == EstatusAsistenciaEnum.AUSENTE)

    porcentaje = (asistencias_validas / total_clases) * 100

    return {
        "id_estudiante": id,
        "total_clases": total_clases,
        "asistencias": asistencias_validas,
        "ausencias": ausencias,
        "porcentaje_asistencia": round(porcentaje, 2)
    }