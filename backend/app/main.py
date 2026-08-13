from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, academicos, asistencias, evaluaciones, riesgo, tutorias, institucional, psicopedagogia, rrhh, reportes, personal, solicitudes, horarios
import app.models.models 

app = FastAPI(title="EduPredict AI API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)

app.include_router(auth.router)
app.include_router(academicos.router)
app.include_router(asistencias.router)
app.include_router(evaluaciones.router)
app.include_router(riesgo.router)
app.include_router(tutorias.router)
app.include_router(institucional.router)
app.include_router(psicopedagogia.router)
app.include_router(rrhh.router)
app.include_router(reportes.router)
app.include_router(personal.router)
app.include_router(solicitudes.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend corriendo al cien"}