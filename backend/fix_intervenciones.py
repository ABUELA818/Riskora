from sqlalchemy import text
from app.db.session import SessionLocal

def arreglar_intervenciones():
    db = SessionLocal()
    print("🔧 Intentando agregar la columna 'escalado' a la tabla 'intervenciones'...")
    try:
        # Agregamos la columna que falta
        db.execute(text("ALTER TABLE intervenciones ADD COLUMN escalado BOOLEAN DEFAULT FALSE;"))
        db.commit()
        print("✅ Columna 'escalado' agregada con éxito.")
        
        # Como el script de seed falló a la mitad, borramos los datos creados a medias 
        # para que al volver a correrlo no te marque error de "llave duplicada" (unique constraint).
        print("🧹 Limpiando datos del intento anterior...")
        db.execute(text("DELETE FROM estudiantes WHERE matricula LIKE 'MAT-2024%';"))
        db.execute(text("DELETE FROM materias WHERE clave_materia LIKE 'MAT-10%';"))
        db.execute(text("DELETE FROM grupos WHERE nombre_grupo LIKE 'Grupo %';"))
        db.commit()
        print("✅ Base de datos limpia y lista para el sembrado final.")
        
    except Exception as e:
        db.rollback()
        print(f"⚠️ Ocurrió algo: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    arreglar_intervenciones()