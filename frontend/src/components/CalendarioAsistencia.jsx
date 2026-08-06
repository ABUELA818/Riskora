import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ESTILOS_ESTATUS = {
  Presente: 'bg-green-100 text-green-800 border-green-200',
  Ausente: 'bg-red-100 text-red-800 border-red-200',
  Retardo: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

export default function CalendarioAsistencia({ historial }) {
  const registrosPorFecha = useMemo(() => {
    const map = {};
    (historial || []).forEach(r => {
      const fechaStr = typeof r.fecha === 'string' ? r.fecha.split('T')[0] : r.fecha;
      map[fechaStr] = r.estatus;
    });
    return map;
  }, [historial]);

  const fechaInicial = useMemo(() => {
    if (historial && historial.length > 0) {
      const fechas = historial.map(r => new Date(r.fecha));
      return new Date(Math.max(...fechas.map(f => f.getTime())));
    }
    return new Date();
  }, [historial]);

  const [mesActual, setMesActual] = useState(fechaInicial.getMonth());
  const [anioActual, setAnioActual] = useState(fechaInicial.getFullYear());

  const cambiarMes = (delta) => {
    let nuevoMes = mesActual + delta;
    let nuevoAnio = anioActual;
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio -= 1; }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio += 1; }
    setMesActual(nuevoMes);
    setAnioActual(nuevoAnio);
  };

  const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const resumen = useMemo(() => {
    const total = (historial || []).length;
    const presentes = (historial || []).filter(r => r.estatus === 'Presente').length;
    const retardos = (historial || []).filter(r => r.estatus === 'Retardo').length;
    const ausencias = (historial || []).filter(r => r.estatus === 'Ausente').length;
    const porcentaje = total > 0 ? Math.round(((presentes + retardos) / total) * 100) : 0;
    return { total, presentes, retardos, ausencias, porcentaje };
  }, [historial]);

  if (!historial || historial.length === 0) {
    return (
      <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 min-h-[300px] flex items-center justify-center">
        Sin registros de asistencia todavía.
      </div>
    );
  }

  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Asistencia</p>
          <p className={`text-2xl font-black ${resumen.porcentaje < 70 ? 'text-red-600' : 'text-gray-900'}`}>{resumen.porcentaje}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Presentes</p>
          <p className="text-2xl font-black text-green-600">{resumen.presentes}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Retardos</p>
          <p className="text-2xl font-black text-yellow-600">{resumen.retardos}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Faltas</p>
          <p className="text-2xl font-black text-red-600">{resumen.ausencias}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h4 className="font-bold text-gray-900">{NOMBRES_MES[mesActual]} {anioActual}</h4>
          <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {celdas.map((dia, idx) => {
            if (dia === null) return <div key={`vacio-${idx}`} />;
            const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const estatus = registrosPorFecha[fechaStr];
            const estilo = estatus ? ESTILOS_ESTATUS[estatus] : 'bg-gray-50 text-gray-400 border-gray-100';
            return (
              <div
                key={fechaStr}
                title={estatus || 'Sin registro'}
                className={`aspect-square flex items-center justify-center rounded-lg border text-sm font-semibold ${estilo}`}
              >
                {dia}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-xs font-semibold text-gray-600">
          <span className="flex items-center"><CheckCircle className="w-3.5 h-3.5 text-green-600 mr-1" /> Presente</span>
          <span className="flex items-center"><Clock className="w-3.5 h-3.5 text-yellow-600 mr-1" /> Retardo</span>
          <span className="flex items-center"><XCircle className="w-3.5 h-3.5 text-red-600 mr-1" /> Falta</span>
        </div>
      </div>
    </div>
  );
}