import io
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

# Librerías para exportar
import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from app.db.session import SessionLocal
from app.models.models import Estudiante, Grupo, Notificacion, Tutor
from app.schemas.reportes import ReporteEstudianteOut, NotificacionOut, NotificacionCreate
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.routers.riesgo import calcular_metricas_estudiante
from app.core.audit import registrar_auditoria

router = APIRouter(prefix="/api/v1", tags=["Reportes y Notificaciones"])
permitir_acceso = RoleChecker(["Administrador", "Director", "Tutor", "Psicopedagogia", "RRHH"])

# ==========================================
# HELPER: OBTENER DATOS DEL REPORTE
# ==========================================
def obtener_datos_reporte(db: Session, grupo_id: Optional[int], carrera: Optional[str], nivel_riesgo: Optional[str]):
    query = db.query(Estudiante).join(Grupo)
    
    if grupo_id:
        query = query.filter(Grupo.id_grupo == grupo_id)
    if carrera:
        query = query.filter(Grupo.carrera.ilike(f"%{carrera}%"))
        
    estudiantes = query.all()
    resultados = []
    
    for est in estudiantes:
        p_asis, prom, _ = calcular_metricas_estudiante(db, est.id_estudiante)
        
        # Mock de riesgo
        if p_asis < 70.0 or prom < 60.0:
            riesgo = "Alto"
        elif p_asis < 85.0 or prom < 75.0:
            riesgo = "Medio"
        else:
            riesgo = "Bajo"
            
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

# ==========================================
# ENDPOINTS DE REPORTES (JSON, EXCEL, PDF)
# ==========================================
@router.get("/reportes/academico", response_model=List[ReporteEstudianteOut], dependencies=[Depends(permitir_acceso)])
def reporte_json(
    grupo_id: Optional[int] = Query(None),
    carrera: Optional[str] = Query(None),
    nivel_riesgo: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return obtener_datos_reporte(db, grupo_id, carrera, nivel_riesgo)

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
    datos = obtener_datos_reporte(db, grupo_id, carrera, nivel_riesgo)
    
    # Registrar auditoría de esta acción sensible
    registrar_auditoria(db, current_user.id_usuario, f"Exportación de reporte a {formato.upper()}", request.url.path)

    if formato == "excel":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Reporte Académico"
        
        # Encabezados
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
        
        # Encabezado Institucional
        elementos.append(Paragraph("EduPredict AI - Reporte Académico Institucional", estilos['Title']))
        elementos.append(Paragraph(f"Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M')}", estilos['Normal']))
        elementos.append(Spacer(1, 12))
        
        # Datos de la tabla
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

# ==========================================
# ENDPOINTS DE NOTIFICACIONES (HU-06)
# ==========================================
@router.post("/notificaciones", response_model=dict, dependencies=[Depends(permitir_acceso)])
def disparar_notificacion_riesgo(
    data: NotificacionCreate,
    db: Session = Depends(get_db)
):
    # Simulamos el trigger: Se detecta riesgo alto, notificamos al tutor
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