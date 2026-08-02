import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.db.session import SessionLocal
from app.models.models import Usuario, Docente, Tutor, Grupo, RolEnum
from app.schemas.rrhh import PersonalCreate, PersonalOut, CambioRolIn, MetricasRRHHOut, MetricaCarrera
from app.core.deps import get_db, RoleChecker
from app.core.security import get_password_hash 

router = APIRouter(prefix="/api/v1", tags=["Recursos Humanos"])
permitir_rrhh = RoleChecker(["RRHH", "Administrador"])

@router.get("/personal", response_model=List[PersonalOut], dependencies=[Depends(permitir_rrhh)])
def obtener_directorio_personal(
    rol: Optional[str] = Query(None),
    carrera: Optional[str] = Query(None),
    nombre: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Uso correcto del ENUM
    roles_permitidos = [RolEnum.DOCENTE, RolEnum.TUTOR, RolEnum.PSICOPEDAGOGIA, RolEnum.DIRECTOR, RolEnum.RRHH]
    query = db.query(Usuario).filter(Usuario.rol.in_(roles_permitidos))

    if rol and rol != "Todos los Roles":
        rol_enum = getattr(RolEnum, rol.upper().replace(" ", "_"), None)
        if rol_enum:
            query = query.filter(Usuario.rol == rol_enum)
            
    if nombre:
        query = query.filter(Usuario.nombre_completo.ilike(f"%{nombre}%") | Usuario.correo_institucional.ilike(f"%{nombre}%"))
    
    if carrera:
        query = query.join(Tutor, Usuario.id_usuario == Tutor.id_usuario)\
                     .join(Grupo, Tutor.id_tutor == Grupo.id_tutor)\
                     .filter(Grupo.carrera.ilike(f"%{carrera}%"))
                     
    usuarios = query.all()
    
    # Mapeo manual para asegurar que "correo_institucional" se envíe como "correo" al frontend
    return [
        PersonalOut(
            id_usuario=u.id_usuario,
            nombre_completo=u.nombre_completo,
            correo=u.correo_institucional,
            rol=u.rol.value if hasattr(u.rol, 'value') else str(u.rol),
            estado=u.estado
        ) for u in usuarios
    ]

@router.post("/personal", response_model=PersonalOut, dependencies=[Depends(permitir_rrhh)])
def registrar_personal(data: PersonalCreate, db: Session = Depends(get_db)):
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
        token_version=1
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    print(f"ALERTA TEMP: Contraseña generada para {data.correo}: {password_temporal}")

    return PersonalOut(
        id_usuario=nuevo_usuario.id_usuario,
        nombre_completo=nuevo_usuario.nombre_completo,
        correo=nuevo_usuario.correo_institucional,
        rol=nuevo_usuario.rol.value,
        estado=nuevo_usuario.estado
    )

@router.put("/usuarios/{id_usuario}/rol", dependencies=[Depends(permitir_rrhh)])
def cambiar_rol_usuario(id_usuario: int, data: CambioRolIn, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

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

    distribucion = db.query(Grupo.carrera, func.count(Tutor.id_tutor))\
        .join(Tutor, Grupo.id_tutor == Tutor.id_tutor)\
        .group_by(Grupo.carrera).all()

    dist_formateada = [MetricaCarrera(carrera=c, cantidad=q) for c, q in distribucion if c]

    return MetricasRRHHOut(
        total_docentes=total_doc,
        total_tutores=total_tut,
        total_psicopedagogia=total_psi,
        distribucion_carreras=dist_formateada
    )