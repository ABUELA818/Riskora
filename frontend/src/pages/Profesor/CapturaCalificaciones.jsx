import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Download, Save, AlertCircle, X, 
  Hand, AlertTriangle, Brain, CheckCircle 
} from 'lucide-react';

export default function CapturaCalificaciones() {
  const { token } = useAuth();
  const location = useLocation();
  
  const [grupos, setGrupos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [materiasDisponibles, setMateriasDisponibles] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [parcialSeleccionado, setParcialSeleccionado] = useState('1');
  
  const [calificaciones, setCalificaciones] = useState({});
  
  const [modalObs, setModalObs] = useState({ isOpen: false, estudiante: null });
  const [obsForm, setObsForm] = useState({ tipo: '', nota: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/grupos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGrupos(data);
          const grupoInicial = location.state?.grupoPreseleccionado &&
            data.some(g => g.id_grupo === location.state.grupoPreseleccionado)
            ? location.state.grupoPreseleccionado
            : data[0]?.id_grupo;
          if (grupoInicial) setGrupoSeleccionado(grupoInicial.toString());
        }
      });
  }, [token]);

  useEffect(() => {
    if (!grupoSeleccionado || !token) return;
    
    fetch(`http://localhost:8000/api/v1/estudiantes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const filtrados = data.filter(e => e.id_grupo === parseInt(grupoSeleccionado));
          setEstudiantes(filtrados);
          
          setCalificaciones(prev => {
            const nuevoEstado = { ...prev };
            filtrados.forEach(est => {
              if (!nuevoEstado[est.id_estudiante]) {
                nuevoEstado[est.id_estudiante] = { p1: '', p2: '', p3: '', final: '' };
              }
            });
            return nuevoEstado;
          });
        }
      });
  }, [grupoSeleccionado, token]);

  useEffect(() => {
  if (!grupoSeleccionado || !token) return;
  fetch(`http://localhost:8000/api/v1/grupos/${grupoSeleccionado}/mis-materias`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        setMateriasDisponibles(data);
        const materiaInicial = location.state?.materiaPreseleccionada &&
          data.some(m => m.id_materia === location.state.materiaPreseleccionada)
          ? location.state.materiaPreseleccionada
          : (data.length > 0 ? data[0].id_materia : '');
        setMateriaSeleccionada(materiaInicial ? materiaInicial.toString() : '');
      }
    });
}, [grupoSeleccionado, token]);

  const handleCalificacionChange = (id, campo, valor) => {
    if (valor !== '' && (isNaN(valor) || valor < 0 || valor > 150)) return; 
    
    setCalificaciones(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  const calcularEstadisticas = () => {
    let sumaTotal = 0;
    let totalCapturadas = 0;
    let enRiesgo = 0;

    Object.values(calificaciones).forEach(calif => {
      const notas = [calif.p1, calif.p2, calif.p3, calif.final].filter(n => n !== '' && n <= 100);
      if (notas.length > 0) {
        const promPersonal = notas.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / notas.length;
        sumaTotal += promPersonal;
        totalCapturadas++;
        if (promPersonal < 60) enRiesgo++;
      }
    });

    const promedioClase = totalCapturadas > 0 ? (sumaTotal / totalCapturadas).toFixed(1) : '0.0';
    const completados = estudiantes.length > 0 ? Math.round((totalCapturadas / estudiantes.length) * 100) : 0;

    return { promedioClase, enRiesgo, completados };
  };

  const stats = calcularEstadisticas();

  const guardarCalificacionesLote = async () => {
    setIsSaving(true);
    try {
      const promesas = estudiantes.map(est => {
        const valor = calificaciones[est.id_estudiante][`p${parcialSeleccionado}`] || calificaciones[est.id_estudiante].final;
        
        if (valor === '' || valor > 100) return Promise.resolve();

        const payload = {
          id_materia: parseInt(materiaSeleccionada),
          grupo_id: parseInt(grupoSeleccionado),
          id_periodo: 1,
          parcial: parseInt(parcialSeleccionado),
          valor: parseFloat(valor),
        };

        return fetch(`http://localhost:8000/api/v1/estudiantes/${est.id_estudiante}/calificaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) throw new Error(`Error en estudiante ${est.id_estudiante}`);
          return res;
        });
      });

      await Promise.all(promesas);
      setToast({ type: 'success', text: 'Calificaciones guardadas correctamente.' });
    } catch (error) {
      setToast({ type: 'error', text: 'Error al conectar con el servidor.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const guardarObservacion = async () => {
    if (!obsForm.tipo) return alert('Selecciona una categoría');
    
    const severidad = obsForm.tipo === 'Indisciplina' ? 'Alta' : (obsForm.tipo === 'Dificultad de aprendizaje' ? 'Media' : 'Baja');

    try {
      await fetch(`http://localhost:8000/api/v1/estudiantes/${modalObs.estudiante.id_estudiante}/observaciones`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          etiqueta: obsForm.tipo,
          nota: obsForm.nota,
        })
      });
      
      setModalObs({ isOpen: false, estudiante: null });
      setObsForm({ tipo: '', nota: '' });
      setToast({ type: 'success', text: 'Observación registrada en el expediente.' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      alert('Error al guardar observación');
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-full">
      
      <div className="p-8 pb-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Captura de calificaciones</h2>
        <div className="flex justify-between items-center">
          <p className="text-gray-500 text-sm">Ingrese las calificaciones del periodo de evaluación. Los valores deben estar entre 0 y 100.</p>
          <div className="flex space-x-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50">
              Exportar CSV
            </button>
            <button 
              onClick={guardarCalificacionesLote}
              disabled={isSaving}
              className="px-6 py-2 bg-eduPurple text-white rounded-lg text-sm font-medium flex items-center shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 tracking-wider flex items-center mb-2">
            <CheckCircle className="w-4 h-4 mr-1" /> COMPLETADOS
          </p>
          <div className="flex items-end">
            <h3 className="text-3xl font-bold text-gray-900">{stats.completados}%</h3>
            <span className="ml-2 mb-1 text-sm text-green-600 font-medium">+12% esta semana</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-eduPurple">
          <p className="text-xs font-bold text-gray-500 tracking-wider flex items-center mb-2">
            <Brain className="w-4 h-4 mr-1" /> PROMEDIO DE LA CLASE
          </p>
          <div className="flex items-end">
            <h3 className="text-3xl font-bold text-gray-900">{stats.promedioClase}</h3>
            <span className="ml-1 mb-1 text-gray-500">/ 100</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-yellow-500">
          <p className="text-xs font-bold text-gray-500 tracking-wider flex items-center mb-2">
            <AlertTriangle className="w-4 h-4 mr-1" /> EN RIESGO
          </p>
          <div className="flex items-end">
            <h3 className="text-3xl font-bold text-gray-900">{stats.enRiesgo}</h3>
            <span className="ml-2 mb-1 text-sm text-gray-600">estudiantes &lt; 60</span>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <select 
              value={grupoSeleccionado}
              onChange={(e) => setGrupoSeleccionado(e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-gray-50 focus:ring-eduPurple"
            >
              {grupos.map(g => <option key={g.id_grupo} value={g.id_grupo}>{g.nombre_grupo}</option>)}
            </select>

            <select 
              value={materiaSeleccionada}
              onChange={(e) => setMateriaSeleccionada(e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-gray-50 focus:ring-eduPurple"
            >
              {materiasDisponibles.length === 0 ? (
                <option value="">Sin materias asignadas</option>
              ) : (
                materiasDisponibles.map(m => <option key={m.id_materia} value={m.id_materia}>{m.nombre_materia}</option>)
              )}
            </select>
            
            <div className="flex items-center text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full border border-red-500 mr-2"></span> Entrada inválida
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 pl-6 w-1/4">Nombre</th>
                <th className="p-4">Matricula</th>
                <th className="p-4 text-center">P1 <span className="text-gray-400 font-normal">(20%)</span></th>
                <th className="p-4 text-center">P2 <span className="text-gray-400 font-normal">(20%)</span></th>
                <th className="p-4 text-center">P3 <span className="text-gray-400 font-normal">(30%)</span></th>
                <th className="p-4 text-center">Final <span className="text-gray-400 font-normal">(30%)</span></th>
                <th className="p-4 text-right pr-6">Calificación Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estudiantes.map(est => {
                const notas = calificaciones[est.id_estudiante] || { p1: '', p2: '', p3: '', final: '' };
                
                const isInvalid = (val) => val !== '' && parseFloat(val) > 100;
                
                const p1 = parseFloat(notas.p1) || 0;
                const p2 = parseFloat(notas.p2) || 0;
                const p3 = parseFloat(notas.p3) || 0;
                const final = parseFloat(notas.final) || 0;
                const sumaFila = p1 + p2 + p3 + final;
                const countFila = [notas.p1, notas.p2, notas.p3, notas.final].filter(n => n !== '').length;
                const califFinal = countFila > 0 ? (sumaFila / countFila).toFixed(1) : '-';
                const isAtRisk = califFinal !== '-' && califFinal < 60;

                return (
                  <tr key={est.id_estudiante} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center cursor-pointer" onClick={() => setModalObs({ isOpen: true, estudiante: est })}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${isAtRisk ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-700'}`}>
                          {est.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{est.nombre_completo}</p>
                          {isAtRisk ? (
                            <p className="text-xs text-red-600 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Academic Risk</p>
                          ) : (
                            <p className="text-xs text-gray-500">CS Major</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{est.matricula}</td>
                    
                    {['p1', 'p2', 'p3', 'final'].map((campo) => (
                      <td key={campo} className="p-4 text-center">
                        <input 
                          type="text"
                          value={notas[campo]}
                          onChange={(e) => handleCalificacionChange(est.id_estudiante, campo, e.target.value)}
                          className={`w-16 text-center border rounded-md py-1.5 text-sm focus:ring-2 focus:outline-none ${isInvalid(notas[campo]) ? 'border-red-500 bg-red-50 text-red-700 ring-red-200' : 'border-gray-300 focus:border-eduPurple focus:ring-indigo-100'}`}
                          placeholder="-"
                        />
                      </td>
                    ))}

                    <td className={`p-4 text-right pr-6 font-bold ${isAtRisk ? 'text-red-600' : 'text-gray-700'}`}>
                      {califFinal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-50">
          <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
          {toast.text}
        </div>
      )}

      {modalObs.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[500px] shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Registrar Observación</h3>
                <p className="text-sm text-gray-500">Estudiante: {modalObs.estudiante?.nombre_completo} (ID: {modalObs.estudiante?.matricula})</p>
              </div>
              <button onClick={() => setModalObs({ isOpen: false, estudiante: null })} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categoría de comportamiento</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setObsForm({...obsForm, tipo: 'Participación'})}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center border ${obsForm.tipo === 'Participación' ? 'bg-eduPurple text-white border-eduPurple shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Hand className="w-4 h-4 mr-2" /> Participación
                  </button>
                  <button 
                    onClick={() => setObsForm({...obsForm, tipo: 'Indisciplina'})}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center border ${obsForm.tipo === 'Indisciplina' ? 'bg-eduPurple text-white border-eduPurple shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Indisciplina
                  </button>
                  <button 
                    onClick={() => setObsForm({...obsForm, tipo: 'Dificultad de aprendizaje'})}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center border ${obsForm.tipo === 'Dificultad de aprendizaje' ? 'bg-eduPurple text-white border-eduPurple shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Brain className="w-4 h-4 mr-2" /> Dificultad de aprendizaje
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nota (Opcional)</label>
                <textarea 
                  value={obsForm.nota}
                  onChange={(e) => setObsForm({...obsForm, nota: e.target.value.substring(0, 250)})}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-eduPurple focus:border-eduPurple outline-none h-28 resize-none"
                  placeholder="Añade contexto adicional sobre la observación..."
                ></textarea>
                <p className="text-right text-xs text-gray-400 mt-1">{obsForm.nota.length} / 250</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-gray-400 mr-3 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">Esta observación se registrará de forma confidencial y contribuirá al perfil de aprendizaje del estudiante.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
              <button 
                onClick={() => setModalObs({ isOpen: false, estudiante: null })}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarObservacion}
                className="px-5 py-2.5 text-sm font-medium text-white bg-eduPurple rounded-lg hover:bg-opacity-90 shadow-sm"
              >
                Guardar Observación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}