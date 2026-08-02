from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Materia, Periodo
from app.schemas.academic import (
    EstudianteCreate, EstudianteOut, GrupoCreate, GrupoOut, 
    MateriaCreate, MateriaOut, PeriodoCreate, PeriodoOut
)
from app.core.deps import get_db, RoleChecker

router = APIRouter(prefix="/api/v1", tags=["Académico"])

# --- MIDDLEWARES DE ROLES ---
# Solo administradores (RRHH/Admin) pueden crear o borrar
solo_admin = RoleChecker(["Administrador"])
# Todos los roles pueden leer listas (con sus respectivos filtros que haremos luego en el front)
todos_los_roles = RoleChecker(["Administrador", "Tutor", "Docente"])


# ==========================================
# 1. ESTUDIANTES
# ==========================================
@router.post("/estudiantes", response_model=EstudianteOut, dependencies=[Depends(solo_admin)])
def crear_estudiante(estudiante: EstudianteCreate, db: Session = Depends(get_db)):
    # Validación de matrícula única (RF-02)
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
    carrera: Optional[str] = Query(None),
    grupo: Optional[str] = Query(None),
    nivel_riesgo: Optional[str] = Query(None), # Mock preparado para el sprint de IA
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    # Solo traemos los activos por el soft delete
    query = db.query(Estudiante).filter(Estudiante.estado == True)
    
    # Filtro transversal (RF-15)
    if carrera or grupo:
        query = query.join(Grupo)
        if carrera:
            query = query.filter(Grupo.carrera.ilike(f"%{carrera}%"))
        if grupo:
            query = query.filter(Grupo.nombre_grupo.ilike(f"%{grupo}%"))
            
    return query.offset(skip).limit(limit).all()

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
    # Soft delete: no borramos el registro, solo cambiamos el estado
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    estudiante.estado = False
    db.commit()
    return {"message": "Estudiante dado de baja correctamente (Soft delete)"}


# ==========================================
# 2. GRUPOS
# ==========================================
@router.post("/grupos", response_model=GrupoOut, dependencies=[Depends(solo_admin)])
def crear_grupo(grupo: GrupoCreate, db: Session = Depends(get_db)):
    nuevo_grupo = Grupo(**grupo.model_dump())
    db.add(nuevo_grupo)
    db.commit()
    db.refresh(nuevo_grupo)
    return nuevo_grupo

@router.get("/grupos", response_model=List[GrupoOut], dependencies=[Depends(todos_los_roles)])
def obtener_grupos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Grupo).offset(skip).limit(limit).all()

@router.post("/grupos/{id}/asignar-docente", dependencies=[Depends(solo_admin)])
def asignar_docente_a_grupo(id: int, id_docente: int, db: Session = Depends(get_db)):
    grupo = db.query(Grupo).filter(Grupo.id_grupo == id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # En nuestro esquema, el responsable principal es el id_tutor
    grupo.id_tutor = id_docente 
    db.commit()
    return {"message": f"Docente/Tutor {id_docente} asignado al grupo {id}"}


# ==========================================
# 3. MATERIAS
# ==========================================
@router.post("/materias", response_model=MateriaOut, dependencies=[Depends(solo_admin)])
def crear_materia(materia: MateriaCreate, db: Session = Depends(get_db)):
    nueva_materia = Materia(**materia.model_dump())
    db.add(nueva_materia)
    db.commit()
    db.refresh(nueva_materia)
    return nueva_materia

@router.get("/materias", response_model=List[MateriaOut], dependencies=[Depends(todos_los_roles)])
def obtener_materias(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Materia).filter(Materia.estado == True).offset(skip).limit(limit).all()


# ==========================================
# 4. PERIODOS ACADÉMICOS
# ==========================================
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