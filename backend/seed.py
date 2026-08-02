import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import (
    Usuario, Tutor, Docente, Grupo, Estudiante, Materia, Periodo, 
    Calificacion, Asistencia, ObservacionConducta, Intervencion, 
    EstatusAsistenciaEnum, RolEnum
)
from app.core.security import get_password_hash

def seed_database():
    db: Session = SessionLocal()
    print("🌱 Iniciando el sembrado masivo de datos para EduPredict AI...")

    try:
        # 1. CREAR PERFILES ADMINISTRATIVOS Y DIRECTIVOS
        roles_admin = [
            ("administrador", RolEnum.ADMINISTRADOR),
            ("rrhh", RolEnum.RRHH),
            ("psicopedagogia", RolEnum.PSICOPEDAGOGIA),
            ("director", RolEnum.DIRECTOR)
        ]
        
        for prefix, rol_enum in roles_admin:
            correo = f"{prefix}0@edupredict.edu"
            if not db.query(Usuario).filter(Usuario.correo_institucional == correo).first():
                user = Usuario(
                    nombre_completo=f"{rol_enum.value} de Prueba",
                    correo_institucional=correo,
                    password_hash=get_password_hash("password123"),
                    rol=rol_enum,
                    estado=True,
                    token_version=1
                )
                db.add(user)
        db.commit()
        print("✅ Usuarios administrativos creados.")

        # 2. CREAR TUTORES Y DOCENTES
        tutores_db = []
        docentes_db = []
        for i in range(1, 6):
            # Tutores
            correo_t = f"tutor{i}@edupredict.edu"
            if not db.query(Usuario).filter(Usuario.correo_institucional == correo_t).first():
                u_tutor = Usuario(
                    nombre_completo=f"Tutor {i} Apellido", 
                    correo_institucional=correo_t, 
                    password_hash=get_password_hash("password123"), 
                    rol=RolEnum.TUTOR,
                    estado=True,
                    token_version=1
                )
                db.add(u_tutor)
                db.commit()
                db.refresh(u_tutor)
                tutor = Tutor(id_usuario=u_tutor.id_usuario, numero_empleado=f"TUT-{1000+i}")
                db.add(tutor)
                db.commit()
                db.refresh(tutor)
                tutores_db.append(tutor)

            # Docentes
            correo_d = f"docente{i}@edupredict.edu"
            if not db.query(Usuario).filter(Usuario.correo_institucional == correo_d).first():
                u_docente = Usuario(
                    nombre_completo=f"Docente {i} Apellido", 
                    correo_institucional=correo_d, 
                    password_hash=get_password_hash("password123"), 
                    rol=RolEnum.DOCENTE,
                    estado=True,
                    token_version=1
                )
                db.add(u_docente)
                db.commit()
                db.refresh(u_docente)
                docente = Docente(id_usuario=u_docente.id_usuario, numero_empleado=f"DOC-{2000+i}")
                db.add(docente)
                db.commit()
                db.refresh(docente)
                docentes_db.append(docente)

        if not tutores_db: tutores_db = db.query(Tutor).limit(5).all()
        if not docentes_db: docentes_db = db.query(Docente).limit(5).all()
        print("✅ Tutores y Docentes creados.")

        # 3. CREAR GRUPOS, PERIODO Y MATERIAS
        periodo = db.query(Periodo).first()
        if not periodo:
            periodo = Periodo(nombre_periodo="Semestre 2024-1", fecha_inicio=datetime(2024, 1, 15).date(), fecha_fin=datetime(2024, 6, 15).date())
            db.add(periodo)
            db.commit()
            db.refresh(periodo)

        carreras = ["Ingeniería en Sistemas", "Psicología", "Medicina", "Arquitectura", "Derecho"]
        grupos_db = []
        for i, carrera in enumerate(carreras):
            grupo = Grupo(nombre_grupo=f"Grupo {i+1}-A", carrera=carrera, cuatrimestre=random.randint(1, 8), id_tutor=random.choice(tutores_db).id_tutor)
            db.add(grupo)
            grupos_db.append(grupo)
        db.commit()

        materias_nombres = ["Algoritmos", "Estadística", "Anatomía", "Diseño", "Derecho Penal", "Cálculo", "Ética"]
        materias_db = []
        for i, nombre in enumerate(materias_nombres):
            mat = Materia(nombre_materia=nombre, clave_materia=f"MAT-{i+100}", creditos=random.randint(4, 8))
            db.add(mat)
            materias_db.append(mat)
        db.commit()
        print("✅ Grupos, Materias y Periodo creados.")

        # 4. CREAR ESTUDIANTES MASIVOS (150 estudiantes simulados)
        nombres = ["Ana", "Carlos", "Lucía", "Mateo", "Sofía", "Javier", "Valeria", "Diego", "Martina", "Alejandro", "Elena", "Daniel", "Carmen", "Hugo", "Laura"]
        apellidos = ["García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz", "Gómez", "Flores", "Morales", "Ortiz", "Reyes"]

        estudiantes_db = []
        for i in range(150):
            nombre_completo = f"{random.choice(nombres)} {random.choice(apellidos)} {random.choice(apellidos)}"
            est = Estudiante(
                nombre_completo=nombre_completo,
                matricula=f"MAT-{2024000+i}",
                id_grupo=random.choice(grupos_db).id_grupo,
                fecha_ingreso=datetime(2024, 1, 10).date(),
                estado=True
            )
            db.add(est)
            estudiantes_db.append(est)
        db.commit()
        print(f"✅ {len(estudiantes_db)} Estudiantes creados.")

        # 5. INYECTAR DATOS DE RIESGO (ASISTENCIAS Y CALIFICACIONES)
        fechas_clases = [datetime.today() - timedelta(days=x) for x in range(30)]
        
        for index, est in enumerate(estudiantes_db):
            if index < 30:
                perfil = "Alto"
            elif index < 80:
                perfil = "Medio"
            else:
                perfil = "Bajo"
            
            # --- Generar Asistencias ---
            for fecha in fechas_clases:
                if fecha.weekday() >= 5: continue 
                
                prob_falta = 0.4 if perfil == "Alto" else (0.2 if perfil == "Medio" else 0.05)
                estatus = EstatusAsistenciaEnum.AUSENTE if random.random() < prob_falta else EstatusAsistenciaEnum.PRESENTE
                
                db.add(Asistencia(id_estudiante=est.id_estudiante, fecha=fecha.date(), estatus=estatus))

            # --- Generar Calificaciones ---
            for mat in random.sample(materias_db, 4):
                for parcial in [1, 2, 3]:
                    if perfil == "Alto":
                        valor = random.uniform(40.0, 59.9)
                    elif perfil == "Medio":
                        valor = random.uniform(60.0, 74.9)
                    else:
                        valor = random.uniform(75.0, 100.0)
                    
                    if perfil == "Alto" and parcial == 3: valor -= 10 
                        
                    db.add(Calificacion(
                        id_estudiante=est.id_estudiante,
                        id_materia=mat.id_materia,
                        id_periodo=periodo.id_periodo,
                        parcial=parcial,
                        valor=round(max(0, valor), 2)
                    ))

            # --- Generar Observaciones e Intervenciones ---
            if perfil in ["Alto", "Medio"]:
                if random.random() > 0.5:
                    db.add(ObservacionConducta(
                        id_estudiante=est.id_estudiante,
                        id_docente=random.choice(docentes_db).id_docente,
                        etiqueta="Falta de Interés" if perfil == "Medio" else "Ausentismo Severo",
                        nota="El alumno muestra señales claras de desconexión con la clase.",
                        fecha_registro=datetime.now() - timedelta(days=random.randint(1, 15))
                    ))
                
                escalar = True if perfil == "Alto" and random.random() > 0.3 else False
                db.add(Intervencion(
                    id_estudiante=est.id_estudiante,
                    id_tutor=random.choice(tutores_db).id_tutor,
                    fecha=datetime.now().date() - timedelta(days=random.randint(1, 10)),
                    acuerdos="Se intentó contactar a la familia por faltas reiteradas." if escalar else "Se firmó carta compromiso de asistencia.",
                    nivel_resolucion="Llamada Telefónica",
                    escalado=escalar
                ))

        db.commit()
        print("✅ Calificaciones, Asistencias, Observaciones e Intervenciones inyectadas con éxito.")
        print("\n🎉 ¡SEEDING COMPLETADO! Tu base de datos ahora tiene miles de registros.")
        print("Puedes iniciar sesión con cualquier correo (ej. administrador0@edupredict.edu o tutor1@edupredict.edu) y contraseña: password123")

    except Exception as e:
        print(f"❌ Error durante el seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()