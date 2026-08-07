from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import SessionLocal
from app.models.models import (
    Horario, Grupo, Materia, Docente, Usuario, Aula, DirectorCarrera,
    DocenteCarrera, DiaSemanaEnum
)
from app.schemas.horario import HorarioBulkCreate, HorarioOut, DocenteDisponibleOut
from app.core.deps import get_db, RoleChecker, get_current_active_user

router = APIRouter(prefix="/api/v1", tags=["Horarios"])
permitir_gestion = RoleChecker(["Administrador", "Director", "Psicopedagogia"])


def _verificar_permiso_carrera(db: Session, current_user, id_carrera: int):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Director":
        return
    pertenece = db.query(DirectorCarrera).filter(
        DirectorCarrera.id_usuario == current_user.id_usuario,
        DirectorCarrera.id_carrera == id_carrera
    ).first()
    if not pertenece:
        raise HTTPException(status_code=403, detail="No tienes permiso sobre esta carrera.")


def _armar_salida(h: Horario, db: Session) -> HorarioOut:
    materia = db.query(Materia).filter(Materia.id_materia == h.id_materia).first()
    docente = db.query(Docente).filter(Docente.id_docente == h.id_docente).first()
    nombre_docente = "Sin asignar"
    if docente:
        usuario = db.query(Usuario).filter(Usuario.id_usuario == docente.id_usuario).first()
        if usuario:
            nombre_docente = usuario.nombre_completo
    return HorarioOut(
        id_horario=h.id_horario,
        id_grupo=h.id_grupo,
        id_materia=h.id_materia,
        nombre_materia=materia.nombre_materia if materia else "N/A",
        id_docente=h.id_docente,
        nombre_docente=nombre_docente,
        dia_semana=h.dia_semana.value if h.dia_semana else "",
        hora_inicio=h.hora_inicio.strftime("%H:%M") if h.hora_inicio else "",
        hora_fin=h.hora_fin.strftime("%H:%M") if h.hora_fin else ""
    )


def _hay_colision(existentes, dia, inicio, fin, excluir_id=None):
    for h in existentes:
        if excluir_id and h.id_horario == excluir_id:
            continue
        if not h.dia_semana or h.dia_semana.value != dia:
            continue
        if inicio < h.hora_fin and fin > h.hora_inicio:
            return h
    return None


@router.get("/carreras/{id_carrera}/docentes-disponibles", response_model=List[DocenteDisponibleOut], dependencies=[Depends(permitir_gestion)])
def docentes_disponibles_carrera(id_carrera: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    _verificar_permiso_carrera(db, current_user, id_carrera)
    rels = db.query(DocenteCarrera, Docente, Usuario)\
        .join(Docente, DocenteCarrera.id_docente == Docente.id_docente)\
        .join(Usuario, Docente.id_usuario == Usuario.id_usuario)\
        .filter(DocenteCarrera.id_carrera == id_carrera).all()
    return [DocenteDisponibleOut(id_docente=d.id_docente, nombre_completo=u.nombre_completo) for _, d, u in rels]


@router.get("/grupos/{id_grupo}/horarios", response_model=List[HorarioOut], dependencies=[Depends(permitir_gestion)])
def listar_horarios_grupo(id_grupo: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    grupo = db.query(Grupo).filter(Grupo.id_grupo == id_grupo).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    _verificar_permiso_carrera(db, current_user, grupo.id_carrera)

    horarios = db.query(Horario).filter(Horario.id_grupo == id_grupo).all()
    return [_armar_salida(h, db) for h in horarios]


@router.post("/grupos/{id_grupo}/horarios", response_model=List[HorarioOut], dependencies=[Depends(permitir_gestion)])
def crear_horarios_grupo(
    id_grupo: int,
    data: HorarioBulkCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    grupo = db.query(Grupo).filter(Grupo.id_grupo == id_grupo).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    _verificar_permiso_carrera(db, current_user, grupo.id_carrera)

    aula = db.query(Aula).first()
    if not aula:
        aula = Aula(nombre_aula="Aula General", capacidad=40)
        db.add(aula)
        db.commit()
        db.refresh(aula)

    horarios_grupo = db.query(Horario).filter(Horario.id_grupo == id_grupo).all()
    creados = []

    for item in data.horarios:
        dia_enum = getattr(DiaSemanaEnum, item.dia_semana.upper().replace("É", "E"), None)
        if not dia_enum:
            raise HTTPException(status_code=400, detail=f"Día inválido: {item.dia_semana}")

        if not db.query(Materia).filter(Materia.id_materia == item.id_materia).first():
            raise HTTPException(status_code=404, detail=f"Materia {item.id_materia} no encontrada")

        if not db.query(Docente).filter(Docente.id_docente == item.id_docente).first():
            raise HTTPException(status_code=404, detail=f"Docente {item.id_docente} no encontrado")

        if item.hora_inicio >= item.hora_fin:
            raise HTTPException(status_code=400, detail=f"Hora de inicio debe ser antes de hora de fin ({item.dia_semana})")

        colision_grupo = _hay_colision(horarios_grupo, item.dia_semana, item.hora_inicio, item.hora_fin)
        if colision_grupo:
            raise HTTPException(
                status_code=409,
                detail=f"El grupo ya tiene una clase el {item.dia_semana} de {colision_grupo.hora_inicio} a {colision_grupo.hora_fin}."
            )

        horarios_docente = db.query(Horario).filter(Horario.id_docente == item.id_docente).all()
        colision_docente = _hay_colision(horarios_docente, item.dia_semana, item.hora_inicio, item.hora_fin)
        if colision_docente:
            raise HTTPException(
                status_code=409,
                detail=f"El docente ya tiene clase el {item.dia_semana} de {colision_docente.hora_inicio} a {colision_docente.hora_fin} en otro grupo."
            )

        nuevo = Horario(
            id_grupo=id_grupo,
            id_materia=item.id_materia,
            id_docente=item.id_docente,
            id_aula=aula.id_aula,
            dia_semana=dia_enum,
            hora_inicio=item.hora_inicio,
            hora_fin=item.hora_fin
        )
        db.add(nuevo)
        db.flush()
        horarios_grupo.append(nuevo)
        creados.append(nuevo)

    db.commit()
    for h in creados:
        db.refresh(h)

    return [_armar_salida(h, db) for h in creados]


@router.delete("/horarios/{id_horario}", dependencies=[Depends(permitir_gestion)])
def eliminar_horario(id_horario: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    horario = db.query(Horario).filter(Horario.id_horario == id_horario).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    grupo = db.query(Grupo).filter(Grupo.id_grupo == horario.id_grupo).first()
    if grupo:
        _verificar_permiso_carrera(db, current_user, grupo.id_carrera)

    db.delete(horario)
    db.commit()
    return {"message": "Horario eliminado correctamente"}