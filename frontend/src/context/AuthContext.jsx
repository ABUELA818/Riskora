import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true); 
  const navigate = useNavigate();

   useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('no session');
        return res.json();
      })
      .then(data => {
        const payloadBase64 = data.access_token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        setToken(data.access_token);
        setRole(decodedPayload.rol);
      })
      .catch(() => {})
      .finally(() => setIsLoadingSession(false));
  }, []);

  const login = async (correo_institucional, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ correo_institucional, password })
      });

      if (!response.ok) throw new Error('Credenciales incorrectas');

      const data = await response.json();
      const payloadBase64 = data.access_token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));

      setToken(data.access_token);
      setRole(decodedPayload.rol);
      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Credenciales incorrectas. Verifica tu correo y contraseña.' };
    }
  };

  const logout = () => {
    fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
    setToken(null);
    setRole(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, role, isAuthenticated: !!token, isLoadingSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);