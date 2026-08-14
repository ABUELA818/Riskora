import os
import smtplib
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

def _enviar_correo(correo_destino: str, asunto: str, cuerpo: str, fallback_texto: str) -> bool:
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        print(f"  SMTP no configurado. {fallback_texto}")
        return False

    mensaje = MIMEMultipart()
    mensaje["From"] = SMTP_FROM
    mensaje["To"] = correo_destino
    mensaje["Subject"] = asunto
    mensaje.attach(MIMEText(cuerpo, "plain"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, correo_destino, mensaje.as_string())
        return True
    except Exception as e:
        print(f" Error enviando correo a {correo_destino}: {e}")
        print(f"  {fallback_texto}")
        return False



def enviar_credenciales_temporales(correo_destino: str, nombre_completo: str, password_temporal: str, rol: str):
    """
    Envía la contraseña temporal generada al correo institucional del nuevo usuario.
    Si no hay configuración SMTP (entorno de desarrollo), hace fallback a print()
    para no romper el flujo, pero deja constancia clara del problema.
    """

    asunto = "Riskora - Acceso a tu cuenta institucional"
    cuerpo = f"""Hola {nombre_completo},

Se ha creado tu cuenta institucional en Riskora con el rol de {rol}.

Correo: {correo_destino}
Contraseña temporal: {password_temporal}

Por seguridad, te recomendamos iniciar sesión y cambiar tu contraseña lo antes posible.

Saludos,
Equipo Riskora
"""

    return _enviar_correo(
        correo_destino, asunto, cuerpo,
        fallback_texto=f"Contraseña temporal para {correo_destino}: {password_temporal}"
    )


def enviar_link_recuperacion(correo_destino: str, nombre_completo: str, link: str):
    asunto = "Riskora - Recuperación de contraseña"
    cuerpo = f"""Hola {nombre_completo},

Recibimos una solicitud para restablecer tu contraseña en Riskora.

Si fuiste tú, da clic en el siguiente enlace para crear una nueva contraseña:
{link}

Este enlace es de un solo uso. Si no solicitaste este cambio, puedes ignorar este correo; tu contraseña actual seguirá siendo válida.

Saludos,
Equipo Riskora
"""
    return _enviar_correo(
        correo_destino, asunto, cuerpo,
        fallback_texto=f"Link de recuperación para {correo_destino}: {link}"
    )