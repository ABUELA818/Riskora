import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import AuthLayout from '../../layout/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Enviando...' });

    try {
      await fetch('http://localhost:8000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo_institucional: email })
      });
      setStatus({ type: 'success', message: 'Si el correo existe en nuestro sistema, te enviaremos un enlace de recuperación.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Hubo un error al conectar con el servidor.' });
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h2>
        <p className="text-gray-500 text-sm">Ingresa tu correo electrónico institucional para recibir las instrucciones de recuperación.</p>
      </div>

      {status.type === 'success' ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
          <p className="text-sm">{status.message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {status.type === 'error' && <p className="text-sm text-red-600">{status.message}</p>}
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Correo Institucional
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eduPurple"
                placeholder="usuario@institucion.edu"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!email.includes('@') || status.type === 'loading'}
            className="w-full flex justify-center items-center py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-eduPurple hover:bg-opacity-90 disabled:bg-gray-400"
          >
            {status.type === 'loading' ? 'Procesando...' : 'Enviar Enlace de Recuperación'}
            {!status.type && <Send className="ml-2 h-4 w-4" />}
          </button>
        </form>
      )}

      <div className="mt-8">
        <Link to="/login" className="flex items-center text-sm font-medium text-gray-600 hover:text-eduPurple">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthLayout>
  );
}