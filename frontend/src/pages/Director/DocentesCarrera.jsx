import { useState } from 'react';
import { Search } from 'lucide-react';

export default function DocentesCarrera() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data temporal hasta que RRHH conecte el endpoint de personal en Sprint 4
  const docentesMock = [
    { id: 1, nombre: 'Dra. María López', especialidad: 'Ciencias Básicas', estado: 'Activo' },
    { id: 2, nombre: 'Ing. Carlos Mendoza', especialidad: 'Programación', estado: 'Activo' },
    { id: 3, nombre: 'Mtra. Ana García', especialidad: 'Bases de Datos', estado: 'Activo' },
  ];

  const filtrados = docentesMock.filter(d => d.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Personal Académico</h2>
        <p className="text-sm text-gray-500">Directorio de docentes adscritos a la institución (Solo lectura).</p>
      </div>

      <div className="mb-6 w-full md:w-1/3 relative">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Buscar docente por nombre..." 
          className="pl-9 w-full border border-gray-300 rounded-md p-2 text-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">ID</th>
              <th className="p-3">Nombre del Docente</th>
              <th className="p-3">Especialidad</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtrados.map(docente => (
              <tr key={docente.id} className="hover:bg-gray-50">
                <td className="p-3 text-sm text-gray-600">DOC-{docente.id}</td>
                <td className="p-3 text-sm font-medium text-gray-900">{docente.nombre}</td>
                <td className="p-3 text-sm text-gray-600">{docente.especialidad}</td>
                <td className="p-3 text-sm">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{docente.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}