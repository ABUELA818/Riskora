from sqlalchemy.orm import Session
from app.models.models import LogAuditoria

def registrar_auditoria(db: Session, id_usuario: int, accion: str, endpoint: str):
    nuevo_log = LogAuditoria(
        id_usuario=id_usuario,
        accion=accion,
        endpoint=endpoint
    )
    db.add(nuevo_log)
    db.commit()