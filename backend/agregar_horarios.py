import random
from app.db.session import SessionLocal
from app.models.models import Docente, Grupo, Materia, Horario, Aula, DiaSemanaEnum

def agregar_horarios():
    db = SessionLocal()
    print("🔧 Verificando horarios existentes...")

    if db.query(Horario).first():
        print("⚠️  Ya existen horarios en la BD. No se agregó nada para evitar duplicados.")
        db.close()
        return

    # Aseguramos que exista al menos un aula
    aula = db.query(Aula).first()
    if not aula:
        aula = Aula(nombre_aula="Aula 101", capacidad=40)
        db.add(aula)
        db.commit()
        db.refresh(aula)

    docentes_db = db.query(Docente).all()
    grupos_db = db.query(Grupo).all()
    materias_db = db.query(Materia).all()

    if not docentes_db or not grupos_db or not materias_db:
        print("❌ Faltan Docentes, Grupos o Materias en la BD. Corre seed.py primero.")
        db.close()
        return

    dias = [DiaSemanaEnum.LUNES, DiaSemanaEnum.MARTES, DiaSemanaEnum.MIERCOLES, DiaSemanaEnum.JUEVES, DiaSemanaEnum.VIERNES]
    horarios_creados = 0

    for grupo in grupos_db:
        materias_grupo = random.sample(materias_db, min(2, len(materias_db)))
        docentes_grupo = random.sample(docentes_db, min(2, len(docentes_db)))
        for i, materia in enumerate(materias_grupo):
            docente_asignado = docentes_grupo[i % len(docentes_grupo)]
            horario = Horario(
                id_grupo=grupo.id_grupo,
                id_materia=materia.id_materia,
                id_docente=docente_asignado.id_docente,
                id_aula=aula.id_aula,
                dia_semana=random.choice(dias)
            )
            db.add(horario)
            horarios_creados += 1

    db.commit()
    print(f"✅ {horarios_creados} horarios creados (docente-materia-grupo asignados).")
    db.close()

if __name__ == "__main__":
    agregar_horarios()