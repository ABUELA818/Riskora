import { Link } from 'react-router-dom';
import { Hand, AlertTriangle, Brain, Calendar, ExternalLink } from 'lucide-react';

const CONFIG_ETIQUETA = {
  'Participación': { icon: Hand, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Indisciplina': { icon: AlertTriangle, color: 'bg-risk-high-bg text-risk-high-fg border-risk-high-border' },
  'Dificultad de aprendizaje': { icon: Brain, color: 'bg-risk-medium-bg text-risk-medium-fg border-risk-medium-border' }
};

export default function ObservacionesTab({ observaciones, idEstudiante }) {
  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex justify-between items-center">
        <div>
          <h4 className="font-bold text-gray-900">Observaciones de conducta</h4>
          <p className="text-sm text-gray-500">Reportes enviados por los docentes que imparten clase a este alumno.</p>
        </div>
        <Link
          to={`/estudiantes/${idEstudiante}/intervenciones`}
          className="inline-flex items-center text-sm font-semibold text-eduPurple bg-brand-50 px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors whitespace-nowrap"
        >
          Ir a Bitácora de Intervenciones <ExternalLink className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {(!observaciones || observaciones.length === 0) ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 min-h-[200px] flex items-center justify-center">
          Sin observaciones de conducta registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {observaciones.map(obs => {
            const config = CONFIG_ETIQUETA[obs.etiqueta] || { icon: Hand, color: 'bg-gray-50 text-gray-700 border-gray-200' };
            const Icono = config.icon;
            return (
              <div key={obs.id_observacion} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${config.color}`}>
                    <Icono className="w-3.5 h-3.5 mr-1.5" /> {obs.etiqueta}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(obs.fecha_registro).toLocaleDateString()}
                  </span>
                </div>
                {obs.nota && <p className="text-sm text-gray-700 mb-3">{obs.nota}</p>}
                <p className="text-xs text-gray-500 font-medium">Reportado por: {obs.nombre_docente}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}