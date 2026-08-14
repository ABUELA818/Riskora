import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Key, ChevronRight, Shield, FileText, Lock, Clock} from 'lucide-react';
import { API_BASE_URL } from '../../config/api'; 

export default function DashboardRRHH() {
  const { token } = useAuth();
  const [metricas, setMetricas] = useState(null);
  const [personalReciente, setPersonalReciente] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/personal/metricas`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/v1/personal`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ])
    .then(([metData, persData]) => {
      setMetricas(metData);
      setPersonalReciente(persData.slice(-4).reverse());
      setLoading(false);
    })
    .catch(err => console.error(err));
  }, [token]);

  if (loading || !metricas) return <div className="p-8 text-gray-500">Cargando dashboard de RRHH...</div>;

  const totalActivo = metricas.total_docentes + metricas.total_tutores + metricas.total_psicopedagogia + metricas.total_directores + metricas.total_rrhh;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Personal</h2>
          <p className="text-sm text-gray-500">Vista administrativa de recursos humanos y accesos institucionales.</p>
        </div>
        <Link to="/rrhh/directorio" className="bg-eduPurple text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-opacity-90 flex items-center">
          <UserPlus className="w-4 h-4 mr-2" /> Nuevo Registro
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 opacity-50" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-400" /> Personal Activo
          </p>
          <div className="flex items-baseline mb-1">
            <h3 className="text-5xl font-black text-gray-900 mr-3">{totalActivo}</h3>
            <span className="text-sm text-green-600 font-bold">↗ +2.4%</span>
          </div>
          <p className="text-xs text-gray-500 relative z-10">Profesores y administrativos habilitados</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <UserPlus className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 opacity-50" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            <UserPlus className="w-4 h-4 mr-2 text-gray-400" /> Altas del Mes
          </p>
          <h3 className="text-5xl font-black text-gray-900 mb-2">{metricas.altas_mes}</h3>
          <p className="text-xs text-gray-500 relative z-10">
            Nuevos contratos procesados en {new Date().toLocaleDateString('es-ES', { month: 'long' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Personal Reciente</h3>
            <Link to="/rrhh/directorio" className="text-sm font-semibold text-eduPurple hover:underline flex items-center">
              Ver directorio completo <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 pl-6">Nombre & Departamento</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personalReciente.map((persona) => (
                <tr key={persona.id_usuario} className="hover:bg-gray-50">
                  <td className="p-4 pl-6 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex justify-center items-center font-bold text-sm mr-3 shrink-0">
                      {persona.nombre_completo.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{persona.nombre_completo}</p>
                      <p className="text-xs text-gray-500">{persona.correo}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-700 font-medium">{persona.rol}</td>
                  <td className="p-4">
                    {persona.estado ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Activo</span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Inactivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 p-4 pb-2 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-eduPurple" /> Gestión de Roles
            </h3>
            <div className="p-2 space-y-1">
              <Link to="/rrhh/accesos" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-lg mr-3 group-hover:bg-white border border-transparent group-hover:border-gray-200"><Lock className="w-4 h-4 text-gray-600" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Asignar Permisos</p>
                    <p className="text-xs text-gray-500">Modificar matrices de acceso</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Link to="/rrhh/auditoria" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-lg mr-3 group-hover:bg-white border border-transparent group-hover:border-gray-200"><FileText className="w-4 h-4 text-gray-600" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Auditoría de Accesos</p>
                    <p className="text-xs text-gray-500">Revisión de logs de sistema</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Link to="/rrhh/solicitudes" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-lg mr-3"><Clock className="w-4 h-4 text-gray-600" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Solicitudes Pendientes</p>
                    <p className="text-xs text-gray-500">Revisar altas de Docente/Tutor</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}