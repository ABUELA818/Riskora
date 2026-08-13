# Riskora - Sistema de Gestión de Riesgo Académico

Sistema de gestión de riesgo académico que utiliza XGBoost para predecir el rendimiento de estudiantes basado en calificaciones, asistencia y factores socioeconómicos.

## 📋 Requisitos Previos

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone -b feature/xgboost-integracion-prueba https://github.com/ABUELA818/Riskora.git
cd Riskora
```

### 2. Configurar Base de Datos PostgreSQL

Crear una base de datos PostgreSQL:

```sql
CREATE DATABASE riskora_db;
CREATE USER riskora_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE riskora_db TO riskora_user;
```

### 3. Configurar Variables de Entorno

Copiar el archivo de ejemplo y configurar las credenciales:

```bash
cd backend
cp .env.example .env
```

Editar `.env` con tus credenciales reales:

```env
DATABASE_URL=postgresql://riskora_user:tu_password@localhost:5432/riskora_db
SECRET_KEY=tu_secret_key_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_SECRET_KEY=tu_jwt_secret_aqui
APP_NAME=Riskora
APP_ENV=development
DEBUG=True
```

### 4. Instalar Dependencias del Backend

```bash
cd backend
pip install -r requirements.txt
```

### 5. Ejecutar Migraciones

```bash
cd backend
alembic upgrade head
```

### 6. Ejecutar el Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en: http://localhost:8000

### 7. Instalar Dependencias del Frontend

```bash
cd frontend
npm install
```

### 8. Ejecutar el Frontend

```bash
cd frontend
npm run dev
```

El frontend estará disponible en: http://localhost:5173

## 👤 Usuarios de Prueba

El sistema incluye los siguientes usuarios de prueba (contraseña: `password123`):

### Administrador
- Correo: `admin@edupredict.edu`
- Contraseña: `password123`

### Docente
- Correo: `docente1@edupredict.edu`
- Contraseña: `password123`

### Tutores
- Correo: `tutor1@edupredict.edu` (Tutor de Prueba - 78 estudiantes)
- Correo: `tutor2@edupredict.edu` (Tutor Carlos Martinez - 121 estudiantes)
- Correo: `tutor3@edupredict.edu` (Tutor Laura Sanchez - 69 estudiantes)
- Correo: `tutor4@edupredict.edu` (Tutor Ana García - 82 estudiantes)
- Contraseña: `password123`

### Director
- Correo: `director1@edupredict.edu`
- Contraseña: `password123`

### RRHH
- Correo: `rrhh1@edupredict.edu`
- Contraseña: `password123`

### Psicopedagogia
- Correo: `psico1@edupredict.edu`
- Contraseña: `password123`

## 📊 Población de Datos

El sistema incluye 350 estudiantes con distribución de riesgo:
- **Bajo**: 297 estudiantes (84.9%)
- **Medio**: 24 estudiantes (6.9%)
- **Alto**: 29 estudiantes (8.3%)

### Carreras
- Ingeniería en Sistemas (286 estudiantes)
- Ingeniería Industrial (64 estudiantes)
- Licenciatura en Administración (0 estudiantes)
- Arquitectura (0 estudiantes)

## 🔧 Funcionalidades Principales

### Sistema de Riesgo Académico
- Predicción de riesgo académico usando XGBoost
- 17 features de predicción
- Recálculo automático de riesgos
- Visualización de factores de riesgo

### Gestión de Estudiantes
- Directorio de estudiantes
- Expedientes completos
- Historial académico
- Historial de asistencia

### Reportes Institucionales
- Reportes de riesgo por carrera
- Exportación a PDF/Excel
- Tendencias de riesgo

### Roles y Permisos
- **Administrador**: Acceso total
- **Docente**: Calificaciones y asistencia
- **Tutor**: Seguimiento de estudiantes asignados
- **Director**: Visión global de la carrera
- **RRHH**: Gestión de personal
- **Psicopedagogia**: Casos escalados

## 📡 Endpoints Principales

### Riesgo
- `GET /api/v1/estudiantes/{id}/riesgo` - Riesgo individual
- `GET /api/v1/riesgo/resumen` - Resumen de riesgos
- `GET /api/v1/riesgo/alumnos-atencion` - Alumnos que requieren atención

### Académicos
- `GET /api/v1/estudiantes` - Listado de estudiantes
- `GET /api/v1/estudiantes/{id}/calificaciones-historial` - Historial de calificaciones
- `GET /api/v1/estudiantes/{id}/asistencia` - Historial de asistencia

### Psicopedagogia
- `GET /api/v1/psicopedagogia/estudiantes/{id}/expediente-completo` - Expediente completo

### Reportes
- `GET /api/v1/reportes/riesgo-por-carrera` - Riesgo por carrera
- `GET /api/v1/reportes/academico` - Reporte académico
- `GET /api/v1/reportes/academico/export` - Exportar reporte

## 🔐 Seguridad

⚠️ **IMPORTANTE**: Las contraseñas de los usuarios de prueba son temporales. En producción, se deben cambiar todas las contraseñas.

## 📝 Documentación Técnica

- `backend/HISTORIAL_CAMBIOS_IA.md` - Historial de cambios de integración XGBoost
- `backend/modelo.pkl` - Modelo XGBoost entrenado (F1-Score: 0.9662)

## 🐛 Troubleshooting

### Error de conexión a PostgreSQL
Verificar que PostgreSQL esté corriendo y que las credenciales en `.env` sean correctas.

### Error al cargar el modelo
Verificar que `backend/modelo.pkl` exista en la ubicación correcta.

### Error de autenticación
Verificar que el usuario exista en la base de datos y que la contraseña sea correcta.

## 📞 Soporte

Para problemas técnicos o preguntas, contactar al equipo de desarrollo.
