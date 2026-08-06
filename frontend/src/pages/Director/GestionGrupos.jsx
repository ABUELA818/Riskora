import { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function GestionGrupos() {
  const { token } = useAuth();
  const [grupos, setGrupos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [nuevoDocenteId, setNuevoDocenteId] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/grupos', {
      headers: { 'Authorization': `Bearer ${token}` } 
    })
      .then(res => res.json())
      .then(data => setGrupos(data));
  }, [token]); 

  const handleAsignarDocente = async (e) => {
    e.preventDefault();
    await fetch(`http://localhost:8000/api/v1/grupos/${grupoSeleccionado.id_grupo}/asignar-docente?id_docente=${nuevoDocenteId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    setGrupos(grupos.map(g => 
      g.id_grupo === grupoSeleccionado.id_grupo ? { ...g, id_tutor: parseInt(nuevoDocenteId) } : g
    ));
    setModalOpen(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Grupos</h2>
        <p className="text-sm text-gray-500">Administra las cohortes y asigna tutores responsables.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">Grupo</th>
              <th className="p-3">Carrera</th>
              <th className="p-3">Cuatrimestre</th>
              <th className="p-3">Tutor / Docente (ID)</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grupos.map(grupo => (
              <tr key={grupo.id_grupo} className="hover:bg-gray-50">
                <td className="p-3 text-sm font-bold text-gray-900">{grupo.nombre_grupo}</td>
                <td className="p-3 text-sm text-gray-600">{grupo.carrera}</td>
                <td className="p-3 text-sm text-gray-600">{grupo.cuatrimestre}</td>
                <td className="p-3 text-sm text-gray-600">
                  {grupo.id_tutor ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Asignado: {grupo.id_tutor}</span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Sin Asignar</span>
                  )}
                </td>
                <td className="p-3 text-sm flex justify-center">
                  <button 
                    onClick={() => { setGrupoSeleccionado(grupo); setModalOpen(true); }}
                    className="flex items-center text-eduPurple hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md"
                  >
                    <UserPlus className="w-4 h-4 mr-1" /> Reasignar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Asignar Docente</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAsignarDocente}>
              <p className="text-sm text-gray-600 mb-4">Grupo seleccionado: <strong>{grupoSeleccionado?.nombre_grupo}</strong></p>
              <label className="block text-sm font-medium mb-1">ID del Docente / Tutor</label>
              <input 
                type="number" required 
                className="w-full border border-gray-300 rounded-md p-2 mb-4"
                value={nuevoDocenteId} onChange={e => setNuevoDocenteId(e.target.value)}
              />
              <button type="submit" className="w-full bg-eduPurple text-white py-2 rounded-md">Guardar Asignación</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}