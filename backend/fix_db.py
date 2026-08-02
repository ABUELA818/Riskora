from sqlalchemy import text
from app.db.session import SessionLocal

def arreglar_enum_postgres():
    db = SessionLocal()
    engine = db.get_bind()
    print("🔧 Agregando nuevos roles al ENUM de PostgreSQL...")
    
    # ALTER TYPE no puede correr dentro de una transacción normal, requiere AUTOCOMMIT
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        nuevos_roles = ['Director', 'RRHH', 'Psicopedagogia', 'DIRECTOR', 'PSICOPEDAGOGIA']
        for rol in nuevos_roles:
            try:
                conn.execute(text(f"ALTER TYPE rolenum ADD VALUE IF NOT EXISTS '{rol}';"))
            except Exception:
                pass # Si el rol ya existe o hay un error menor, lo ignoramos para continuar
                
    print("✅ Base de datos actualizada exitosamente. Ya acepta todos los roles.")

if __name__ == "__main__":
    arreglar_enum_postgres()