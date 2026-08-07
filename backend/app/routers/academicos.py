import io
import re
import unicodedata
import openpyxl
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import SessionLocal
from app.models.models import (
    Estudiante, Grupo, Materia, Periodo, Horario, Docente, Carrera,
    Usuario, DirectorCarrera, DiaSemanaEnum
)
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.schemas.academic import (
    EstudianteCreate, EstudianteOut, GrupoCreate, GrupoOut, 
    MateriaCreate, MateriaOut, MateriaUpdate, PeriodoCreate, PeriodoOut,
    ClaseDocenteOut, EstudianteBajaIn
)
from app.core.deps import get_db, RoleChecker
from app.schemas.carrera import CarreraOut
from app.routers.riesgo import calcular_metricas_estudiante
from fastapi.responses import StreamingResponse
from app.schemas.horario import HorarioBulkCreate, HorarioOut, DocenteCatalogoOut

router = APIRouter(prefix="/api/v1", tags=["Académico"])

solo_admin = RoleChecker(["Administrador", "Psicopedagogia"])
permitir_gestion_materias = RoleChecker(["Administrador", "Director", "Psicopedagogia"])
todos_los_roles = RoleChecker(["Administrador", "Tutor", "Docente", "Director", "Psicopedagogia", "RRHH"])
permitir_gestion_grupos = RoleChecker(["Administrador", "Director", "Psicopedagogia"])

def _generar_matricula(db: Session) -> str:
    anio = datetime.now().year
    ultimo = db.query(Estudiante)\
        .filter(Estudiante.matricula.like(f"MAT-{anio}%"))\
        .order_by(Estudiante.matricula.desc())\
        .first()
    if ultimo:
        try:
            consecutivo = int(ultimo.matricula.split('-')[-1]) + 1
        except (ValueError, IndexError):
            consecutivo = 1
    else:
        consecutivo = 1
    return f"MAT-{anio}{consecutivo:04d}"


def _generar_correo_institucional(db: Session, nombre_completo: str) -> str:
    partes = unicodedata.normalize('NFKD', nombre_completo.lower())\
        .encode('ascii', 'ignore').decode('ascii')
    partes = re.sub(r'[^a-z\s]', '', partes).split()
    if not partes:
        base = "alumno"
    else:
        nombre = partes[0]
        apellido = partes[1] if len(partes) > 1 else ""
        base = f"{nombre}.{apellido}" if apellido else nombre

    correo = f"{base}@alumno.edupredict.edu"
    sufijo = 1
    while db.query(Estudiante).filter(Estudiante.correo_institucional == correo).first():
        sufijo += 1
        correo = f"{base}{sufijo}@alumno.edupredict.edu"
    return correo


# 1. ESTUDIANTES
@router.post("/estudiantes", response_model=EstudianteOut, dependencies=[Depends(solo_admin)])
def crear_estudiante(estudiante: EstudianteCreate, db: Session = Depends(get_db)):
    matricula = _generar_matricula(db)
    correo = _generar_correo_institucional(db, estudiante.nombre_completo)

    nuevo_estudiante = Estudiante(
        **estudiante.model_dump(),
        matricula=matricula,
        correo_institucional=correo
    )
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

    resultado = query.offset(skip).limit(limit).all()

    if nivel_riesgo and nivel_riesgo != "":
        filtrados = []
        for est in resultado:
            p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
            if p_asis < 70.0 or prom < 60.0:
                nivel = "Alto"
            elif p_asis < 85.0 or prom < 75.0:
                nivel = "Medio"
            else:
                nivel = "Bajo"
            if nivel == nivel_riesgo:
                filtrados.append(est)
        return filtrados

    return resultado

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
def eliminar_estudiante_soft(id: int, data: EstudianteBajaIn, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if not estudiante.estado:
        raise HTTPException(status_code=400, detail="El estudiante ya está dado de baja")

    estudiante.estado = False
    estudiante.motivo_baja = data.motivo_baja
    estudiante.fecha_baja = datetime.utcnow()
    db.commit()
    return {"message": "Estudiante dado de baja correctamente", "motivo_baja": data.motivo_baja}

@router.get("/estudiantes/buscar/{matricula}", response_model=EstudianteOut, dependencies=[Depends(todos_los_roles)])
def buscar_estudiante_por_matricula(matricula: str, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.matricula == matricula).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="No se encontró un estudiante con esa matrícula")
    return estudiante

# 2. GRUPOS
@router.post("/grupos", response_model=GrupoOut, dependencies=[Depends(permitir_gestion_grupos)])
def crear_grupo(
    grupo: GrupoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol

    if user_role == "Director":
        pertenece = db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario,
            DirectorCarrera.id_carrera == grupo.id_carrera
        ).first()
        if not pertenece:
            raise HTTPException(status_code=403, detail="No puedes crear grupos en una carrera que no diriges.")

    nuevo_grupo = Grupo(**grupo.model_dump())
    db.add(nuevo_grupo)
    db.commit()
    db.refresh(nuevo_grupo)

    carrera = db.query(Carrera).filter(Carrera.id_carrera == nuevo_grupo.id_carrera).first()
    return GrupoOut(
        id_grupo=nuevo_grupo.id_grupo,
        nombre_grupo=nuevo_grupo.nombre_grupo,
        id_carrera=nuevo_grupo.id_carrera,
        nombre_carrera=carrera.nombre if carrera else None,
        cuatrimestre=nuevo_grupo.cuatrimestre,
        id_plan_estudio=nuevo_grupo.id_plan_estudio,
        id_tutor=nuevo_grupo.id_tutor
    )

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

@router.get("/grupos/plantilla-importacion", dependencies=[Depends(permitir_gestion_grupos)])
def descargar_plantilla_importacion():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Plantilla"
    ws.append(["Matricula"])
    ws.append(["MAT-2024001"])
    ws.append(["MAT-2024002"])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_importacion_alumnos.xlsx"}
    )


@router.post("/grupos/{id_grupo}/importar-alumnos", dependencies=[Depends(permitir_gestion_grupos)])
def importar_alumnos_a_grupo(
    id_grupo: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    grupo = db.query(Grupo).filter(Grupo.id_grupo == id_grupo).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role == "Director":
        pertenece = db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario,
            DirectorCarrera.id_carrera == grupo.id_carrera
        ).first()
        if not pertenece:
            raise HTTPException(status_code=403, detail="No puedes importar alumnos a un grupo de una carrera que no diriges.")

    if not archivo.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xlsx o .xls")

    try:
        contenido = archivo.file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contenido), data_only=True)
        ws = wb.active
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo. Verifica el formato.")

    filas = list(ws.iter_rows(min_row=2, values_only=True))
    if not filas:
        raise HTTPException(status_code=400, detail="El archivo no contiene registros (fila 2 en adelante).")

    actualizados = []
    no_encontrados = []
    ya_asignados_otro_grupo = []

    for fila in filas:
        if not fila or not fila[0]:
            continue
        matricula = str(fila[0]).strip()
        if not matricula:
            continue

        estudiante = db.query(Estudiante).filter(Estudiante.matricula == matricula).first()
        if not estudiante:
            no_encontrados.append(matricula)
            continue

        if estudiante.id_grupo and estudiante.id_grupo != id_grupo:
            ya_asignados_otro_grupo.append(matricula)

        estudiante.id_grupo = id_grupo
        actualizados.append(matricula)

    db.commit()

    return {
        "message": f"{len(actualizados)} alumno(s) vinculados al grupo '{grupo.nombre_grupo}'.",
        "actualizados": actualizados,
        "no_encontrados": no_encontrados,
        "reasignados_desde_otro_grupo": ya_asignados_otro_grupo
    }

def _hay_colision_horario(db: Session, id_docente: int, id_aula, dia_semana, hora_inicio, hora_fin, excluir_id_horario=None):
    query = db.query(Horario).filter(Horario.dia_semana == dia_semana)
    if excluir_id_horario:
        query = query.filter(Horario.id_horario != excluir_id_horario)

    candidatos = query.filter(
        (Horario.id_docente == id_docente) | (Horario.id_aula == id_aula if id_aula else False)
    ).all()

    for h in candidatos:
        if h.hora_inicio is None or h.hora_fin is None:
            continue
        traslape = h.hora_inicio < hora_fin and hora_inicio < h.hora_fin
        if not traslape:
            continue
        if h.id_docente == id_docente:
            return f"El docente ya tiene clase de {h.hora_inicio.strftime('%H:%M')} a {h.hora_fin.strftime('%H:%M')} el {dia_semana.value}."
        if id_aula and h.id_aula == id_aula:
            return f"El aula ya está ocupada de {h.hora_inicio.strftime('%H:%M')} a {h.hora_fin.strftime('%H:%M')} el {dia_semana.value}."
    return None


@router.get("/docentes-catalogo", response_model=List[DocenteCatalogoOut], dependencies=[Depends(todos_los_roles)])
def catalogo_docentes(db: Session = Depends(get_db)):
    docentes = db.query(Docente, Usuario.nombre_completo)\
        .join(Usuario, Docente.id_usuario == Usuario.id_usuario)\
        .filter(Usuario.estado == True).all()
    return [DocenteCatalogoOut(id_docente=d.id_docente, nombre_completo=nombre) for d, nombre in docentes]


@router.get("/grupos/{id_grupo}/horarios", response_model=List[HorarioOut], dependencies=[Depends(todos_los_roles)])
def obtener_horarios_grupo(id_grupo: int, db: Session = Depends(get_db)):
    horarios = db.query(Horario).filter(Horario.id_grupo == id_grupo).all()
    resultado = []
    for h in horarios:
        materia = db.query(Materia).filter(Materia.id_materia == h.id_materia).first()
        docente = db.query(Docente).filter(Docente.id_docente == h.id_docente).first()
        nombre_docente = None
        if docente:
            usuario = db.query(Usuario).filter(Usuario.id_usuario == docente.id_usuario).first()
            nombre_docente = usuario.nombre_completo if usuario else None

        resultado.append(HorarioOut(
            id_horario=h.id_horario,
            id_grupo=h.id_grupo,
            id_materia=h.id_materia,
            nombre_materia=materia.nombre_materia if materia else None,
            id_docente=h.id_docente,
            nombre_docente=nombre_docente,
            id_aula=h.id_aula,
            dia_semana=h.dia_semana.value if h.dia_semana else "",
            hora_inicio=h.hora_inicio.strftime("%H:%M") if h.hora_inicio else "",
            hora_fin=h.hora_fin.strftime("%H:%M") if h.hora_fin else ""
        ))
    return resultado


@router.post("/horarios/lote", dependencies=[Depends(permitir_gestion_grupos)])
def crear_horarios_lote(
    data: HorarioBulkCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    grupo = db.query(Grupo).filter(Grupo.id_grupo == data.id_grupo).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role == "Director":
        pertenece = db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario,
            DirectorCarrera.id_carrera == grupo.id_carrera
        ).first()
        if not pertenece:
            raise HTTPException(status_code=403, detail="No puedes editar horarios de un grupo de una carrera que no diriges.")

    creados = []
    errores = []
    lote_verificado = []  # para detectar colisiones dentro del mismo lote enviado

    for idx, h in enumerate(data.horarios):
        dia_enum = getattr(DiaSemanaEnum, h.dia_semana.upper().replace('É', 'E'), None)
        if not dia_enum:
            errores.append({"fila": idx + 1, "error": f"Día inválido: {h.dia_semana}"})
            continue
        if h.hora_fin <= h.hora_inicio:
            errores.append({"fila": idx + 1, "error": "La hora de fin debe ser posterior a la hora de inicio."})
            continue

        conflicto = _hay_colision_horario(db, h.id_docente, h.id_aula, dia_enum, h.hora_inicio, h.hora_fin)
        if conflicto:
            errores.append({"fila": idx + 1, "error": conflicto})
            continue

        conflicto_lote = None
        for b in lote_verificado:
            if b["dia"] == dia_enum and b["hora_inicio"] < h.hora_fin and h.hora_inicio < b["hora_fin"]:
                if b["id_docente"] == h.id_docente:
                    conflicto_lote = "Choca con otra fila de esta misma solicitud (mismo docente, mismo horario)."
                elif h.id_aula and b["id_aula"] == h.id_aula:
                    conflicto_lote = "Choca con otra fila de esta misma solicitud (misma aula, mismo horario)."
        if conflicto_lote:
            errores.append({"fila": idx + 1, "error": conflicto_lote})
            continue

        nuevo = Horario(
            id_grupo=data.id_grupo,
            id_materia=h.id_materia,
            id_docente=h.id_docente,
            id_aula=h.id_aula,
            dia_semana=dia_enum,
            hora_inicio=h.hora_inicio,
            hora_fin=h.hora_fin
        )
        db.add(nuevo)
        db.flush()
        creados.append(nuevo.id_horario)
        lote_verificado.append({
            "dia": dia_enum, "hora_inicio": h.hora_inicio, "hora_fin": h.hora_fin,
            "id_docente": h.id_docente, "id_aula": h.id_aula
        })

    if errores and not creados:
        db.rollback()
        raise HTTPException(status_code=400, detail={"message": "No se pudo guardar ningún horario.", "errores": errores})

    db.commit()
    return {"message": f"{len(creados)} horario(s) creados correctamente.", "creados": creados, "errores": errores}


@router.delete("/horarios/{id_horario}", dependencies=[Depends(permitir_gestion_grupos)])
def eliminar_horario(
    id_horario: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    h = db.query(Horario).filter(Horario.id_horario == id_horario).first()
    if not h:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role == "Director":
        grupo = db.query(Grupo).filter(Grupo.id_grupo == h.id_grupo).first()
        pertenece = db.query(DirectorCarrera).filter(
            DirectorCarrera.id_usuario == current_user.id_usuario,
            DirectorCarrera.id_carrera == grupo.id_carrera if grupo else None
        ).first()
        if not pertenece:
            raise HTTPException(status_code=403, detail="No puedes eliminar horarios de un grupo de una carrera que no diriges.")

    db.delete(h)
    db.commit()
    return {"message": "Horario eliminado correctamente."}