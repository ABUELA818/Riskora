import random
from app.db.session import SessionLocal
from app.models.models import Usuario, Docente, RolEnum, Carrera, DocenteCarrera, DirectorCarrera

def asignar_carreras():
    db = SessionLocal()
    print("🔧 Verificando asignaciones existentes...")

    if db.query(DocenteCarrera).first() or db.query(DirectorCarrera).first():
        print("⚠️  Ya existen asignaciones. No se agregó nada para evitar duplicados.")
        db.close()
        return

    carreras_db = db.query(Carrera).all()
    if not carreras_db:
        print("❌ No hay carreras en la BD. Corre la migración de carreras primero.")
        db.close()
        return

    # --- Asignar Directores a carreras ---
    usuarios_director = db.query(Usuario).filter(Usuario.rol == RolEnum.DIRECTOR).all()
    if not usuarios_director:
        print("⚠️  No hay usuarios con rol Director en la BD.")
    else:
        for i, director in enumerate(usuarios_director):
            carrera_asignada = carreras_db[i % len(carreras_db)]
            db.add(DirectorCarrera(id_usuario=director.id_usuario, id_carrera=carrera_asignada.id_carrera))
            print(f"  Director '{director.nombre_completo}' → {carrera_asignada.nombre}")
        db.commit()
        print(f"✅ {len(usuarios_director)} Director(es) asignados a carrera.")

    # --- Asignar Docentes a carreras ---
    docentes_db = db.query(Docente).all()
    if not docentes_db:
        print("⚠️  No hay Docentes en la BD.")
    else:
        for i, docente in enumerate(docentes_db):
            carrera_asignada = carreras_db[i % len(carreras_db)]
            db.add(DocenteCarrera(id_docente=docente.id_docente, id_carrera=carrera_asignada.id_carrera))
        db.commit()
        print(f"✅ {len(docentes_db)} Docente(s) asignados a carrera.")

    db.close()

if __name__ == "__main__":
    asignar_carreras()