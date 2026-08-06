import { BookOpen } from 'lucide-react';

export default function HistorialAcademicoTab({ historial }) {
  if (!historial || historial.length === 0) {
    return (
      <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 min-h-[300px] flex items-center justify-center">
        Sin calificaciones registradas todavía.
      </div>
    );
  }

  // Agrupar por materia
  const porMateria = {};
  historial.forEach(c => {
    if (!porMateria[c.id_materia]) {
      porMateria[c.id_materia] = { nombre: c.nombre_materia, registros: [] };
    }
    porMateria[c.id_materia].registros.push(c);
  });

  return (
    <div className="lg:col-span-3 space-y-4">
      {Object.entries(porMateria).map(([idMateria, data]) => {
        const promedio = (data.registros.reduce((acc, r) => acc + r.valor, 0) / data.registros.length).toFixed(1);
        const esRiesgo = parseFloat(promedio) < 60;

        // Agrupar por periodo dentro de la materia
        const porPeriodo = {};
        data.registros.forEach(r => {
          if (!porPeriodo[r.id_periodo]) porPeriodo[r.id_periodo] = { nombre: r.nombre_periodo, parciales: [] };
          porPeriodo[r.id_periodo].parciales.push(r);
        });

        return (
          <div key={idMateria} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center">
                <BookOpen className="w-5 h-5 text-eduPurple mr-2" />
                <h4 className="font-bold text-gray-900">{data.nombre}</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${esRiesgo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                Promedio: {promedio}
              </span>
            </div>
            <div className="p-5 space-y-3">
              {Object.entries(porPeriodo).map(([idPeriodo, pdata]) => (
                <div key={idPeriodo} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{pdata.nombre}</span>
                  <div className="flex gap-2">
                    {pdata.parciales
                      .sort((a, b) => a.parcial - b.parcial)
                      .map(p => (
                        <span key={p.parcial} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-700">
                          P{p.parcial}: {p.valor}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}