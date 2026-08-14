import io
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func 
from typing import List, Optional
from datetime import datetime

import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Notificacion, Tutor, Carrera, Materia, Calificacion, Alerta, RiesgoEnum, DirectorCarrera
from app.schemas.reportes import (
    ReporteEstudianteOut, NotificacionOut, NotificacionCreate,
    RiesgoPorCarreraOut, ReprobacionPorMateriaOut, TendenciaRiesgoPuntoOut  # NUEVO
)
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.routers.riesgo import calcular_metricas_estudiante, clasificar_riesgo
from app.core.audit import registrar_auditoria

router = APIRouter(prefix="/api/v1", tags=["Reportes y Notificaciones"])
permitir_acceso = RoleChecker(["Administrador", "Director", "Tutor", "Psicopedagogia"])

def _carreras_permitidas(db: Session, current_user):
    user_role = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    if user_role != "Director":
        return None
    return [c.id_carrera for c in db.query(DirectorCarrera).filter(
        DirectorCarrera.id_usuario == current_user.id_usuario
    ).all()]

def obtener_datos_reporte(db: Session, grupo_id: Optional[int], carrera: Optional[int], nivel_riesgo: Optional[str], current_user):
    query = db.query(Estudiante).join(Grupo)
    
    permitidas = _carreras_permitidas(db, current_user)
    if permitidas is not None:
        query = query.filter(Grupo.id_carrera.in_(permitidas or [-1]))

    if grupo_id:
        query = query.filter(Grupo.id_grupo == grupo_id)
    if carrera:
        query = query.filter(Grupo.id_carrera == carrera)
        
    estudiantes = query.all()
    resultados = []
    
    for est in estudiantes:

        p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
        riesgo, _ = clasificar_riesgo(p_asis, prom)
        if nivel_riesgo and riesgo.lower() != nivel_riesgo.lower():
            continue
            
        resultados.append(ReporteEstudianteOut(
            id_estudiante=est.id_estudiante,
            nombre_completo=est.nombre_completo,
            matricula=est.matricula,
            porcentaje_asistencia=round(p_asis, 1),
            promedio_general=round(prom, 1),
            nivel_riesgo=riesgo
        ))
        
    return resultados

@router.get("/reportes/academico", response_model=List[ReporteEstudianteOut], dependencies=[Depends(permitir_acceso)])
def reporte_json(
    grupo_id: Optional[int] = Query(None),
    carrera: Optional[str] = Query(None),
    nivel_riesgo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    return obtener_datos_reporte(db, grupo_id, carrera, nivel_riesgo, current_user)

@router.get("/reportes/academico/export", dependencies=[Depends(permitir_acceso)])
def exportar_reporte(
    request: Request,
    formato: str = Query(..., regex="^(pdf|excel)$"),
    grupo_id: Optional[int] = Query(None),
    carrera: Optional[str] = Query(None),
    nivel_riesgo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    datos = obtener_datos_reporte(db, grupo_id, carrera, nivel_riesgo, current_user)

    registrar_auditoria(db, current_user.id_usuario, f"Exportación de reporte a {formato.upper()}", request.url.path)

    if formato == "excel":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Reporte Académico"
        
        ws.append(["Matrícula", "Nombre Completo", "Asistencia (%)", "Promedio", "Nivel de Riesgo"])
        
        for d in datos:
            ws.append([d.matricula, d.nombre_completo, d.porcentaje_asistencia, d.promedio_general, d.nivel_riesgo])
            
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        
        return StreamingResponse(
            stream, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=Reporte_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )

    elif formato == "pdf":
        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=letter)
        elementos = []
        estilos = getSampleStyleSheet()
        
        elementos.append(Paragraph("Riskora - Reporte Académico Institucional", estilos['Title']))
        elementos.append(Paragraph(f"Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M')}", estilos['Normal']))
        elementos.append(Spacer(1, 12))
        
        datos_tabla = [["Matrícula", "Nombre Completo", "Asistencia", "Promedio", "Riesgo"]]
        for d in datos:
            datos_tabla.append([d.matricula, d.nombre_completo, f"{d.porcentaje_asistencia}%", str(d.promedio_general), d.nivel_riesgo])
            
        tabla = Table(datos_tabla)
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4F46E5")), # Morado Institucional
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        
        elementos.append(tabla)
        doc.build(elementos)
        stream.seek(0)
        
        return StreamingResponse(
            stream, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Reporte_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )

@router.post("/notificaciones", response_model=dict, dependencies=[Depends(permitir_acceso)])
def disparar_notificacion_riesgo(
    data: NotificacionCreate,
    db: Session = Depends(get_db)
):
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == data.id_estudiante).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
    grupo = db.query(Grupo).filter(Grupo.id_grupo == estudiante.id_grupo).first()
    if grupo and grupo.id_tutor:
        tutor = db.query(Tutor).filter(Tutor.id_tutor == grupo.id_tutor).first()
        if tutor:
            mensaje = f"ALERTA: El estudiante {estudiante.nombre_completo} ha pasado a Riesgo ALTO. Urge seguimiento."
            nueva_noti = Notificacion(id_usuario=tutor.id_usuario, mensaje=mensaje)
            db.add(nueva_noti)
            db.commit()
            return {"status": "ok", "message": "Notificación enviada al tutor"}
            
    return {"status": "warning", "message": "Estudiante sin tutor asignado"}

@router.get("/notificaciones", response_model=List[NotificacionOut])
def mis_notificaciones(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    return db.query(Notificacion).filter(Notificacion.id_usuario == current_user.id_usuario).order_by(Notificacion.fecha.desc()).all()

@router.get("/reportes/riesgo-por-carrera", dependencies=[Depends(permitir_acceso)])
def riesgo_por_carrera(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)): 

    permitidas = _carreras_permitidas(db, current_user)
    query = db.query(Carrera)
    if permitidas is not None:
        query = query.filter(Carrera.id_carrera.in_(permitidas or [-1]))
    carreras = query.all() 

    resultado = []
    for carrera in carreras:
        estudiantes = db.query(Estudiante).join(Grupo).filter(
            Grupo.id_carrera == carrera.id_carrera,
            Estudiante.estado == True
        ).all()
        r_bajo = r_medio = r_alto = 0
        for est in estudiantes:
            # Usar el nivel de riesgo ya calculado por XGBoost
            if est.nivel_riesgo == "Alto":
                r_alto += 1
            elif est.nivel_riesgo == "Medio":
                r_medio += 1
            elif est.nivel_riesgo == "Bajo":
                r_bajo += 1

        resultado.append({
            "id_carrera": carrera.id_carrera,
            "carrera": carrera.nombre,
            "riesgo_bajo": r_bajo,
            "riesgo_medio": r_medio,
            "riesgo_alto": r_alto,
            "total_estudiantes": len(estudiantes)
        })
    return resultado


@router.get("/reportes/reprobacion-por-materia", response_model=List[ReprobacionPorMateriaOut], dependencies=[Depends(permitir_acceso)])
def reprobacion_por_materia(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    permitidas = _carreras_permitidas(db, current_user)

    materias = db.query(Materia).filter(Materia.estado == True).all()
    resultado = []
    for materia in materias:
        query_califs = db.query(Calificacion).filter(Calificacion.id_materia == materia.id_materia)

        if permitidas is not None:
            ids_estudiantes = db.query(Estudiante.id_estudiante)\
                .join(Grupo, Estudiante.id_grupo == Grupo.id_grupo)\
                .filter(Grupo.id_carrera.in_(permitidas or [-1])).subquery()
            query_califs = query_califs.filter(Calificacion.id_estudiante.in_(ids_estudiantes))

        calificaciones = query_califs.all()
        total = len(calificaciones)
        if total == 0:
            continue
        reprobadas = sum(1 for c in calificaciones if float(c.valor) < 60.0)
        resultado.append(ReprobacionPorMateriaOut(
            id_materia=materia.id_materia,
            materia=materia.nombre_materia,
            total_evaluaciones=total,
            reprobadas=reprobadas,
            porcentaje_reprobacion=round((reprobadas / total) * 100, 1)
        ))
    resultado.sort(key=lambda r: r.porcentaje_reprobacion, reverse=True)
    return resultado[:10]


@router.post("/reportes/snapshot-riesgo", dependencies=[Depends(permitir_acceso)])
def generar_snapshot_riesgo(db: Session = Depends(get_db)):
    """Captura el nivel de riesgo actual de cada estudiante activo en la tabla
    'alertas', usada como histórico para la gráfica de tendencia (RF-P7)."""
    estudiantes = db.query(Estudiante).filter(Estudiante.estado == True).all()
    creadas = 0
    
    NIVEL_A_ENUM = {"Alto": RiesgoEnum.ALTO, "Medio": RiesgoEnum.MEDIO, "Bajo": RiesgoEnum.BAJO}
    for est in estudiantes:
        p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
        nivel_str, prob = clasificar_riesgo(p_asis, prom)
        nivel = NIVEL_A_ENUM[nivel_str]

        db.add(Alerta(
            id_estudiante=est.id_estudiante,
            nivel_riesgo=nivel,
            probabilidad=prob,
            porcentaje_inasistencia=round(100 - p_asis, 2),
            promedio_ponderado=round(prom, 2)
        ))
        creadas += 1
    db.commit()
    return {"message": f"Snapshot generado: {creadas} registros de riesgo capturados."}


@router.get("/reportes/tendencia-riesgo", response_model=List[TendenciaRiesgoPuntoOut], dependencies=[Depends(permitir_acceso)])
def tendencia_riesgo(meses: int = Query(6, le=24), db: Session = Depends(get_db)):
    filas = db.query(
        func.to_char(Alerta.fecha_calculo, 'YYYY-MM').label('periodo'),
        Alerta.nivel_riesgo,
        func.count(Alerta.id_alerta)
    ).group_by('periodo', Alerta.nivel_riesgo).order_by('periodo').all()

    mapa = {}
    for periodo, nivel, cantidad in filas:
        mapa.setdefault(periodo, {"riesgo_bajo": 0, "riesgo_medio": 0, "riesgo_alto": 0})
        nivel_val = nivel.value if hasattr(nivel, 'value') else nivel
        if nivel_val == "Riesgo Bajo":
            mapa[periodo]["riesgo_bajo"] = cantidad
        elif nivel_val == "Riesgo Medio":
            mapa[periodo]["riesgo_medio"] = cantidad
        elif nivel_val == "Riesgo Alto":
            mapa[periodo]["riesgo_alto"] = cantidad

    periodos = sorted(mapa.keys())[-meses:]
    return [TendenciaRiesgoPuntoOut(periodo=p, **mapa[p]) for p in periodos]