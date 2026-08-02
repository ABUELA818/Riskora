import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  const login = async (correo_institucional, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo_institucional, password })
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      const data = await response.json();
      
      // Decodificamos el payload del JWT de forma sencilla para sacar el rol
      const payloadBase64 = data.access_token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      
      // Guardamos en memoria (estado de React), NUNCA en localStorage
      setToken(data.access_token);
      setRole(decodedPayload.rol);

      // Redirigimos según el rol (RF-01)
      navigate('/dashboard'); 
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Credenciales incorrectas. Verifica tu correo y contraseña.' };
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, role, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);