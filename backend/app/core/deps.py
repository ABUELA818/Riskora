from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import Usuario
from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas", 
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        
        token_version_payload = payload.get("token_version")
        
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if user is None:
        raise credentials_exception

    if user.token_version != (token_version_payload or 1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Su sesión ha expirado o sus permisos fueron modificados. Por favor inicie sesión nuevamente."
        )
        
    return user

def get_current_active_user(current_user: Usuario = Depends(get_current_user)):
    if not current_user.estado: 
        raise HTTPException(status_code=401, detail="Usuario inactivo")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: Usuario = Depends(get_current_active_user)):
        user_role = user.rol.value if hasattr(user.rol, 'value') else user.rol
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permisos para acceder a este recurso"
            )
        return user