from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Materia, Periodo, Horario, Docente, Carrera
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.schemas.academic import (
    EstudianteCreate, EstudianteOut, GrupoCreate, GrupoOut, 
    MateriaCreate, MateriaOut, MateriaUpdate, PeriodoCreate, PeriodoOut,
    ClaseDocenteOut
)
from app.core.deps import get_db, RoleChecker
from app.schemas.carrera import CarreraOut

router = APIRouter(prefix="/api/v1", tags=["Académico"])

solo_admin = RoleChecker(["Administrador", "Psicopedagogia"])
permitir_gestion_materias = RoleChecker(["Administrador", "Director", "Psicopedagogia"])
todos_los_roles = RoleChecker(["Administrador", "Tutor", "Docente", "Director", "Psicopedagogia", "RRHH"])


# 1. ESTUDIANTES
@router.post("/estudiantes", response_model=EstudianteOut, dependencies=[Depends(solo_admin)])
def crear_estudiante(estudiante: EstudianteCreate, db: Session = Depends(get_db)):
    existe = db.query(Estudiante).filter(Estudiante.matricula == estudiante.matricula).first()
    if existe:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La matrícula ya existe")
    
    nuevo_estudiante = Estudiante(**estudiante.model_dump())
    db.add(nuevo_estudiante)
    db.commit()
    db.refresh(nuevo_estudiante)
    return nuevo_estudiante

@router.get("/estudiantes", response_model=List[EstudianteOut], dependencies=[Depends(todos_los_roles)])
def obtener_estudiantes(
    carrera: Optional[int] = Query(None),
    grupo: Optional[str] = Query(None),
    nivel_riesgo: Optional[str] = Query(None),
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):

    query = db.query(Estudiante).filter(Estudiante.estado == True)
    
    if carrera or grupo:
        query = query.join(Grupo)
        if carrera:
            query = query.filter(Grupo.id_carrera == carrera)
        if grupo:
            query = query.filter(Grupo.nombre_grupo.ilike(f"%{grupo}%"))
            
    return query.offset(skip).limit(limit).all()

@router.get("/carreras", response_model=List[CarreraOut], dependencies=[Depends(todos_los_roles)])
def obtener_carreras(db: Session = Depends(get_db)):
    return db.query(Carrera).all()

@router.get("/estudiantes/{id}", response_model=EstudianteOut, dependencies=[Depends(todos_los_roles)])
def obtener_estudiante_por_id(id: int, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id, Estudiante.estado == True).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return estudiante

@router.put("/estudiantes/{id}", response_model=EstudianteOut, dependencies=[Depends(solo_admin)])
def actualizar_estudiante(id: int, est_in: EstudianteCreate, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
    for key, value in est_in.model_dump().items():
        setattr(estudiante, key, value)
        
    db.commit()
    db.refresh(estudiante)
    return estudiante

@router.delete("/estudiantes/{id}", dependencies=[Depends(solo_admin)])
def eliminar_estudiante_soft(id: int, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    estudiante.estado = False
    db.commit()
    return {"message": "Estudiante dado de baja correctamente (Soft delete)"}



# 2. GRUPOS
@router.post("/grupos", response_model=GrupoOut, dependencies=[Depends(solo_admin)])
def crear_grupo(grupo: GrupoCreate, db: Session = Depends(get_db)):
    nuevo_grupo = Grupo(**grupo.model_dump())
    db.add(nuevo_grupo)
    db.commit()
    db.refresh(nuevo_grupo)
    return nuevo_grupo

@router.get("/grupos", response_model=List[GrupoOut], dependencies=[Depends(todos_los_roles)])
def obtener_grupos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    grupos = db.query(Grupo).offset(skip).limit(limit).all()
    resultado = []
    for g in grupos:
        carrera = db.query(Carrera).filter(Carrera.id_carrera == g.id_carrera).first()
        resultado.append(GrupoOut(
            id_grupo=g.id_grupo,
            nombre_grupo=g.nombre_grupo,
            id_carrera=g.id_carrera,
            nombre_carrera=carrera.nombre if carrera else None,
            cuatrimestre=g.cuatrimestre,
            id_plan_estudio=g.id_plan_estudio,
            id_tutor=g.id_tutor
        ))
    return resultado

@router.post("/grupos/{id}/asignar-docente", dependencies=[Depends(solo_admin)])
def asignar_docente_a_grupo(id: int, id_docente: int, db: Session = Depends(get_db)):
    grupo = db.query(Grupo).filter(Grupo.id_grupo == id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    grupo.id_tutor = id_docente 
    db.commit()
    return {"message": f"Docente/Tutor {id_docente} asignado al grupo {id}"}

# 3. MATERIAS
@router.post("/materias", response_model=MateriaOut, dependencies=[Depends(permitir_gestion_materias)])
def crear_materia(materia: MateriaCreate, db: Session = Depends(get_db)):
    existe = db.query(Materia).filter(Materia.clave_materia == materia.clave_materia).first()
    if existe:
        raise HTTPException(status_code=400, detail="La clave de materia ya está en uso")

    nueva_materia = Materia(**materia.model_dump())
    db.add(nueva_materia)
    db.commit()
    db.refresh(nueva_materia)
    return nueva_materia

@router.put("/materias/{id}", response_model=MateriaOut, dependencies=[Depends(permitir_gestion_materias)])
def actualizar_materia(id: int, data: MateriaUpdate, db: Session = Depends(get_db)):
    materia = db.query(Materia).filter(Materia.id_materia == id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    if data.clave_materia and data.clave_materia != materia.clave_materia:
        existe = db.query(Materia).filter(Materia.clave_materia == data.clave_materia).first()
        if existe:
            raise HTTPException(status_code=400, detail="La clave de materia ya está en uso")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(materia, key, value)

    db.commit()
    db.refresh(materia)
    return materia

@router.get("/materias", response_model=List[MateriaOut], dependencies=[Depends(todos_los_roles)])
def obtener_materias(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Materia).filter(Materia.estado == True).offset(skip).limit(limit).all()

@router.get("/grupos/{id_grupo}/mis-materias", response_model=List[MateriaOut])
def materias_del_docente_en_grupo(
    id_grupo: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    if user_role == "Administrador":
        materia_ids = db.query(Horario.id_materia).filter(Horario.id_grupo == id_grupo).distinct()
    else:
        docente = db.query(Docente).filter(Docente.id_usuario == current_user.id_usuario).first()
        if not docente:
            return []
        materia_ids = db.query(Horario.id_materia).filter(
            Horario.id_grupo == id_grupo,
            Horario.id_docente == docente.id_docente
        ).distinct()

    ids = [m[0] for m in materia_ids]
    return db.query(Materia).filter(Materia.id_materia.in_(ids)).all()

@router.get("/mis-clases", response_model=List[ClaseDocenteOut])
def obtener_mis_clases(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Docente":
        raise HTTPException(status_code=403, detail="Solo disponible para el rol Docente")

    docente = db.query(Docente).filter(Docente.id_usuario == current_user.id_usuario).first()
    if not docente:
        raise HTTPException(status_code=400, detail="Tu cuenta no tiene un perfil de docente asociado")

    horarios = db.query(Horario).filter(Horario.id_docente == docente.id_docente).all()

    resultado = []
    for h in horarios:
        grupo = db.query(Grupo).filter(Grupo.id_grupo == h.id_grupo).first()
        materia = db.query(Materia).filter(Materia.id_materia == h.id_materia).first()
        if not grupo or not materia:
            continue

        num_alumnos = db.query(Estudiante).filter(
            Estudiante.id_grupo == grupo.id_grupo,
            Estudiante.estado == True
        ).count()

        resultado.append(ClaseDocenteOut(
            id_horario=h.id_horario,
            id_grupo=grupo.id_grupo,
            nombre_grupo=grupo.nombre_grupo,
            id_materia=materia.id_materia,
            nombre_materia=materia.nombre_materia,
            dia_semana=h.dia_semana.value if h.dia_semana else "",
            hora_inicio=h.hora_inicio.strftime("%H:%M") if h.hora_inicio else "",
            hora_fin=h.hora_fin.strftime("%H:%M") if h.hora_fin else "",
            num_alumnos=num_alumnos
        ))

    orden_dias = {"LUNES": 0, "MARTES": 1, "MIERCOLES": 2, "JUEVES": 3, "VIERNES": 4}
    resultado.sort(key=lambda c: (orden_dias.get(c.dia_semana.upper().replace("É", "E"), 9), c.hora_inicio))

    return resultado

# 4. PERIODOS ACADÉMICOS
@router.post("/periodos", response_model=PeriodoOut, dependencies=[Depends(solo_admin)])
def crear_periodo(periodo: PeriodoCreate, db: Session = Depends(get_db)):
    nuevo_periodo = Periodo(**periodo.model_dump())
    db.add(nuevo_periodo)
    db.commit()
    db.refresh(nuevo_periodo)
    return nuevo_periodo

@router.get("/periodos", response_model=List[PeriodoOut], dependencies=[Depends(todos_los_roles)])
def obtener_periodos(db: Session = Depends(get_db)):
    return db.query(Periodo).all()