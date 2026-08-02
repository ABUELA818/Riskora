import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Edit2, ShieldAlert, CheckCircle, Search, Filter, AlertTriangle } from 'lucide-react';

export default function GestionAccesos() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  
  // Estado para la confirmación de cambio de rol
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null, newRole: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // Estados visuales de la matriz de RBAC simulada a la izquierda
  const [selectedPreviewRole, setSelectedPreviewRole] = useState('Docente');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/personal', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsuarios(data))
      .catch(err => console.error(err));
  }, [token]);

  const handleUpdateRole = async () => {
    if (!confirmModal.user) return;
    setIsUpdating(true);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/usuarios/${confirmModal.user.id_usuario}/rol`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevo_rol: confirmModal.newRole })
      });

      if (!response.ok) throw new Error("Error al actualizar el rol");

      // Actualizamos UI localmente
      setUsuarios(prev => prev.map(u => 
        u.id_usuario === confirmModal.user.id_usuario ? { ...u, rol: confirmModal.newRole } : u
      ));
      
      setConfirmModal({ open: false, user: null, newRole: '' });
      alert("Rol actualizado y sesión previa invalidada correctamente.");
      
    } catch (error) {
      alert("Hubo un error al modificar los accesos.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openConfirmation = (user, currentRole) => {
    // Evitamos actualizar al mismo rol
    const roles = ['Docente', 'Tutor', 'Director', 'Psicopedagogia', 'RRHH', 'Administrador'];
    const nextRole = roles.find(r => r !== currentRole) || 'Docente';
    setConfirmModal({ open: true, user, newRole: nextRole });
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Gestión de Accesos</h2>
        <p className="text-sm text-gray-500">Administre los niveles de acceso y roles departamentales para el personal institucional.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: Matriz de Vista Previa (RBAC Visual) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-eduPurple" /> Matriz de Permisos (RBAC)
          </h3>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Previsualizar accesos por rol</label>
            <select 
              value={selectedPreviewRole}
              onChange={(e) => setSelectedPreviewRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-eduPurple"
            >
              <option value="Docente">Docente</option>
              <option value="Tutor">Tutor</option>
              <option value="Psicopedagogia">Psicopedagogía</option>
              <option value="Director">Director de Carrera</option>
              <option value="RRHH">Recursos Humanos</option>
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1 space-y-3">
            <p className="text-xs font-bold text-gray-400 mb-2">MÓDULOS HABILITADOS EN SIDEBAR:</p>
            
            <div className="flex items-center text-sm font-medium text-gray-700">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Directorio de Estudiantes
            </div>
            
            {['Docente', 'Tutor', 'Director'].includes(selectedPreviewRole) && (
              <div className="flex items-center text-sm font-medium text-gray-700">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Calificaciones / Asistencia
              </div>
            )}
            
            {['Tutor', 'Psicopedagogia', 'Director'].includes(selectedPreviewRole) && (
              <div className="flex items-center text-sm font-medium text-gray-700">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Panel de Riesgo IA (Mock)
              </div>
            )}

            {selectedPreviewRole === 'Psicopedagogia' && (
              <div className="flex items-center text-sm font-medium text-gray-700">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Detalle Factores IA / Expediente
              </div>
            )}
            
            {selectedPreviewRole === 'RRHH' && (
              <div className="flex items-center text-sm font-medium text-gray-700">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Gestión de Accesos (Admin)
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Tabla de Usuarios Activos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Usuarios Activos y Roles</h3>
            <div className="flex space-x-2">
              <button className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"><Filter className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <th className="p-4 pl-6">Usuario</th>
                  <th className="p-4">Rol Principal</th>
                  <th className="p-4">Correo</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map(u => (
                  <tr key={u.id_usuario} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-6 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex justify-center items-center font-bold text-xs mr-3">
                        {u.nombre_completo.substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{u.nombre_completo}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                        u.rol === 'Director' ? 'bg-green-50 text-green-700 border-green-200' :
                        u.rol === 'Psicopedagogia' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        u.rol === 'RRHH' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{u.correo}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => openConfirmation(u, u.rol)}
                        className="p-1.5 text-gray-400 hover:text-eduPurple hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL DE CONFIRMACIÓN CRÍTICA (RNF-06) */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cambio de Permisos</h3>
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de cambiar el rol de <strong className="text-gray-900">{confirmModal.user?.nombre_completo}</strong>.
            </p>

            <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Rol Actual</label>
                <p className="text-sm font-bold line-through text-gray-500">{confirmModal.user?.rol}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-eduPurple uppercase">Nuevo Rol a Asignar</label>
                <select 
                  value={confirmModal.newRole}
                  onChange={(e) => setConfirmModal({...confirmModal, newRole: e.target.value})}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm font-bold outline-none mt-1"
                >
                  <option value="Docente">Docente</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Psicopedagogia">Psicopedagogía</option>
                  <option value="Director">Director de Carrera</option>
                  <option value="RRHH">Recursos Humanos</option>
                </select>
              </div>
            </div>

            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-left mb-6 flex items-start">
              <ShieldAlert className="w-5 h-5 text-red-600 mr-2 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 font-medium">
                <strong>Acción Inmediata:</strong> Al guardar, la sesión actual del usuario será invalidada automáticamente. Deberá iniciar sesión nuevamente para acceder con sus nuevos privilegios (RNF-06).
              </p>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setConfirmModal({ open: false, user: null, newRole: '' })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateRole}
                disabled={isUpdating}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 disabled:opacity-70"
              >
                {isUpdating ? 'Aplicando...' : 'Aplicar Cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}