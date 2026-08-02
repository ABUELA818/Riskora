import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import Usuario
from app.schemas.auth import LoginSchema, Token, ForgotPasswordSchema, ResetPasswordSchema
from app.core.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
from app.core.deps import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.correo_institucional == data.correo_institucional).first()
    
    # Validamos existencia y la contraseña al mismo tiempo, lanzando siempre el mismo error (RF-01)
    if not user or not verify_password(data.password, user.password_hash) or not user.estado:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas" 
        )

    # Si todo bien, armamos el JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    user_role = user.rol.value if hasattr(user.rol, 'value') else user.rol
    
    access_token = create_access_token(
        data={
            "user_id": user.id_usuario, 
            "rol": user_role,
            "token_version": user.token_version or 1 # <-- NUEVO: Agregamos la versión al payload
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.correo_institucional == data.correo_institucional).first()
    
    # Siempre respondemos igual exista o no el usuario por seguridad
    response_msg = "Si el correo existe en nuestro sistema, enviaremos un enlace de recuperación."
    
    if user:
        # Generamos un token UUID sencillo para la recuperación
        reset_token = str(uuid.uuid4())
        user.token_recuperacion = reset_token
        db.commit()
        
        # Simulamos el envío del correo imprimiéndolo en la terminal
        print(f"\n[SIMULACIÓN DE CORREO] -> Recuperación de cuenta para {user.correo_institucional}")
        print(f"Link: http://localhost:3000/reset-password?token={reset_token}\n")
        
        # Te retorno el dev_token en la respuesta para que puedas probar en Postman sin revisar la consola, quítalo cuando pasen a prod
        return {"message": response_msg, "dev_token": reset_token}
    
    return {"message": response_msg}

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.token_recuperacion == data.token).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    # Actualizamos la contraseña y quemamos el token para que no se re-use
    user.password_hash = get_password_hash(data.nueva_password)
    user.token_recuperacion = None 
    
    # OPCIONAL: Si quieres cerrar todas las sesiones del usuario cuando recupera su contraseña por seguridad, descomenta esta línea:
    # user.token_version = (user.token_version or 1) + 1
    
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}