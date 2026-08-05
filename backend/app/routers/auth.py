import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import Usuario
from app.schemas.auth import LoginSchema, Token, ForgotPasswordSchema, ResetPasswordSchema
from app.core.security import verify_password, create_access_token, create_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash, SECRET_KEY, ALGORITHM
from app.core.deps import get_db
from jose import jwt, JWTError

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
def login(data: LoginSchema, response: Response, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.correo_institucional == data.correo_institucional).first()
    
    if not user or not verify_password(data.password, user.password_hash) or not user.estado:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    user_role = user.rol.value if hasattr(user.rol, 'value') else user.rol
    payload = {"user_id": user.id_usuario, "rol": user_role, "token_version": user.token_version or 1}

    access_token = create_access_token(data=payload, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_refresh_token(data=payload)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/api/v1/auth"
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
def refresh(request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No hay sesión activa")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Sesión expirada, inicia sesión de nuevo")

    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not user or not user.estado:
        raise HTTPException(status_code=401, detail="Usuario no válido")

    # Revalidamos token_version por si cambiaron permisos mientras no había sesión activa
    if user.token_version != (payload.get("token_version") or 1):
        raise HTTPException(status_code=401, detail="Tus permisos cambiaron, inicia sesión de nuevo")

    user_role = user.rol.value if hasattr(user.rol, 'value') else user.rol
    new_access_token = create_access_token(
        data={"user_id": user.id_usuario, "rol": user_role, "token_version": user.token_version or 1},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Sesión cerrada"}

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.token_recuperacion == data.token).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    user.password_hash = get_password_hash(data.nueva_password)
    user.token_recuperacion = None 
    
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}