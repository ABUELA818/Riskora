from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Asistencia, Calificacion, EstatusAsistenciaEnum, Tutor, HistorialCalificacion, HistorialAsistencia
from app.schemas.riesgo import RiesgoEstudianteOut, RiesgoResumenOut, FactorRiesgo, AlumnoAtencionOut, RiesgoEstudianteDetalleOut, SocioeconomicoUpdate, CalificacionRegistro, AsistenciaRegistro
from app.core.deps import get_db, RoleChecker, get_current_active_user
permitir_admin = RoleChecker(["Administrador"])
from app.core.prediction_service import predecir_riesgo, recalcular_y_guardar_riesgo

router = APIRouter(prefix="/api/v1", tags=["IA - Riesgo"])
permitir_acceso = RoleChecker(["Docente", "Tutor", "Administrador", "Psicopedagogia", "Director", "RRHH"])

def calcular_metricas_estudiante(db: Session, id_estudiante: int):
    # Usar tablas nuevas
    registros_asis = db.query(HistorialAsistencia).filter(HistorialAsistencia.estudiante_id == id_estudiante).all()
    total_clases = len(registros_asis)
    
    if total_clases > 0:
        validas = sum(1 for r in registros_asis if r.asistio == True)
        porcentaje_asistencia = (validas / total_clases) * 100
    else:
        porcentaje_asistencia = 100.0 

    calificaciones = db.query(HistorialCalificacion).filter(HistorialCalificacion.estudiante_id == id_estudiante).all()
    if calificaciones:
        vals = [float(c.promedio) for c in calificaciones]
        promedio_general = sum(vals) / len(vals)
        
        parciales = sorted(list(set([c.parcial for c in calificaciones])))
        tendencia = "Estable"
        if len(parciales) >= 2:
            ult = [float(c.promedio) for c in calificaciones if c.parcial == parciales[-1]]
            penult = [float(c.promedio) for c in calificaciones if c.parcial == parciales[-2]]
            p_ult = sum(ult) / len(ult) if ult else 0
            p_penult = sum(penult) / len(penult) if penult else 0
            if p_ult - p_penult >= 3.0: tendencia = "Sube"
            elif p_ult - p_penult <= -3.0: tendencia = "Baja"
    else:
        promedio_general = 85.0 
        tendencia = "Estable"

    return porcentaje_asistencia, promedio_general, tendencia

def clasificar_riesgo(porcentaje_asistencia: float, promedio_general: float):
    """
    Única fuente de verdad para clasificar el nivel de riesgo de un estudiante.
    Devuelve (nivel: str, score: float).
    """
    if porcentaje_asistencia < 70.0 or promedio_general < 60.0:
        return "Alto", 0.85
    elif porcentaje_asistencia < 85.0 or promedio_general < 75.0:
        return "Medio", 0.55
    else:
        return "Bajo", 0.15

@router.get("/estudiantes/{id}/riesgo", response_model=RiesgoEstudianteOut, dependencies=[Depends(permitir_acceso)])
def obtener_riesgo_estudiante(id: int, db: Session = Depends(get_db)):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    # Intentar usar modelo XGBoost como flujo principal
    try:
        prediccion = predecir_riesgo(db, id)
        
        # Construir factores desde las variables del modelo
        factores = [
            FactorRiesgo(variable="promedio_general", peso=0.35, valor=f"{round(prediccion['variables']['promedio_general'], 1)}"),
            FactorRiesgo(variable="num_reprobaciones", peso=0.15, valor=str(prediccion['variables']['num_reprobaciones'])),
            FactorRiesgo(variable="pct_asistencias", peso=0.20, valor=f"{round(prediccion['variables']['pct_asistencias'], 1)}%"),
            FactorRiesgo(variable="frecuencia_faltas", peso=0.10, valor=f"{round(prediccion['variables']['frecuencia_faltas'], 2)}"),
            FactorRiesgo(variable="contacto_tutor", peso=0.05, valor=str(prediccion['variables']['contacto_tutor'])),
            FactorRiesgo(variable="acceso_tecnologico", peso=0.10, valor="Parcial (default)"),
            FactorRiesgo(variable="tendencia_calificaciones", peso=0.05, valor="Estable (default)")
        ]

        return RiesgoEstudianteOut(
            estudiante_id=str(id),
            nivel_riesgo=prediccion["riesgo"],
            score=prediccion["probabilidad"],
            factores=factores,
            fecha_calculo=date.today().isoformat(),
            es_prediccion_simulada=False
        )
        
    except RuntimeError as e:
        # Fallback cuando el modelo no puede utilizarse
        print(f"\n{'='*60}")
        print(f"[FALLBACK] Estudiante {id}")
        print(f"[FALLBACK] Motivo: RuntimeError - {e}")
        print(f"[FALLBACK] Usando logica determinista")
        print(f"{'='*60}\n")
        
        porcentaje_asistencia, promedio_general, tendencia = calcular_metricas_estudiante(db, id)
        nivel_riesgo, score = clasificar_riesgo(porcentaje_asistencia, promedio_general)

        factores = [
            FactorRiesgo(variable="porcentaje_asistencia", peso=0.4, valor=f"{round(porcentaje_asistencia, 1)}%"),
            FactorRiesgo(variable="promedio_general", peso=0.35, valor=f"{round(promedio_general, 1)}"),
            FactorRiesgo(variable="tendencia_calificaciones", peso=0.25, valor=tendencia)
        ]

        return RiesgoEstudianteOut(
            estudiante_id=str(id),
            nivel_riesgo=nivel_riesgo,
            score=score,
            factores=factores,
            fecha_calculo=date.today().isoformat(),
            es_prediccion_simulada=True
        )
    
    except Exception as e:
        # Fallback por cualquier otro error del modelo
        import traceback
        print(f"\n{'='*60}")
        print(f"[FALLBACK] Estudiante {id}")
        print(f"[FALLBACK] Motivo: Exception - {type(e).__name__}: {e}")
        print(f"[FALLBACK] Traceback:")
        traceback.print_exc()
        print(f"[FALLBACK] Usando logica determinista")
        print(f"{'='*60}\n")
        
        porcentaje_asistencia, promedio_general, tendencia = calcular_metricas_estudiante(db, id)
        nivel_riesgo, score = clasificar_riesgo(porcentaje_asistencia, promedio_general)

        factores = [
            FactorRiesgo(variable="porcentaje_asistencia", peso=0.4, valor=f"{round(porcentaje_asistencia, 1)}%"),
            FactorRiesgo(variable="promedio_general", peso=0.35, valor=f"{round(promedio_general, 1)}"),
            FactorRiesgo(variable="tendencia_calificaciones", peso=0.25, valor=tendencia)
        ]

        return RiesgoEstudianteOut(
            estudiante_id=str(id),
            nivel_riesgo=nivel_riesgo,
            score=score,
            factores=factores,
            fecha_calculo=date.today().isoformat(),
            es_prediccion_simulada=True
        )

@router.get("/riesgo/resumen", response_model=RiesgoResumenOut, dependencies=[Depends(permitir_acceso)])
def obtener_resumen_riesgo(
    grupo_id: Optional[int] = Query(None),
    carrera: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    query = db.query(Estudiante).filter(Estudiante.estado == True)

    if user_role == "Tutor":
        tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
        grupos_ids = [g.id_grupo for g in db.query(Grupo).filter(Grupo.id_tutor == (tutor.id_tutor if tutor else -1)).all()]
        query = query.filter(Estudiante.id_grupo.in_(grupos_ids or [-1]))
    elif grupo_id or carrera:
        query = query.join(Grupo)
        if grupo_id:
            query = query.filter(Grupo.id_grupo == grupo_id)
        if carrera:
            query = query.filter(Grupo.id_carrera == carrera)

    estudiantes = query.all()
    conteo = {"Bajo": 0, "Medio": 0, "Alto": 0}

    for est in estudiantes:
        # Usar predecir_riesgo() con fallback
        try:
            prediccion = predecir_riesgo(db, est.id_estudiante)
            nivel = prediccion["riesgo"]
        except (RuntimeError, Exception):
            # Fallback a lógica determinista
            p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
            nivel, _ = clasificar_riesgo(p_asis, prom)
        conteo[nivel] += 1

    return RiesgoResumenOut(
        bajo=conteo["Bajo"],
        medio=conteo["Medio"],
        alto=conteo["Alto"],
        total_estudiantes=len(estudiantes)
    )

@router.get("/riesgo/alumnos-atencion", response_model=List[AlumnoAtencionOut])
def obtener_alumnos_requieren_atencion(
    limite: int = Query(5, le=20),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Tutor":
        raise HTTPException(status_code=403, detail="Solo disponible para el rol Tutor")

    tutor = db.query(Tutor).filter(Tutor.id_usuario == current_user.id_usuario).first()
    if not tutor:
        raise HTTPException(status_code=400, detail="Tu cuenta no tiene un perfil de tutor asociado")

    grupos_ids = [g.id_grupo for g in db.query(Grupo).filter(Grupo.id_tutor == tutor.id_tutor).all()]
    if not grupos_ids:
        return []

    estudiantes = db.query(Estudiante).filter(
        Estudiante.id_grupo.in_(grupos_ids),
        Estudiante.estado == True
    ).all()

    resultados = []
    for est in estudiantes:
        # Usar predecir_riesgo() con fallback
        try:
            prediccion = predecir_riesgo(db, est.id_estudiante)
            nivel = prediccion["riesgo"]
            score = prediccion["probabilidad"]
        except (RuntimeError, Exception):
            # Fallback a lógica determinista
            p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
            nivel, score = clasificar_riesgo(p_asis, prom)
        
        if nivel == "Bajo":
            continue

        resultados.append(AlumnoAtencionOut(
            id_estudiante=est.id_estudiante,
            nombre_completo=est.nombre_completo,
            matricula=est.matricula,
            correo_institucional=est.correo_institucional,
            nivel_riesgo=nivel,
            score=score
        ))

    orden_prioridad = {"Alto": 0, "Medio": 1}
    resultados.sort(key=lambda r: orden_prioridad.get(r.nivel_riesgo, 2))

    return resultados[:limite]

# =====================================================================
# ENDPOINTS NUEVOS PARA IA COMPLETA
# =====================================================================

@router.patch("/estudiantes/{id}/socioeconomico")
def actualizar_socioeconomico(
    id: int,
    datos: SocioeconomicoUpdate,
    db: Session = Depends(get_db)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    estudiante.dificultad_economica = datos.dificultad_economica
    estudiante.trabaja_actualmente = datos.trabaja_actualmente
    estudiante.reporte_emocional = datos.reporte_emocional
    estudiante.solicitud_baja = datos.solicitud_baja
    estudiante.acceso_tecnologico = datos.acceso_tecnologico
    
    db.commit()
    
    # Recalcular riesgo después de actualizar datos socioeconómicos
    recalcular_y_guardar_riesgo(db, id)
    
    return {"mensaje": "Datos socioeconómicos actualizados correctamente"}

@router.get("/estudiantes/{id}/calificaciones-historial")
def obtener_calificaciones_historial(
    id: int,
    db: Session = Depends(get_db)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    historial = db.query(HistorialCalificacion).filter(
        HistorialCalificacion.estudiante_id == id
    ).order_by(HistorialCalificacion.parcial).all()
    
    return [
        {
            "parcial": h.parcial,
            "promedio": h.promedio,
            "fecha_registro": h.fecha_registro.isoformat() if h.fecha_registro else None
        }
        for h in historial
    ]

@router.post("/estudiantes/{id}/calificaciones-historial")
def registrar_calificacion_historial(
    id: int,
    datos: CalificacionRegistro,
    db: Session = Depends(get_db)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    historial = HistorialCalificacion(
        estudiante_id=id,
        parcial=datos.parcial,
        promedio=datos.promedio
    )
    db.add(historial)
    db.commit()
    
    # Recalcular riesgo después de registrar calificación
    recalcular_y_guardar_riesgo(db, id)
    
    return {"mensaje": "Calificación registrada correctamente"}

@router.post("/estudiantes/{id}/asistencia")
def registrar_asistencia(
    id: int,
    datos: AsistenciaRegistro,
    db: Session = Depends(get_db)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    from datetime import datetime
    fecha_dt = datetime.strptime(datos.fecha, "%Y-%m-%d").date()
    
    historial = HistorialAsistencia(
        estudiante_id=id,
        fecha=fecha_dt,
        asistio=datos.asistio
    )
    db.add(historial)
    db.commit()
    
    # Recalcular riesgo después de registrar asistencia
    recalcular_y_guardar_riesgo(db, id)
    
    return {"mensaje": "Asistencia registrada correctamente"}

@router.get("/estudiantes/{id}/riesgo/detalle", response_model=RiesgoEstudianteDetalleOut)
def obtener_riesgo_detalle(
    id: int,
    db: Session = Depends(get_db)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    try:
        prediccion = predecir_riesgo(db, id)
        
        return RiesgoEstudianteDetalleOut(
            estudiante_id=str(id),
            nivel_riesgo=prediccion["riesgo"],
            probabilidad=prediccion["probabilidad"],
            detalle=prediccion["probabilidades_por_clase"],
            modo=prediccion.get("modo", "XGBoost")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")

@router.post("/admin/recalcular-riesgos", dependencies=[Depends(permitir_acceso)])
def recalcular_todos_riesgos(db: Session = Depends(get_db)):
    """
    Endpoint temporal para recalcular el riesgo de todos los estudiantes activos.
    Llama a recalcular_y_guardar_riesgo para cada estudiante.
    """
    estudiantes = db.query(Estudiante).filter(Estudiante.estado == True).all()
    
    conteo = {"Alto": 0, "Medio": 0, "Bajo": 0}
    errores = 0
    
    for est in estudiantes:
        try:
            prediccion = recalcular_y_guardar_riesgo(db, est.id_estudiante)
            conteo[prediccion["riesgo"]] += 1
        except Exception as e:
            print(f"Error recalculando riesgo para estudiante {est.id_estudiante}: {e}")
            errores += 1
    
    return {
        "procesados": len(estudiantes),
        "Alto": conteo["Alto"],
        "Medio": conteo["Medio"],
        "Bajo": conteo["Bajo"],
        "errores": errores
    }