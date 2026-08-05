import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Edit2, UserMinus, X } from 'lucide-react';

export default function DirectorioPersonal() {
  const { token } = useAuth();
  const [personal, setPersonal] = useState([]);
  const [carreras, setCarreras] = useState([]); 
  const [filtroRol, setFiltroRol] = useState('Todos los Roles');
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    rol: 'Docente',
    id_carrera: ''
  });

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/personal', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setPersonal(data))
      .catch(err => console.error(err));

    fetch('http://localhost:8000/api/v1/carreras', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); })
      .catch(err => console.error(err));
  }, [token]);

  const handleAltaPersonal = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/personal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          id_carrera: formData.id_carrera ? parseInt(formData.id_carrera) : null
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear usuario');
      }
      
      const nuevoUsuario = await response.json();
      setPersonal(prev => [nuevoUsuario, ...prev]);
      setIsModalOpen(false);
      setFormData({ nombre_completo: '', correo: '', rol: 'Docente', id_carrera: '' });
      alert('Personal dado de alta correctamente. Revisa la consola del backend para ver la contraseña temporal generada.');
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtrados = personal.filter(p => {
    const matchRol = filtroRol === 'Todos los Roles' || p.rol === filtroRol;
    const matchSearch = p.nombre_completo.toLowerCase().includes(search.toLowerCase()) || p.correo.toLowerCase().includes(search.toLowerCase());
    return matchRol && matchSearch;
  });

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Directorio de Personal</h2>
          <p className="text-sm text-gray-500">Gestión administrativa y cuerpo docente.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-eduPurple text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-opacity-90 flex items-center"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Dar de Alta Personal
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between bg-gray-50/50">
          <div className="flex space-x-3">
            <select 
              value={filtroRol} 
              onChange={(e) => setFiltroRol(e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 outline-none focus:border-eduPurple focus:ring-1 focus:ring-eduPurple"
            >
              <option>Todos los Roles</option>
              <option>Docente</option>
              <option>Tutor</option>
              <option>Director</option>
              <option>Psicopedagogia</option>
              <option>RRHH</option>
            </select>
            <select className="border border-gray-300 rounded-lg text-sm px-3 py-2 outline-none">
              <option>Estado de Cuenta</option>
              <option>Activa</option>
              <option>Inactiva</option>
            </select>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 outline-none focus:border-eduPurple focus:ring-1 focus:ring-eduPurple"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 pl-6">Nombre</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Correo Institucional</th>
              <th className="p-4">Estado de Cuenta</th>
              <th className="p-4 text-right pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No se encontraron resultados.</td></tr>
            ) : (
              filtrados.map(persona => (
                <tr key={persona.id_usuario} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 pl-6 flex items-center">
                    <div className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-xs mr-3 text-white ${persona.rol === 'Director' ? 'bg-purple-600' : (persona.rol === 'Docente' ? 'bg-blue-500' : 'bg-green-600')}`}>
                      {persona.nombre_completo.substring(0,2).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900">{persona.nombre_completo}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{persona.rol}</td>
                  <td className="p-4 text-sm text-gray-500">{persona.correo}</td>
                  <td className="p-4">
                    {persona.estado ? (
                      <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded">Activa</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded">Inactiva</span>
                    )}
                  </td>
                  <td className="p-4 text-right pr-6 space-x-2">
                    <button className="p-1.5 text-gray-400 hover:text-eduPurple rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><UserMinus className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          Mostrando {filtrados.length} resultados
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Alta de Personal</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAltaPersonal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                <input 
                  required type="text"
                  value={formData.nombre_completo}
                  onChange={e => setFormData({...formData, nombre_completo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="Ej. Ana García"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Correo Institucional</label>
                <input 
                  required type="email"
                  value={formData.correo}
                  onChange={e => setFormData({...formData, correo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="ana.garcia@institucion.edu"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Rol Asignado</label>
                <select 
                  value={formData.rol}
                  onChange={e => setFormData({...formData, rol: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                >
                  <option value="Docente">Docente</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Director">Director de Carrera</option>
                  <option value="Psicopedagogia">Psicopedagogía</option>
                  <option value="RRHH">Recursos Humanos</option>
                </select>
              </div>

              {['Docente', 'Tutor', 'Director'].includes(formData.rol) && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Carrera</label>
                  <select 
                    required
                    value={formData.id_carrera}
                    onChange={e => setFormData({...formData, id_carrera: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                  >
                    <option value="">Selecciona una carrera...</option>
                    {carreras.map(c => (
                      <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                <p className="text-xs text-blue-800 font-medium">Se generará una contraseña temporal segura que deberá ser entregada al empleado.</p>
              </div>

              <div className="pt-2 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-eduPurple text-white font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-70">
                  {isSaving ? 'Guardando...' : 'Guardar y Generar Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}