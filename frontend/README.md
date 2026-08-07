# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Configuración de variables de entorno (Backend)

Antes de levantar el backend, copia `backend/.env.example` a `backend/.env` y define **obligatoriamente**:

- `JWT_SECRET`: clave secreta para firmar los tokens JWT. La aplicación **no arrancará** si esta variable no está definida. Genera un valor seguro con:
```bash
  openssl rand -hex 32
```
- `DATABASE_URL`: cadena de conexión a PostgreSQL.

Variables opcionales (tienen valor por defecto): `JWT_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_DAYS`.

## Configuración de variables de entorno (Frontend)

Copia `frontend/.env.example` a `frontend/.env` (o `.env.local`) y define:

- `VITE_API_URL`: URL base del backend (ej. `http://localhost:8000` en desarrollo,
  `https://api.tu-dominio.com` en producción). Si no se define, se usa
  `http://localhost:8000` por defecto (ver `src/config/api.js`).