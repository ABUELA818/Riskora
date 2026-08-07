import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, ExternalLink, X } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function CasosEscalados() {
  const { token } = useAuth();
  
  const [casos, setCasos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('escalados');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [formData, setFormData] = useState({
    id_estudiante: '',
    nivel_resolucion: 'Llamada Telefónica',
    motivo: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const cargarCasos = () => {
    fetch(`http://localhost:8000/api/v1/casos-escalados`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCasos(data);
        if (data.length > 0) setSeleccionado(data[0]);
      });
  };

  useEffect(() => {
    if (!token) return;
    
    cargarCasos();
    
    fetch('http://localhost:8000/api/v1/estudiantes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) setEstudiantes(data); 
      });
  }, [token]);

  const handleCrearCaso = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/casos-escalados/manual', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          id_estudiante: parseInt(formData.id_estudiante),
          nivel_resolucion: formData.nivel_resolucion,
          motivo: formData.motivo
        })
      });
      
      if (!response.ok) throw new Error('Error al crear el caso');
      
      setModalOpen(false);
      setFormData({ id_estudiante: '', nivel_resolucion: 'Llamada Telefónica', motivo: '' });
      cargarCasos();
    } catch (error) {
      alert('No se pudo crear el caso manual.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-full flex flex-col h-screen">
      <SimulationBadge />

      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Bandeja de Entrada: Psicopedagogía</h2>
          <p className="text-sm text-gray-500">Casos escalados para seguimiento especializado y resolución.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex space-x-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setVistaActiva('escalados')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                vistaActiva === 'escalados' ? 'bg-white shadow-sm text-eduPurple' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Casos Escalados
            </button>
            <button
              onClick={() => setVistaActiva('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                vistaActiva === 'todos' ? 'bg-white shadow-sm text-eduPurple' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Todos los Alumnos
            </button>
          </div>

          <button 
            onClick={() => setModalOpen(true)}
            className="bg-eduPurple text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-opacity-90 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Registrar Intervención
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Panel Izquierdo: Lista de Casos Activos o Todos los Alumnos */}
        <div className="w-2/3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center">
              {vistaActiva === 'escalados' ? 'Casos Activos' : 'Directorio de Alumnos'}
            </h3>
            {vistaActiva === 'escalados' ? (
              <select className="text-sm border border-gray-300 rounded-md p-1 outline-none focus:border-eduPurple">
                <option>Todos los Riesgos</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="Buscar por nombre o matrícula..."
                value={busquedaAlumno}
                onChange={e => setBusquedaAlumno(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 w-56 outline-none focus:border-eduPurple"
              />
            )}
          </div>
          <div className="overflow-auto flex-1">
            {vistaActiva === 'escalados' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                    <th className="p-4">Estudiante</th>
                    <th className="p-4">Escalado Por</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {casos.length === 0 ? (
                    <tr><td colSpan="3" className="p-6 text-center text-gray-500">No hay casos escalados.</td></tr>
                  ) : (
                    casos.map(caso => (
                      <tr 
                        key={caso.id_estudiante} 
                        onClick={() => setSeleccionado(caso)}
                        className={`cursor-pointer transition-colors ${seleccionado?.id_estudiante === caso.id_estudiante ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{caso.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{caso.matricula}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{caso.tutor_nombre}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded text-center">Urgente</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                    <th className="p-4">Estudiante</th>
                    <th className="p-4">Matrícula</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {estudiantes
                    .filter(e =>
                      e.nombre_completo.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
                      e.matricula.toLowerCase().includes(busquedaAlumno.toLowerCase())
                    )
                    .map(est => (
                      <tr key={est.id_estudiante} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{est.nombre_completo}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{est.matricula}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setFormData({ ...formData, id_estudiante: String(est.id_estudiante) });
                              setModalOpen(true);
                            }}
                            className="inline-flex items-center text-xs font-semibold bg-indigo-50 text-eduPurple px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Intervención
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel Derecho: Detalle del Caso Seleccionado */}
        {seleccionado && (
          <div className="w-1/3 flex flex-col gap-6 overflow-y-auto">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{seleccionado.nombre_completo}</h3>
                  <p className="text-xs text-gray-500">ID: {seleccionado.matricula}</p>
                </div>
                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-bold flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Riesgo Alto
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Motivo de Escalada ({seleccionado.tutor_nombre})
                </p>
                <p className="text-sm text-gray-700 italic">"{seleccionado.ultimo_acuerdo}"</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">Notas de Seguimiento (Internas)</label>
                  <textarea className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm h-24 focus:ring-eduPurple focus:border-eduPurple outline-none transition-all" placeholder="Documentar análisis inicial..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Actualizar Estado</label>
                    <select className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-eduPurple">
                      <option>En Revisión</option>
                    </select>
                  </div>
                </div>
                <button className="w-full bg-eduPurple text-white py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-opacity-90 transition-all">
                  Guardar Registro
                </button>
                <Link to={`/estudiantes/${seleccionado.id_estudiante}/intervenciones`} className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center hover:bg-gray-50 transition-all">
                  Ir a Bitácora Completa <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Registrar Intervención */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Registrar Intervención</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCrearCaso} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Estudiante</label>
                <select
                  required
                  value={formData.id_estudiante}
                  onChange={e => setFormData({...formData, id_estudiante: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:border-eduPurple"
                >
                  <option value="">Selecciona un estudiante...</option>
                  {estudiantes.map(e => (
                    <option key={e.id_estudiante} value={e.id_estudiante}>
                      {e.nombre_completo} — {e.matricula}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tipo de Intervención</label>
                <select
                  value={formData.nivel_resolucion}
                  onChange={e => setFormData({...formData, nivel_resolucion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:border-eduPurple"
                >
                  <option value="Llamada Telefónica">Llamada Telefónica</option>
                  <option value="Cita Presencial">Cita Presencial</option>
                  <option value="Canalización a Psicopedagogía">Canalización a Psicología</option>
                  <option value="Seguimiento Académico">Seguimiento Académico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Motivo de la Escalada</label>
                <textarea
                  required
                  value={formData.motivo}
                  onChange={e => setFormData({...formData, motivo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm h-28 resize-none outline-none focus:border-eduPurple"
                  placeholder="Describe la situación..."
                />
              </div>
              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="flex-1 py-2.5 bg-eduPurple text-white font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-70 transition-all"
                >
                  {isSaving ? 'Guardando...' : 'Registrar Intervención'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}