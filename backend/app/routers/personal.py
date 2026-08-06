from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import (
    Usuario, Docente, Tutor, DocenteCarrera, DirectorCarrera, Grupo,
    DocenteMateria, Materia, ObservacionConducta, Carrera, Estudiante, RolEnum
)
from app.schemas.personal import (
    PersonalDetalleOut, PersonalUpdate, AsignarMateriaIn,
    MateriaImpartidaOut, ObservacionEnviadaOut
)
from app.core.deps import get_db, RoleChecker

router = APIRouter(prefix="/api/v1", tags=["Expediente Laboral"])

permitir_ver = RoleChecker(["Administrador", "Director", "RRHH"])
permitir_editar = RoleChecker(["Administrador", "RRHH"])
permitir_materias = RoleChecker(["Administrador", "RRHH", "Director"])


def _calcular_antiguedad(fecha_creacion) -> str:
    if not fecha_creacion:
        return "Sin datos"
    dias = (datetime.utcnow() - fecha_creacion).days
    anios = dias // 365
    meses = (dias % 365) // 30
    if anios == 0 and meses == 0:
        return "Menos de un mes"
    partes = []
    if anios > 0:
        partes.append(f"{anios} año{'s' if anios != 1 else ''}")
    if meses > 0:
        partes.append(f"{meses} mes{'es' if meses != 1 else ''}")
    return " y ".join(partes)


def _construir_expediente(id_usuario: int, db: Session) -> PersonalDetalleOut:
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    rol_valor = usuario.rol.value if hasattr(usuario.rol, 'value') else usuario.rol
    carreras_nombres = []
    materias_impartidas = []
    observaciones = []

    docente = db.query(Docente).filter(Docente.id_usuario == id_usuario).first()
    if docente:
        rels = db.query(DocenteCarrera).filter(DocenteCarrera.id_docente == docente.id_docente).all()
        for r in rels:
            c = db.query(Carrera).filter(Carrera.id_carrera == r.id_carrera).first()
            if c:
                carreras_nombres.append(c.nombre)

        dm = db.query(DocenteMateria, Materia).join(Materia, DocenteMateria.id_materia == Materia.id_materia)\
            .filter(DocenteMateria.id_docente == docente.id_docente).all()
        materias_impartidas = [
            MateriaImpartidaOut(id_materia=m.id_materia, nombre_materia=m.nombre_materia, clave_materia=m.clave_materia)
            for _, m in dm
        ]

        obs = db.query(ObservacionConducta, Estudiante.nombre_completo)\
            .join(Estudiante, ObservacionConducta.id_estudiante == Estudiante.id_estudiante)\
            .filter(ObservacionConducta.id_docente == docente.id_docente)\
            .order_by(ObservacionConducta.fecha_registro.desc()).all()
        observaciones = [
            ObservacionEnviadaOut(
                id_observacion=o.id_observacion, id_estudiante=o.id_estudiante,
                nombre_estudiante=nombre, etiqueta=o.etiqueta, nota=o.nota,
                fecha_registro=o.fecha_registro
            ) for o, nombre in obs
        ]

    tutor = db.query(Tutor).filter(Tutor.id_usuario == id_usuario).first()
    if tutor:
        grupos = db.query(Grupo).filter(Grupo.id_tutor == tutor.id_tutor).all()
        ids_carrera = {g.id_carrera for g in grupos if g.id_carrera}
        for id_c in ids_carrera:
            c = db.query(Carrera).filter(Carrera.id_carrera == id_c).first()
            if c:
                carreras_nombres.append(c.nombre)

    director_rel = db.query(DirectorCarrera).filter(DirectorCarrera.id_usuario == id_usuario).all()
    if director_rel:
        for r in director_rel:
            c = db.query(Carrera).filter(Carrera.id_carrera == r.id_carrera).first()
            if c:
                carreras_nombres.append(c.nombre)

    return PersonalDetalleOut(
        id_usuario=usuario.id_usuario,
        nombre_completo=usuario.nombre_completo,
        correo=usuario.correo_institucional,
        rol=rol_valor,
        estado=usuario.estado,
        telefono=usuario.telefono,
        telefono_familiar=usuario.telefono_familiar,
        imagen_url=usuario.imagen_url,
        antiguedad_texto=_calcular_antiguedad(usuario.fecha_creacion),
        carreras=list(set(carreras_nombres)),
        materias_impartidas=materias_impartidas,
        observaciones_enviadas=observaciones
    )


@router.get("/personal/{id_usuario}", response_model=PersonalDetalleOut, dependencies=[Depends(permitir_ver)])
def obtener_expediente_laboral(id_usuario: int, db: Session = Depends(get_db)):
    return _construir_expediente(id_usuario, db)


@router.put("/personal/{id_usuario}", response_model=PersonalDetalleOut, dependencies=[Depends(permitir_editar)])
def editar_datos_personales(id_usuario: int, data: PersonalUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(usuario, key, value)
    db.commit()
    db.refresh(usuario)
    return _construir_expediente(id_usuario, db)


@router.put("/personal/{id_usuario}/estado", dependencies=[Depends(permitir_editar)])
def cambiar_estado_personal(id_usuario: int, activo: bool, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.estado = activo
    usuario.token_version = (usuario.token_version or 1) + 1
    db.commit()
    return {"message": "Estado actualizado", "estado": activo}


@router.post("/personal/{id_usuario}/materias", dependencies=[Depends(permitir_materias)])
def asignar_materia_docente(id_usuario: int, data: AsignarMateriaIn, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id_usuario == id_usuario).first()
    if not docente:
        raise HTTPException(status_code=400, detail="Este usuario no tiene perfil de docente")
    existe = db.query(DocenteMateria).filter(
        DocenteMateria.id_docente == docente.id_docente,
        DocenteMateria.id_materia == data.id_materia
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="El docente ya tiene asignada esta materia")
    db.add(DocenteMateria(id_docente=docente.id_docente, id_materia=data.id_materia))
    db.commit()
    return {"message": "Materia asignada correctamente"}


@router.delete("/personal/{id_usuario}/materias/{id_materia}", dependencies=[Depends(permitir_materias)])
def quitar_materia_docente(id_usuario: int, id_materia: int, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id_usuario == id_usuario).first()
    if not docente:
        raise HTTPException(status_code=400, detail="Este usuario no tiene perfil de docente")
    rel = db.query(DocenteMateria).filter(
        DocenteMateria.id_docente == docente.id_docente,
        DocenteMateria.id_materia == id_materia
    ).first()
    if not rel:
        raise HTTPException(status_code=404, detail="El docente no tiene asignada esta materia")
    db.delete(rel)
    db.commit()
    return {"message": "Materia removida correctamente"}