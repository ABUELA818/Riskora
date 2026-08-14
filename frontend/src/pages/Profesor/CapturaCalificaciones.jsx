import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api'; 
import { 
  Search, Download, Save, AlertCircle, X, Plus,
  Hand, AlertTriangle, Brain, CheckCircle 
} from 'lucide-react';

export default function CapturaCalificaciones() {
  const { token, role } = useAuth();
  const location = useLocation();
  
  const [grupos, setGrupos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [materiasDisponibles, setMateriasDisponibles] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [numParciales, setNumParciales] = useState(1); // arranca en 1
  
  const [calificaciones, setCalificaciones] = useState({});
  
  const [modalObs, setModalObs] = useState({ isOpen: false, estudiante: null });
  const [obsForm, setObsForm] = useState({ tipo: '', nota: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const exportarCSV = () => {
    const headers = ['Matricula','Nombre', ...camposActivos.map(c=>c.toUpperCase()), 'Final'];
    const filas = estudiantes.map(est => {
      const notas = calificaciones[est.id_estudiante] || {};
      const vals = camposActivos.map(c => notas[c] ?? '');
      return [est.matricula, est.nombre_completo, ...vals].join(',');
    });
    const csv = [headers.join(','), ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `calificaciones_grupo_${grupoSeleccionado}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Efecto 1: Cargar grupos (según rol)
  useEffect(() => {
    if (!token || !role) return;

    const url = role === 'Docente' ? '/api/v1/mis-clases' : '/api/v1/grupos';
    fetch(`${API_BASE_URL}${url}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;

        if (role === 'Docente') {
          const gruposUnicos = [...new Map(
            data.map(c => [c.id_grupo, { id_grupo: c.id_grupo, nombre_grupo: c.nombre_grupo }])
          ).values()];
          setGrupos(gruposUnicos);
          const grupoInicial = location.state?.grupoPreseleccionado &&
            gruposUnicos.some(g => g.id_grupo === location.state.grupoPreseleccionado)
            ? location.state.grupoPreseleccionado
            : gruposUnicos[0]?.id_grupo;
          if (grupoInicial != null) setGrupoSeleccionado(String(grupoInicial));
        } else {
          setGrupos(data);
          const grupoInicial = location.state?.grupoPreseleccionado &&
            data.some(g => g.id_grupo === location.state.grupoPreseleccionado)
            ? location.state.grupoPreseleccionado
            : data[0]?.id_grupo;
          if (grupoInicial != null) setGrupoSeleccionado(String(grupoInicial));
        }
      })
      .catch(err => console.error('Error cargando grupos:', err));
  }, [token, role]);

  // Efecto 2: Cargar materias del docente para el grupo seleccionado
  useEffect(() => {
    if (!grupoSeleccionado || !token) {
      setMateriasDisponibles([]);
      setMateriaSeleccionada('');
      return;
    }

    fetch(`${API_BASE_URL}/api/v1/grupos/${grupoSeleccionado}/mis-materias`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setMateriasDisponibles([]);
          setMateriaSeleccionada('');
          return;
        }

        setMateriasDisponibles(data);

        if (data.length === 0) {
          setMateriaSeleccionada('');
          return;
        }

        const preseleccionada = location.state?.materiaPreseleccionada;
        const coincide = preseleccionada != null &&
          data.some(m => String(m.id_materia) === String(preseleccionada));

        const materiaInicial = coincide ? preseleccionada : data[0].id_materia;
        setMateriaSeleccionada(String(materiaInicial));
      })
      .catch(err => {
        console.error('Error cargando materias:', err);
        setMateriasDisponibles([]);
        setMateriaSeleccionada('');
      });
  }, [grupoSeleccionado, token]);

  // Efecto 3: Cargar estudiantes del grupo
  useEffect(() => {
    if (!grupoSeleccionado || !token) return;
    
    fetch(`${API_BASE_URL}/api/v1/estudiantes?id_grupo=${grupoSeleccionado}`, {
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
                nuevoEstado[est.id_estudiante] = {};
              }
            });
            return nuevoEstado;
          });
        }
      });
  }, [grupoSeleccionado, token]);

  const camposActivos = Array.from({ length: numParciales }, (_, i) => `p${i + 1}`);

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
      const notas = camposActivos
        .map(c => calif[c])
        .filter(n => n !== undefined && n !== '' && n <= 100);
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
      const promesas = [];

      estudiantes.forEach(est => {
        const notasEst = calificaciones[est.id_estudiante] || {};

        camposActivos.forEach((campo, idx) => {
          const valor = notasEst[campo];
          if (valor === undefined || valor === '' || valor > 100) return;

          const payload = {
            id_materia: parseInt(materiaSeleccionada),
            grupo_id: parseInt(grupoSeleccionado),
            id_periodo: 1,
            parcial: idx + 1,
            valor: parseFloat(valor),
          };

          promesas.push(
            fetch(`${API_BASE_URL}/api/v1/estudiantes/${est.id_estudiante}/calificaciones`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(payload)
            }).then(res => {
              if (!res.ok) throw new Error(`Error en estudiante ${est.id_estudiante}, parcial ${idx + 1}`);
              return res;
            })
          );
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
      await fetch(`${API_BASE_URL}/api/v1/estudiantes/${modalObs.estudiante.id_estudiante}/observaciones`, {
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

  // Cargar calificaciones ya guardadas para el grupo/materia seleccionados
  useEffect(() => {
    if (!grupoSeleccionado || !materiaSeleccionada || !token) return;

    fetch(`${API_BASE_URL}/api/v1/grupos/${grupoSeleccionado}/calificaciones?id_materia=${materiaSeleccionada}&id_periodo=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return;

        const nuevoEstado = {};
        let maxParcial = 1;

        data.forEach(c => {
          if (!nuevoEstado[c.id_estudiante]) {
            nuevoEstado[c.id_estudiante] = {};
          }
          nuevoEstado[c.id_estudiante][`p${c.parcial}`] = String(c.valor);
          if (c.parcial > maxParcial) maxParcial = c.parcial;
        });

        setNumParciales(prev => Math.max(prev, maxParcial));

        setCalificaciones(prev => {
          const combinado = { ...prev };
          Object.entries(nuevoEstado).forEach(([idEst, notas]) => {
            combinado[idEst] = { ...combinado[idEst], ...notas };
          });
          return combinado;
        });
      })
      .catch(err => console.error('Error cargando calificaciones existentes:', err));
  }, [grupoSeleccionado, materiaSeleccionada, token]);

  return (
    <div className="bg-gray-50/50 min-h-full">
      
      <div className="p-8 pb-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Captura de calificaciones</h2>
        <div className="flex justify-between items-center">
          <p className="text-gray-500 text-sm">Ingrese las calificaciones del periodo de evaluación. Los valores deben estar entre 0 y 100.</p>
          <div className="flex space-x-3">
            <button onClick={exportarCSV} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50">
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
            <span className="ml-2 mb-1 text-sm text-risk-low font-medium">+12% esta semana</span>
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
          
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
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
                  materiasDisponibles.map(m => (
                    <option key={m.id_materia} value={String(m.id_materia)}>
                      {m.nombre_materia}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => setNumParciales(prev => Math.min(prev + 1, 12))}
                disabled={numParciales >= 12}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 flex items-center disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-1" /> Agregar parcial
              </button>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full border border-risk-high mr-2"></span> Entrada inválida
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 pl-6 w-1/4">Nombre</th>
                <th className="p-4">Matricula</th>
                {Array.from({ length: numParciales }, (_, i) => (
                  <th key={i} className="p-4 text-center">P{i + 1}</th>
                ))}
                <th className="p-4 text-right pr-6">Calificación Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estudiantes.map(est => {
                const notas = calificaciones[est.id_estudiante] || {};
                
                const isInvalid = (val) => val !== '' && parseFloat(val) > 100;

                const valoresCapturados = camposActivos
                  .map(c => notas[c])
                  .filter(v => v !== undefined && v !== '');
                const suma = valoresCapturados.reduce((acc, v) => acc + parseFloat(v), 0);
                const califFinal = valoresCapturados.length > 0 ? (suma / valoresCapturados.length).toFixed(1) : '-';
                const isAtRisk = califFinal !== '-' && califFinal < 60;

                return (
                  <tr key={est.id_estudiante} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center cursor-pointer" onClick={() => setModalObs({ isOpen: true, estudiante: est })}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${isAtRisk ? 'bg-risk-high-bg text-risk-high' : 'bg-brand-100 text-brand-700'}`}>
                          {est.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{est.nombre_completo}</p>
                          {isAtRisk ? (
                            <p className="text-xs text-risk-high flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Academic Risk</p>
                          ) : (
                            <p className="text-xs text-gray-500">CS Major</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{est.matricula}</td>
                    
                    {Array.from({ length: numParciales }, (_, i) => {
                      const campo = `p${i + 1}`;
                      const valor = notas[campo] || '';
                      return (
                        <td key={campo} className="p-4 text-center">
                          <input
                            type="text"
                            value={valor}
                            onChange={(e) => handleCalificacionChange(est.id_estudiante, campo, e.target.value)}
                            className={`w-16 text-center border rounded-md py-1.5 text-sm focus:ring-2 focus:outline-none ${isInvalid(valor) ? 'border-risk-high bg-risk-high-bg text-risk-high-fg ring-risk-high-border' : 'border-gray-300 focus:border-eduPurple focus:ring-brand-100'}`}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}

                    <td className={`p-4 text-right pr-6 font-bold ${isAtRisk ? 'text-risk-high' : 'text-gray-700'}`}>
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
          <CheckCircle className="w-5 h-5 text-risk-low mr-3" />
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