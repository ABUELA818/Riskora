import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import Usuario, Docente, Tutor, Grupo, RolEnum, DirectorCarrera, DocenteCarrera, Carrera, LogAuditoria
from app.schemas.rrhh import PersonalCreate, PersonalOut, CambioRolIn, MetricasRRHHOut, MetricaCarrera, LogAuditoriaOut 
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.core.security import get_password_hash 
from app.core.email import enviar_credenciales_temporales

router = APIRouter(prefix="/api/v1", tags=["Recursos Humanos"])
permitir_rrhh = RoleChecker(["RRHH", "Administrador", "Director"])


def usuario_pertenece_a_carrera_director(db: Session, id_usuario_objetivo: int, current_user) -> bool:
    mis_carreras = [c.id_carrera for c in db.query(DirectorCarrera).filter(
        DirectorCarrera.id_usuario == current_user.id_usuario
    ).all()]
    if not mis_carreras:
        return False

    docente = db.query(Docente).filter(Docente.id_usuario == id_usuario_objetivo).first()
    if docente:
        asignado = db.query(DocenteCarrera).filter(
            DocenteCarrera.id_docente == docente.id_docente,
            DocenteCarrera.id_carrera.in_(mis_carreras)
        ).first()
        if asignado:
            return True

    tutor = db.query(Tutor).filter(Tutor.id_usuario == id_usuario_objetivo).first()
    if tutor:
        grupo = db.query(Grupo).filter(
            Grupo.id_tutor == tutor.id_tutor,
            Grupo.id_carrera.in_(mis_carreras)
        ).first()
        if grupo:
            return True

    return False


@router.get("/personal", response_model=List[PersonalOut], dependencies=[Depends(permitir_rrhh)])
def obtener_directorio_personal(
    rol: Optional[str] = Query(None),
    carrera: Optional[str] = Query(None),
    nombre: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    roles_permitidos = [RolEnum.DOCENTE, RolEnum.TUTOR, RolEnum.PSICOPEDAGOGIA, RolEnum.DIRECTOR, RolEnum.RRHH]
    query = db.query(Usuario).filter(Usuario.rol.in_(roles_permitidos))

    if user_role == "Director":
        mis_carreras = [c.id_carrera for c in db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario
        ).all()]

        docentes_ids = {
            d.id_usuario for d in db.query(Docente)
            .join(DocenteCarrera, Docente.id_docente == DocenteCarrera.id_docente)
            .filter(DocenteCarrera.id_carrera.in_(mis_carreras or [-1]))
            .all()
        }
        tutores_ids = {
            t.id_usuario for t in db.query(Tutor)
            .join(Grupo, Grupo.id_tutor == Tutor.id_tutor)
            .filter(Grupo.id_carrera.in_(mis_carreras or [-1]))
            .all()
        }
        ids_permitidos = docentes_ids | tutores_ids
        query = query.filter(Usuario.id_usuario.in_(ids_permitidos or [-1]))

    if rol and rol != "Todos los Roles":
        rol_enum = getattr(RolEnum, rol.upper().replace(" ", "_"), None)
        if rol_enum:
            query = query.filter(Usuario.rol == rol_enum)
            
    if nombre:
        query = query.filter(Usuario.nombre_completo.ilike(f"%{nombre}%") | Usuario.correo_institucional.ilike(f"%{nombre}%"))
    
    if carrera:
        query = query.join(Tutor, Usuario.id_usuario == Tutor.id_usuario)\
                     .join(Grupo, Tutor.id_tutor == Grupo.id_tutor)\
                     .filter(Grupo.id_carrera == carrera)
                     
    usuarios = query.all()
    
    return [
        PersonalOut(
            id_usuario=u.id_usuario,
            nombre_completo=u.nombre_completo,
            correo=u.correo_institucional,
            rol=u.rol.value if hasattr(u.rol, 'value') else str(u.rol),
            estado=u.estado,
            telefono=u.telefono,
            telefono_familiar=u.telefono_familiar,
            imagen_url=u.imagen_url
        ) for u in usuarios
    ]

permitir_auditoria = RoleChecker(["RRHH", "Administrador"])

@router.get("/logs-auditoria", response_model=List[LogAuditoriaOut], dependencies=[Depends(permitir_auditoria)])
def obtener_logs_auditoria(
    id_usuario: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(LogAuditoria, Usuario.nombre_completo)\
        .outerjoin(Usuario, LogAuditoria.id_usuario == Usuario.id_usuario)\
        .order_by(desc(LogAuditoria.timestamp))

    if id_usuario:
        query = query.filter(LogAuditoria.id_usuario == id_usuario)

    resultados = query.limit(limit).all()

    return [
        LogAuditoriaOut(
            id_log=log.id_log,
            id_usuario=log.id_usuario,
            nombre_usuario=nombre or "Usuario eliminado",
            accion=log.accion,
            endpoint=log.endpoint,
            timestamp=log.timestamp
        ) for log, nombre in resultados
    ]

@router.post("/personal", response_model=PersonalOut, dependencies=[Depends(permitir_rrhh)])
def registrar_personal(
    data: PersonalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    if user_role == "Director" and data.rol not in ("Docente", "Tutor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Como Director solo puedes dar de alta Docentes o Tutores."
        )

    if data.rol in ("Docente", "Tutor") and not data.id_carrera:
        raise HTTPException(status_code=400, detail="Debes indicar la carrera para este rol.")

    if data.rol == "Director":
        if not data.id_carrera:
            raise HTTPException(status_code=400, detail="Debes indicar la carrera para el nuevo Director.")

    if user_role == "Director":
        mis_carreras = [c.id_carrera for c in db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario
        ).all()]
        if data.id_carrera not in mis_carreras:
            raise HTTPException(status_code=403, detail="No puedes asignar personal a una carrera que no diriges.")

    usuario_existente = db.query(Usuario).filter(Usuario.correo_institucional == data.correo).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado en el sistema.")

    password_temporal = secrets.token_urlsafe(8)
    hashed_password = get_password_hash(password_temporal)
    
    nuevo_rol = getattr(RolEnum, data.rol.upper().replace(" ", "_"), RolEnum.DOCENTE)

    nuevo_usuario = Usuario(
        nombre_completo=data.nombre_completo,
        correo_institucional=data.correo,
        password_hash=hashed_password,
        rol=nuevo_rol,
        telefono=data.telefono,
        telefono_familiar=data.telefono_familiar,
        imagen_url=data.imagen_url,
        token_version=1
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    if nuevo_rol == RolEnum.DOCENTE:
        nuevo_docente = Docente(
            id_usuario=nuevo_usuario.id_usuario,
            numero_empleado=f"DOC-{nuevo_usuario.id_usuario}"
        )
        db.add(nuevo_docente)
        db.commit()
        db.refresh(nuevo_docente)
        db.add(DocenteCarrera(id_docente=nuevo_docente.id_docente, id_carrera=data.id_carrera))
        db.commit()

    elif nuevo_rol == RolEnum.TUTOR:
        nuevo_tutor = Tutor(
            id_usuario=nuevo_usuario.id_usuario,
            numero_empleado=f"TUT-{nuevo_usuario.id_usuario}"
        )
        db.add(nuevo_tutor)
        db.commit()

    elif nuevo_rol == RolEnum.DIRECTOR:
        db.add(DirectorCarrera(id_usuario=nuevo_usuario.id_usuario, id_carrera=data.id_carrera))
        db.commit()

    enviar_credenciales_temporales(
        correo_destino=nuevo_usuario.correo_institucional,
        nombre_completo=nuevo_usuario.nombre_completo,
        password_temporal=password_temporal,
        rol=nuevo_usuario.rol.value
    )

    return PersonalOut(
        id_usuario=nuevo_usuario.id_usuario,
        nombre_completo=nuevo_usuario.nombre_completo,
        correo=nuevo_usuario.correo_institucional,
        rol=nuevo_usuario.rol.value,
        estado=nuevo_usuario.estado,
        telefono=nuevo_usuario.telefono,
        telefono_familiar=nuevo_usuario.telefono_familiar,
        imagen_url=nuevo_usuario.imagen_url
    )

@router.put("/usuarios/{id_usuario}/rol", dependencies=[Depends(permitir_rrhh)])
def cambiar_rol_usuario(
    id_usuario: int,
    data: CambioRolIn,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    if user_role == "Director":
        if data.nuevo_rol not in ("Docente", "Tutor"):
            raise HTTPException(status_code=403, detail="Como Director solo puedes asignar los roles Docente o Tutor.")
        if not usuario_pertenece_a_carrera_director(db, id_usuario, current_user):
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar a este usuario.")

    nuevo_rol_enum = getattr(RolEnum, data.nuevo_rol.upper().replace(" ", "_"), None)
    if not nuevo_rol_enum:
        raise HTTPException(status_code=400, detail="Rol inválido")

    usuario.rol = nuevo_rol_enum
    usuario.token_version += 1
    db.commit()
    return {"message": "Rol actualizado con éxito"}


@router.get("/personal/metricas", response_model=MetricasRRHHOut, dependencies=[Depends(permitir_rrhh)])
def metricas_rrhh(db: Session = Depends(get_db)):
    total_doc = db.query(Usuario).filter(Usuario.rol == RolEnum.DOCENTE, Usuario.estado == True).count()
    total_tut = db.query(Usuario).filter(Usuario.rol == RolEnum.TUTOR, Usuario.estado == True).count()
    total_psi = db.query(Usuario).filter(Usuario.rol == RolEnum.PSICOPEDAGOGIA, Usuario.estado == True).count()
    total_dir = db.query(Usuario).filter(Usuario.rol == RolEnum.DIRECTOR, Usuario.estado == True).count()
    total_rrhh = db.query(Usuario).filter(Usuario.rol == RolEnum.RRHH, Usuario.estado == True).count()

    ahora = datetime.utcnow()
    primer_dia_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    roles_gestionados = [
        RolEnum.DOCENTE, RolEnum.TUTOR, RolEnum.PSICOPEDAGOGIA,
        RolEnum.DIRECTOR, RolEnum.RRHH
    ]
    altas_mes = db.query(Usuario).filter(
        Usuario.rol.in_(roles_gestionados),
        Usuario.fecha_creacion >= primer_dia_mes
    ).count()

    distribucion = db.query(Carrera.nombre, func.count(Tutor.id_tutor))\
        .join(Grupo, Grupo.id_carrera == Carrera.id_carrera)\
        .join(Tutor, Grupo.id_tutor == Tutor.id_tutor)\
        .group_by(Carrera.nombre).all()

    dist_formateada = [MetricaCarrera(carrera=c, cantidad=q) for c, q in distribucion if c]

    return MetricasRRHHOut(
        total_docentes=total_doc,
        total_tutores=total_tut,
        total_directores=total_dir,
        total_rrhh=total_rrhh,
        total_psicopedagogia=total_psi,
        altas_mes=altas_mes,
        distribucion_carreras=dist_formateada
     )