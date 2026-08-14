import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import AuthLayout from '../../layout/AuthLayout';
import { API_BASE_URL } from '../../config/api'; 

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const isStrong = password.length >= 8;
  const doMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStrong || !doMatch) return;

    setStatus({ type: 'loading', message: '' });
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nueva_password: password })
      });

      if (!res.ok) throw new Error('Token inválido o expirado');
      
      setStatus({ type: 'success', message: '¡Contraseña actualizada con éxito!' });
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center text-risk-high-fg">Enlace inválido. Falta el token de seguridad.</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold text-ink-900 mb-2">Crear nueva contraseña</h2>
        <p className="text-slate-500 text-sm">Asegúrate de que tu nueva contraseña tenga al menos 8 caracteres.</p>
      </div>

      {status.type === 'success' ? (
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-risk-low mb-4" />
          <h3 className="font-display text-lg font-semibold text-ink-900">{status.message}</h3>
          <p className="text-sm text-slate-500 mt-2">Redirigiendo al inicio de sesión...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {status.type === 'error' && <p className="text-sm text-risk-high-fg">{status.message}</p>}
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute inset-y-0 left-0 pl-3 h-full w-8 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                required
              />
            </div>
            {!isStrong && password.length > 0 && (
               <p className="text-xs text-risk-high-fg mt-1">Mínimo 8 caracteres</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute inset-y-0 left-0 pl-3 h-full w-8 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                required
              />
            </div>
            {!doMatch && confirmPassword.length > 0 && (
               <p className="text-xs text-risk-high-fg mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isStrong || !doMatch || status.type === 'loading'}
            className="w-full py-2.5 rounded-lg font-semibold text-ink-950 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:text-slate-500"
          >
            Actualizar Contraseña
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
