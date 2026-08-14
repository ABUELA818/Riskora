import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.email import enviar_credenciales_temporales

from app.db.session import SessionLocal
from app.models.models import (
    SolicitudPersonal, EstadoSolicitudEnum, Usuario, Docente, Tutor,
    DirectorCarrera, DocenteCarrera, RolEnum, Carrera
)
from app.schemas.solicitudes import SolicitudPersonalCreate, SolicitudPersonalOut, SolicitudRechazoIn
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/v1", tags=["Solicitudes de Personal"])

permitir_solicitar = RoleChecker(["Director", "Administrador"])
permitir_resolver = RoleChecker(["RRHH", "Administrador"])


def _armar_salida(s: SolicitudPersonal, db: Session) -> SolicitudPersonalOut:
    carrera = db.query(Carrera).filter(Carrera.id_carrera == s.id_carrera).first() if s.id_carrera else None
    solicitante = db.query(Usuario).filter(Usuario.id_usuario == s.id_usuario_solicitante).first()
    return SolicitudPersonalOut(
        id_solicitud=s.id_solicitud,
        nombre_completo=s.nombre_completo,
        correo=s.correo,
        telefono=s.telefono,
        telefono_familiar=s.telefono_familiar,
        imagen_url=s.imagen_url,
        horas_semanales=s.horas_semanales,
        rol_solicitado=s.rol_solicitado,
        id_carrera=s.id_carrera,
        nombre_carrera=carrera.nombre if carrera else None,
        estado=s.estado.value if hasattr(s.estado, 'value') else s.estado,
        nombre_solicitante=solicitante.nombre_completo if solicitante else None,
        motivo_rechazo=s.motivo_rechazo,
        fecha_solicitud=s.fecha_solicitud
    )


@router.post("/solicitudes-personal", response_model=SolicitudPersonalOut, dependencies=[Depends(permitir_solicitar)])
def crear_solicitud_personal(
    data: SolicitudPersonalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    if data.rol_solicitado not in ("Docente", "Tutor"):
        raise HTTPException(status_code=400, detail="Solo puedes solicitar altas de Docente o Tutor.")

    if user_role == "Director":
        mis_carreras = [c.id_carrera for c in db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario
        ).all()]
        if data.id_carrera not in mis_carreras:
            raise HTTPException(status_code=403, detail="No puedes solicitar personal para una carrera que no diriges.")

    if db.query(Usuario).filter(Usuario.correo_institucional == data.correo).first():
        raise HTTPException(status_code=400, detail="Ya existe un usuario registrado con este correo.")

    nueva_solicitud = SolicitudPersonal(
        nombre_completo=data.nombre_completo,
        correo=data.correo,
        telefono=data.telefono,
        telefono_familiar=data.telefono_familiar,
        imagen_url=data.imagen_url,
        horas_semanales=data.horas_semanales,
        rol_solicitado=data.rol_solicitado,
        id_carrera=data.id_carrera,
        estado=EstadoSolicitudEnum.PENDIENTE,
        id_usuario_solicitante=current_user.id_usuario
    )
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)
    return _armar_salida(nueva_solicitud, db)


@router.get("/solicitudes-personal", response_model=List[SolicitudPersonalOut])
def listar_solicitudes(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    query = db.query(SolicitudPersonal).order_by(SolicitudPersonal.fecha_solicitud.desc())

    if user_role == "Director":
        mis_carreras = [c.id_carrera for c in db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario
        ).all()]
        query = query.filter(SolicitudPersonal.id_carrera.in_(mis_carreras))
    elif user_role not in ("RRHH", "Administrador"):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver solicitudes de personal.")

    return [_armar_salida(s, db) for s in query.all()]


@router.put("/solicitudes-personal/{id_solicitud}/aceptar", dependencies=[Depends(permitir_resolver)])
def aceptar_solicitud(id_solicitud: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    solicitud = db.query(SolicitudPersonal).filter(SolicitudPersonal.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if solicitud.estado != EstadoSolicitudEnum.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue resuelta.")
    if db.query(Usuario).filter(Usuario.correo_institucional == solicitud.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado en el sistema.")

    password_temporal = secrets.token_urlsafe(8)
    nuevo_rol = getattr(RolEnum, solicitud.rol_solicitado.upper().replace(" ", "_"), RolEnum.DOCENTE)

    nuevo_usuario = Usuario(
        nombre_completo=solicitud.nombre_completo,
        correo_institucional=solicitud.correo,
        password_hash=get_password_hash(password_temporal),
        rol=nuevo_rol,
        telefono=solicitud.telefono,
        telefono_familiar=solicitud.telefono_familiar,
        imagen_url=solicitud.imagen_url,
        token_version=1
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    if nuevo_rol == RolEnum.DOCENTE:
        nuevo_docente = Docente(id_usuario=nuevo_usuario.id_usuario, numero_empleado=f"DOC-{nuevo_usuario.id_usuario}")
        db.add(nuevo_docente)
        db.commit()
        db.refresh(nuevo_docente)
        if solicitud.id_carrera:
            db.add(DocenteCarrera(id_docente=nuevo_docente.id_docente, id_carrera=solicitud.id_carrera))
            db.commit()
    elif nuevo_rol == RolEnum.TUTOR:
        db.add(Tutor(id_usuario=nuevo_usuario.id_usuario, numero_empleado=f"TUT-{nuevo_usuario.id_usuario}"))
        db.commit()

    solicitud.estado = EstadoSolicitudEnum.ACEPTADA
    solicitud.fecha_resolucion = datetime.utcnow()
    solicitud.id_usuario_resolutor = current_user.id_usuario
    db.commit()

    enviar_credenciales_temporales(
        correo_destino=nuevo_usuario.correo_institucional,
        nombre_completo=nuevo_usuario.nombre_completo,
        password_temporal=password_temporal,
        rol=nuevo_usuario.rol.value
    )

    return {"message": "Solicitud aceptada. Usuario creado correctamente.", "id_usuario": nuevo_usuario.id_usuario}


@router.put("/solicitudes-personal/{id_solicitud}/rechazar", dependencies=[Depends(permitir_resolver)])
def rechazar_solicitud(id_solicitud: int, data: SolicitudRechazoIn, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    solicitud = db.query(SolicitudPersonal).filter(SolicitudPersonal.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if solicitud.estado != EstadoSolicitudEnum.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue resuelta.")

    solicitud.estado = EstadoSolicitudEnum.RECHAZADA
    solicitud.motivo_rechazo = data.motivo_rechazo
    solicitud.fecha_resolucion = datetime.utcnow()
    solicitud.id_usuario_resolutor = current_user.id_usuario
    db.commit()
    return {"message": "Solicitud rechazada."}