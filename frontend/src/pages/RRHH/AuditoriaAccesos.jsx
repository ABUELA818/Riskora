import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Clock } from 'lucide-react';

export default function AuditoriaAccesos() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/logs-auditoria', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setLogs(data); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Auditoría de Accesos</h2>
        <p className="text-sm text-gray-500">Registro de acciones sensibles realizadas dentro del sistema.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 pl-6">Usuario</th>
              <th className="p-4">Acción</th>
              <th className="p-4">Endpoint</th>
              <th className="p-4 text-right pr-6">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-400">Cargando registros...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">No hay registros de auditoría todavía.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id_log} className="hover:bg-gray-50">
                  <td className="p-4 pl-6 flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-semibold text-gray-900 text-sm">{log.nombre_usuario}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-700">{log.accion}</td>
                  <td className="p-4 text-xs font-mono text-gray-500">{log.endpoint}</td>
                  <td className="p-4 text-right pr-6 text-xs text-gray-400 flex items-center justify-end">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}