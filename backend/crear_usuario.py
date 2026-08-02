from app.db.session import SessionLocal
from app.models.models import Usuario, RolEnum
from app.core.security import get_password_hash

db = SessionLocal()

# Checamos si ya existe para no duplicarlo
usuario_existente = db.query(Usuario).filter(Usuario.correo_institucional == "manuel@universidad.edu.mx").first()

if not usuario_existente:
    nuevo_usuario = Usuario(
        correo_institucional="manuel@universidad.edu.mx",
        password_hash=get_password_hash("mipassword123"),
        rol=RolEnum.DOCENTE,
        nombre_completo="Manuel Reyes",
        estado=True
    )
    db.add(nuevo_usuario)
    db.commit()
    print("¡Usuario de prueba creado con éxito!")
else:
    print("El usuario ya existe en la BD.")

db.close()