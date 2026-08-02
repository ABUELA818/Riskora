from pydantic import BaseModel, EmailStr

class LoginSchema(BaseModel):
    correo_institucional: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPasswordSchema(BaseModel):
    correo_institucional: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    nueva_password: str