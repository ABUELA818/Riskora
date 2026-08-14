"""
SCRIPT DE SEED DATA OFICIAL PARA RISKORA
Puebla la base de datos con datos realistas para pruebas funcionales.
"""

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import (
    Usuario, Estudiante, Docente, Tutor, Grupo, Carrera, Materia, Periodo,
    HistorialCalificacion, HistorialAsistencia, DirectorCarrera, DocenteCarrera,
    Administrador, PerfilRRHH, RolEnum
)
from app.core.security import get_password_hash
from app.core.prediction_service import predecir_riesgo
from datetime import datetime, date, timedelta
import random

# Configuración
NUM_ESTUDIANTES = 80  # Cantidad manejable para pruebas
NUM_DOCENTES = 3
NUM_TUTORES = 10
NUM_CARRERAS = 5
GRUPOS_POR_CARRERA = 5
CALIFICACIONES_POR_ESTUDIANTE = 6
ASISTENCIAS_POR_ESTUDIANTE = 40

# Datos para generación
NOMBRES_MASCULINOS = [
    "Juan", "Carlos", "Miguel", "José", "Luis", "Fernando", "Roberto", "Alejandro",
    "Diego", "Ricardo", "Javier", "Pedro", "Manuel", "Antonio", "Francisco", "David",
    "Sergio", "Raúl", "Eduardo", "Óscar", "Andrés", "Gabriel", "Daniel", "Adrián", "Pablo"
]

NOMBRES_FEMENINOS = [
    "María", "Ana", "Laura", "Sofía", "Valentina", "Camila", "Fernanda", "Isabella",
    "Ximena", "Andrea", "Patricia", "Carmen", "Rosa", "Elena", "Lucía", "Daniela",
    "Mónica", "Verónica", "Leticia", "Claudia", "Beatriz", "Alicia", "Teresa", "Diana", "Norma"
]

APELLIDOS = [
    "García", "López", "Martínez", "Rodríguez", "González", "Pérez", "Sánchez", "Ramírez",
    "Cruz", "Flores", "Torres", "Rivera", "Morales", "Reyes", "Jiménez", "Mendoza",
    "Castillo", "Castro", "Ortiz", "Silva", "Mendoza", "Ramos", "Vargas", "Delgado", "Rojas"
]

CARRERAS_DATOS = [
    "Ingeniería en Software",
    "Ingeniería Industrial",
    "Licenciatura en Administración",
    "Arquitectura"
]

MATERIAS_POR_CARRERA = {
    "Ingeniería en Software": [
        "Programación I", "Programación II", "Estructuras de Datos",
        "Bases de Datos", "Sistemas Operativos", "Ingeniería de Software"
    ],
    "Ingeniería Industrial": [
        "Dibujo Industrial", "Mecánica Aplicada", "Termodinámica",
        "Gestión de Calidad", "Logística", "Investigación de Operaciones"
    ],
    "Licenciatura en Administración": [
        "Contabilidad I", "Contabilidad II", "Finanzas",
        "Marketing", "Recursos Humanos", "Economía"
    ],
    "Arquitectura": [
        "Dibujo Arquitectónico", "Historia de la Arquitectura", "Materiales de Construcción",
        "Estructuras I", "Estructuras II", "Diseño Arquitectónico"
    ]
}

def generar_matricula():
    """Genera una matrícula única"""
    año = datetime.now().year
    random_num = random.randint(10000, 99999)
    return f"{año}{random_num}"

def generar_nombre_completo():
    """Genera un nombre completo realista"""
    if random.random() < 0.5:
        nombre = random.choice(NOMBRES_MASCULINOS)
    else:
        nombre = random.choice(NOMBRES_FEMENINOS)
    apellido1 = random.choice(APELLIDOS)
    apellido2 = random.choice(APELLIDOS)
    return f"{nombre} {apellido1} {apellido2}"

def generar_correo(nombre_completo, dominio="edupredict.edu"):
    """Genera un correo institucional"""
    nombre_lower = nombre_completo.lower().replace(" ", ".")
    nombre_lower = nombre_lower.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    random_num = random.randint(1, 999)
    return f"{nombre_lower}{random_num}@{dominio}"

def generar_perfil_socioeconomico():
    """Genera un perfil socioeconómico coherente"""
    dificultad_economica = random.choices([0, 1], weights=[0.7, 0.3])[0]
    
    if dificultad_economica == 1:
        trabaja_actualmente = random.choices([0, 1], weights=[0.4, 0.6])[0]
    else:
        trabaja_actualmente = random.choices([0, 1], weights=[0.8, 0.2])[0]
    
    if trabaja_actualmente == 1 and dificultad_economica == 1:
        reporte_emocional = random.choices([0, 1], weights=[0.6, 0.4])[0]
    else:
        reporte_emocional = random.choices([0, 1], weights=[0.9, 0.1])[0]
    
    solicitud_baja = random.choices([0, 1], weights=[0.95, 0.05])[0]
    
    if dificultad_economica == 1:
        acceso_tecnologico = random.choices([0, 1, 2], weights=[0.4, 0.4, 0.2])[0]
    else:
        acceso_tecnologico = random.choices([0, 1, 2], weights=[0.1, 0.3, 0.6])[0]
    
    return {
        "dificultad_economica": dificultad_economica,
        "trabaja_actualmente": trabaja_actualmente,
        "reporte_emocional": reporte_emocional,
        "solicitud_baja": solicitud_baja,
        "acceso_tecnologico": acceso_tecnologico
    }

def generar_calificaciones(estudiante_id, perfil_socioeconomico):
    """Genera calificaciones coherentes con el perfil socioeconómico"""
    calificaciones = []
    
    base_rendimiento = 85
    if perfil_socioeconomico["dificultad_economica"] == 1:
        base_rendimiento -= 10
    if perfil_socioeconomico["trabaja_actualmente"] == 1:
        base_rendimiento -= 5
    if perfil_socioeconomico["reporte_emocional"] == 1:
        base_rendimiento -= 8
    
    for parcial in range(1, 4):
        rendimiento = max(50, min(100, base_rendimiento + random.randint(-15, 15)))
        fecha = datetime.now() - timedelta(days=90 - (parcial * 30))
        
        calificaciones.append({
            "estudiante_id": estudiante_id,
            "parcial": parcial,
            "promedio": rendimiento,
            "fecha_registro": fecha
        })
    
    return calificaciones

def generar_asistencias(estudiante_id, calificaciones):
    """Genera asistencias coherentes"""
    asistencias = []
    
    promedio = sum(c["promedio"] for c in calificaciones) / len(calificaciones)
    base_asistencia = 0.85
    
    if promedio < 70:
        base_asistencia -= 0.15
    elif promedio > 85:
        base_asistencia += 0.10
    
    base_asistencia = max(0.5, min(0.95, base_asistencia))
    
    fecha_inicio = datetime.now() - timedelta(days=90)
    fecha_actual = fecha_inicio
    
    while fecha_actual <= datetime.now():
        if fecha_actual.weekday() < 5:  # Solo días hábiles
            asistio = random.random() < base_asistencia
            asistencias.append({
                "estudiante_id": estudiante_id,
                "fecha": fecha_actual.date(),
                "asistio": asistio
            })
        
        fecha_actual += timedelta(days=1)
    
    return asistencias

def main():
    """Función principal"""
    print("=" * 80)
    print("SEED DATA OFICIAL PARA RISKORA")
    print("=" * 80)
    print(f"Objetivo: {NUM_ESTUDIANTES} estudiantes")
    print()
    
    db = SessionLocal()
    
    try:
        # Paso 1: Crear carreras
        print("Creando carreras...")
        carreras = []
        for nombre_carrera in CARRERAS_DATOS:
            carrera = Carrera(nombre=nombre_carrera)
            db.add(carrera)
            db.flush()
            carreras.append(carrera)
        db.commit()
        print(f"{len(carreras)} carreras creadas")
        
        # Paso 2: Crear grupos
        print("Creando grupos...")
        grupos = []
        for carrera in carreras:
            for i in range(1, GRUPOS_POR_CARRERA + 1):
                if "Software" in carrera.nombre:
                    sigla = "ISW"
                elif "Industrial" in carrera.nombre:
                    sigla = "II"
                elif "Administración" in carrera.nombre:
                    sigla = "LA"
                elif "Arquitectura" in carrera.nombre:
                    sigla = "ARQ"
                else:
                    sigla = "GEN"
                
                nombre_grupo = f"{sigla}-{i}A"
                cuatrimestre = random.randint(1, 8)
                
                grupo = Grupo(
                    nombre_grupo=nombre_grupo,
                    id_carrera=carrera.id_carrera,
                    cuatrimestre=cuatrimestre
                )
                db.add(grupo)
                db.flush()
                grupos.append(grupo)
        db.commit()
        print(f"{len(grupos)} grupos creados")
        
        # Paso 3: Crear docentes
        print("Creando docentes...")
        docentes = []
        for i in range(NUM_DOCENTES):
            nombre = generar_nombre_completo()
            correo = generar_correo(nombre)
            
            usuario = Usuario(
                nombre_completo=nombre,
                correo_institucional=correo,
                password_hash=get_password_hash("password123"),
                rol=RolEnum.DOCENTE
            )
            db.add(usuario)
            db.flush()
            
            docente = Docente(id_usuario=usuario.id_usuario)
            db.add(docente)
            db.flush()
            docentes.append(docente)
        db.commit()
        print(f"{len(docentes)} docentes creados")
        
        # Paso 4: Crear tutores
        print("Creando tutores...")
        tutores = []
        for i in range(NUM_TUTORES):
            nombre = generar_nombre_completo()
            correo = generar_correo(nombre)
            
            usuario = Usuario(
                nombre_completo=nombre,
                correo_institucional=correo,
                password_hash=get_password_hash("password123"),
                rol=RolEnum.TUTOR
            )
            db.add(usuario)
            db.flush()
            
            tutor = Tutor(id_usuario=usuario.id_usuario)
            db.add(tutor)
            db.flush()
            tutores.append(tutor)
        db.commit()
        print(f"{len(tutores)} tutores creados")
        
        # Paso 5: Asignar tutores a grupos
        print("Asignando tutores a grupos...")
        for i, grupo in enumerate(grupos):
            if i < len(tutores):
                grupo.id_tutor = tutores[i].id_tutor
        db.commit()
        print("Tutores asignados a grupos")
        
        # Paso 6.5: Crear usuarios administrativos (Admin, Director, RRHH, Psicopedagogia)
        print("Creando usuarios administrativos...")
        
        # Admin
        admin_usuario = Usuario(
            nombre_completo="Administrador del Sistema",
            correo_institucional="admin@edupredict.edu",
            password_hash=get_password_hash("password123"),
            rol=RolEnum.ADMINISTRADOR
        )
        db.add(admin_usuario)
        db.flush()
        
        # Crear registro en tabla Administrador
        admin_registro = Administrador(
            id_usuario=admin_usuario.id_usuario,
            puesto="Administrador General"
        )
        db.add(admin_registro)
        db.flush()
        
        # Director
        director_usuario = Usuario(
            nombre_completo="Director de Carrera",
            correo_institucional="director1@edupredict.edu",
            password_hash=get_password_hash("password123"),
            rol=RolEnum.DIRECTOR
        )
        db.add(director_usuario)
        db.flush()
        
        # Relacionar director con primera carrera
        if carreras:
            director_carrera = DirectorCarrera(
                id_usuario=director_usuario.id_usuario,
                id_carrera=carreras[0].id_carrera
            )
            db.add(director_carrera)
            db.flush()
        
        # RRHH
        rrhh_usuario = Usuario(
            nombre_completo="Recursos Humanos",
            correo_institucional="rrhh1@edupredict.edu",
            password_hash=get_password_hash("password123"),
            rol=RolEnum.RRHH
        )
        db.add(rrhh_usuario)
        db.flush()
        
        # Crear registro en tabla PerfilRRHH
        rrhh_registro = PerfilRRHH(
            id_usuario=rrhh_usuario.id_usuario,
            departamento="Recursos Humanos"
        )
        db.add(rrhh_registro)
        db.flush()
        
        # Psicopedagogia
        psico_usuario = Usuario(
            nombre_completo="Psicopedagogia",
            correo_institucional="psico1@edupredict.edu",
            password_hash=get_password_hash("password123"),
            rol=RolEnum.PSICOPEDAGOGIA
        )
        db.add(psico_usuario)
        db.flush()
        
        db.commit()
        print("Usuarios administrativos creados")
        
        # Paso 7: Crear estudiantes
        
        # Paso 6: Crear estudiantes
        print("Creando estudiantes...")
        estudiantes = []
        estudiantes_por_grupo = NUM_ESTUDIANTES // len(grupos)
        
        for grupo in grupos:
            for _ in range(estudiantes_por_grupo):
                nombre = generar_nombre_completo()
                matricula = generar_matricula()
                correo = generar_correo(nombre)
                
                perfil = generar_perfil_socioeconomico()
                
                estudiante = Estudiante(
                    matricula=matricula,
                    nombre_completo=nombre,
                    correo_institucional=correo,
                    id_grupo=grupo.id_grupo,
                    fecha_ingreso=datetime.now() - timedelta(days=random.randint(180, 730)),
                    estado=True,
                    edad=random.randint(17, 25),
                    celular=f"+52{random.randint(1000000000, 9999999999)}",
                    contacto_emergencia_nombre=generar_nombre_completo(),
                    contacto_emergencia_telefono=f"+52{random.randint(1000000000, 9999999999)}",
                    dificultad_economica=perfil["dificultad_economica"],
                    trabaja_actualmente=perfil["trabaja_actualmente"],
                    reporte_emocional=perfil["reporte_emocional"],
                    solicitud_baja=perfil["solicitud_baja"]
                )
                db.add(estudiante)
                db.flush()
                estudiantes.append(estudiante)
        
        db.commit()
        print(f"{len(estudiantes)} estudiantes creados")
        
        # Paso 7: Crear calificaciones
        print("Creando calificaciones...")
        total_calificaciones = 0
        for estudiante in estudiantes:
            perfil = {
                "dificultad_economica": estudiante.dificultad_economica,
                "trabaja_actualmente": estudiante.trabaja_actualmente,
                "reporte_emocional": estudiante.reporte_emocional,
                "solicitud_baja": estudiante.solicitud_baja,
                "acceso_tecnologico": 0
            }
            
            calificaciones = generar_calificaciones(estudiante.id_estudiante, perfil)
            
            for calif in calificaciones:
                hist_calif = HistorialCalificacion(
                    estudiante_id=calif["estudiante_id"],
                    parcial=calif["parcial"],
                    promedio=calif["promedio"],
                    fecha_registro=calif["fecha_registro"]
                )
                db.add(hist_calif)
                total_calificaciones += 1
        
        db.commit()
        print(f"{total_calificaciones} calificaciones creadas")
        
        # Paso 8: Crear asistencias
        print("Creando asistencias...")
        total_asistencias = 0
        for estudiante in estudiantes:
            calificaciones = db.query(HistorialCalificacion).filter(
                HistorialCalificacion.estudiante_id == estudiante.id_estudiante
            ).all()
            
            perfil = {
                "dificultad_economica": estudiante.dificultad_economica,
                "trabaja_actualmente": estudiante.trabaja_actualmente,
                "reporte_emocional": estudiante.reporte_emocional,
                "solicitud_baja": estudiante.solicitud_baja,
                "acceso_tecnologico": 0
            }
            
            calif_dict = [{"promedio": c.promedio} for c in calificaciones]
            asistencias = generar_asistencias(estudiante.id_estudiante, calif_dict)
            
            for asist in asistencias:
                hist_asist = HistorialAsistencia(
                    estudiante_id=asist["estudiante_id"],
                    fecha=asist["fecha"],
                    asistio=asist["asistio"]
                )
                db.add(hist_asist)
                total_asistencias += 1
        
        db.commit()
        print(f"{total_asistencias} asistencias creadas")
        
        # Paso 9: Asignar docentes a carreras
        print("Asignando docentes a carreras...")
        for docente in docentes:
            if carreras:
                carrera = random.choice(carreras)
                asignacion = DocenteCarrera(
                    id_docente=docente.id_docente,
                    id_carrera=carrera.id_carrera
                )
                db.add(asignacion)
        db.commit()
        print("Docentes asignados a carreras")
        
        # Paso 10: Recalcular riesgos
        print("Recalculando riesgos con XGBoost...")
        calculados = 0
        for estudiante in estudiantes:
            try:
                prediccion = predecir_riesgo(db, estudiante.id_estudiante)
                estudiante.nivel_riesgo = prediccion["riesgo"]
                estudiante.probabilidad_riesgo = prediccion["probabilidad"]
                calculados += 1
            except Exception as e:
                print(f"Error calculando riesgo para estudiante {estudiante.id_estudiante}: {e}")
                continue
        
        db.commit()
        print(f"{calculados} riesgos recalculados")
        
        # Paso 11: Reporte final
        print("\n" + "=" * 80)
        print("REPORTE FINAL DE SEED DATA")
        print("=" * 80)
        
        estudiantes = db.query(Estudiante).all()
        bajo = sum(1 for e in estudiantes if e.nivel_riesgo == 'Bajo')
        medio = sum(1 for e in estudiantes if e.nivel_riesgo == 'Medio')
        alto = sum(1 for e in estudiantes if e.nivel_riesgo == 'Alto')
        
        print(f"\nPOBLACION:")
        print(f"  Estudiantes: {len(estudiantes)}")
        print(f"  Docentes: {len(docentes)}")
        print(f"  Tutores: {len(tutores)}")
        print(f"  Grupos: {len(grupos)}")
        print(f"  Carreras: {len(carreras)}")
        
        print(f"\nHISTORIAL ACADÉMICO:")
        print(f"  Calificaciones totales: {total_calificaciones}")
        print(f"  Promedio por estudiante: {total_calificaciones / len(estudiantes):.1f}")
        
        print(f"\nASISTENCIA:")
        print(f"  Registros totales: {total_asistencias}")
        print(f"  Promedio por estudiante: {total_asistencias / len(estudiantes):.1f}")
        
        print(f"\nRIESGO:")
        print(f"  Bajo: {bajo} ({bajo/len(estudiantes)*100:.1f}%)")
        print(f"  Medio: {medio} ({medio/len(estudiantes)*100:.1f}%)")
        print(f"  Alto: {alto} ({alto/len(estudiantes)*100:.1f}%)")
        
        print("\n" + "=" * 80)
        print("SEED DATA COMPLETADA EXITOSAMENTE")
        print("=" * 80)
        
    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
