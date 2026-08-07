import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Edit, Trash2, Eye, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GestionEstudiantes() {
  const { state } = useLocation();
  const { token } = useAuth();
  const [estudiantes, setEstudiantes] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [filtros, setFiltros] = useState({ carrera: '', grupo: '', nivel_riesgo: '' });
  const [resumenRiesgo, setResumenRiesgo] = useState({ bajo: 0, medio: 0, alto: 0, total_estudiantes: 0 });
  const [riesgosMap, setRiesgosMap] = useState({});

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/carreras', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); });
  }, [token]);

  const fetchEstudiantes = () => {
    if (!token) return;
    const query = new URLSearchParams(
      Object.entries(filtros).filter(([_, v]) => v !== '')
    ).toString();

    fetch(`http://localhost:8000/api/v1/estudiantes?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setEstudiantes(data); });
  };

  useEffect(() => {
    fetchEstudiantes();
  }, [filtros, token]); 

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filtros.carrera) params.append('carrera', filtros.carrera);

    fetch(`http://localhost:8000/api/v1/riesgo/resumen?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setResumenRiesgo(data))
      .catch(err => console.error(err));
  }, [filtros.carrera, token]);

  useEffect(() => {
    if (!token || estudiantes.length === 0) return;
    Promise.all(estudiantes.map(async est => {
      try {
        const r = await fetch(`http://localhost:8000/api/v1/estudiantes/${est.id_estudiante}/riesgo`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await r.json();
        return [est.id_estudiante, data.nivel_riesgo];
      } catch (e) {
        return [est.id_estudiante, null];
      }
    })).then(entries => setRiesgosMap(Object.fromEntries(entries)));
  }, [estudiantes, token]);

  const handleSoftDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de dar de baja a este estudiante?')) return;
    
    await fetch(`http://localhost:8000/api/v1/estudiantes/${id}`, { method: 'DELETE' });
    setEstudiantes(estudiantes.filter(e => e.id_estudiante !== id));
  };

  const estilosRiesgo = {
    Alto: 'bg-red-100 text-red-800 border-red-200',
    Medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Bajo: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Directorio de Estudiantes</h2>
          {state?.message && <p className="text-sm text-green-600 mt-1">{state.message}</p>}
        </div>
        <Link to="/estudiantes/nuevo" className="bg-eduPurple text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-opacity-90">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Registro
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-red-200 border-l-4 border-l-red-600 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Riesgo Crítico</p>
          <h3 className="text-3xl font-black text-gray-900">{resumenRiesgo.alto}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-yellow-200 border-l-4 border-l-yellow-500 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Riesgo Moderado</p>
          <h3 className="text-3xl font-black text-gray-900">{resumenRiesgo.medio}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total de Estudiantes</p>
          <h3 className="text-3xl font-black text-gray-900">{resumenRiesgo.total_estudiantes}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <select 
          className="border border-gray-300 rounded-md p-2 text-sm"
          value={filtros.carrera}
          onChange={e => setFiltros({ ...filtros, carrera: e.target.value })}
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>)}
        </select>
        <input 
          type="text" placeholder="Filtrar por grupo..." 
          className="border border-gray-300 rounded-md p-2 text-sm"
          onChange={e => setFiltros({ ...filtros, grupo: e.target.value })}
        />
        <select
          className="border border-gray-300 rounded-md p-2 text-sm"
          value={filtros.nivel_riesgo}
          onChange={e => setFiltros({ ...filtros, nivel_riesgo: e.target.value })}
        >
          <option value="">Todos los niveles de riesgo</option>
          <option value="Alto">Riesgo Alto</option>
          <option value="Medio">Riesgo Medio</option>
          <option value="Bajo">Riesgo Bajo</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">Matrícula</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">ID Grupo</th>
              <th className="p-3">Nivel de Riesgo</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {estudiantes.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No se encontraron estudiantes.</td></tr>
            ) : (
              estudiantes.map(est => {
                const nivel = riesgosMap[est.id_estudiante];
                return (
                  <tr key={est.id_estudiante} className="hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-gray-900">{est.matricula}</td>
                    <td className="p-3 text-sm text-gray-600">{est.nombre_completo}</td>
                    <td className="p-3 text-sm text-gray-600">{est.id_grupo || 'Sin asignar'}</td>
                    <td className="p-3">
                      {!nivel ? (
                        <span className="text-xs text-gray-400">Calculando...</span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${estilosRiesgo[nivel]}`}>
                          {nivel}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm flex justify-center space-x-3">
                      <button className="text-gray-400 hover:text-eduPurple"><Eye className="w-4 h-4" /></button>
                      <button className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                      <Link
                        to="/estudiantes/baja"
                        title="Dar de baja"
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}