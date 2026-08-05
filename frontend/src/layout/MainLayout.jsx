import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import { 
  LayoutDashboard, ClipboardList, BarChart2, Users, 
  Settings, Bell, Search, HelpCircle, ShieldAlert, 
  UserPlus, FileText, Lock, Folder, LogOut
} from 'lucide-react';

const MENU_ITEMS = {
  Docente: [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Asistencias', path: '/asistencias', icon: ClipboardList },
    { name: 'Calificaciones', path: '/calificaciones', icon: BarChart2 },
  ],
  Tutor: [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Panel de Riesgo', path: '/panel-riesgo', icon: ShieldAlert },
    { name: 'Casos Escalados', path: '/casos-escalados', icon: FileText },
  ],
  Director: [
    { name: 'Dashboard Institucional', path: '/carreras/dashboard', icon: LayoutDashboard },
    { name: 'Gestión de Grupos', path: '/grupos', icon: Folder },
    { name: 'Docentes', path: '/docentes', icon: Users },
    { name: 'Casos Escalados', path: '/casos-escalados', icon: ShieldAlert },
    { name: 'Reportes', path: '/reportes', icon: FileText },
  ],
  Psicopedagogia: [
    { name: 'Dashboard', path: '/psicopedagogia/dashboard', icon: LayoutDashboard },
    { name: 'Casos Urgentes', path: '/casos-escalados', icon: ShieldAlert },
    { name: 'Alta Estudiantes', path: '/estudiantes/nuevo', icon: UserPlus },
    { name: 'Reportes', path: '/reportes', icon: FileText },
  ],
  RRHH: [
    { name: 'Dashboard', path: '/rrhh/dashboard', icon: LayoutDashboard },
    { name: 'Directorio Personal', path: '/rrhh/directorio', icon: Users },
    { name: 'Gestión Accesos', path: '/rrhh/accesos', icon: Lock },
    { name: 'Reportes', path: '/reportes', icon: FileText },
  ],
  Administrador: [
    { name: 'Dashboard RRHH', path: '/rrhh/dashboard', icon: LayoutDashboard },
    { name: 'Directorio Global', path: '/rrhh/directorio', icon: Users },
    { name: 'Control Accesos', path: '/rrhh/accesos', icon: Lock },
    { name: 'Configuración', path: '/config', icon: Settings },
  ]
};

export default function MainLayout() {
  const location = useLocation();
  const { role, logout } = useAuth(); 
  
  const menuOptions = MENU_ITEMS[role] || [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between shadow-sm z-10">
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-md flex items-center justify-center mr-3 shadow-sm">
               <span className="text-white font-bold">E</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">EduPredict AI</h1>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Institutional Reliability</p>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {menuOptions.length === 0 && (
              <p className="text-xs text-red-500 px-4 py-2">Rol "{role}" no configurado en menús.</p>
            )}
            
            {menuOptions.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    isActive 
                      ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-200' 
                      : 'text-gray-600 hover:bg-indigo-50 hover:text-[#4F46E5]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-col gap-1">
           <div className="flex items-center px-4 py-3 mb-2 bg-gray-50 rounded-xl border border-gray-100">
              <ShieldAlert className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-xs font-bold text-gray-600 uppercase truncate" title={role}>{role}</span>
           </div>
           
           <Link to="/support" className="flex items-center w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors">
              <HelpCircle className="w-4 h-4 mr-3 text-gray-400" />
              Soporte
           </Link>

           <button 
             onClick={logout}
             className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
           >
              <LogOut className="w-4 h-4 mr-3 text-red-500" />
              Cerrar sesión
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-0">
          <div className="flex items-center flex-1">
            <h2 className="text-lg font-bold text-gray-800 mr-8 hidden md:block">Portal Institucional</h2>
            
            <div className="max-w-md w-full relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar clases o estudiantes..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all bg-gray-50 hover:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-5">
            <button className="relative p-2 text-gray-400 hover:text-[#4F46E5] transition-colors rounded-full hover:bg-indigo-50">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="h-9 w-9 rounded-full bg-indigo-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
               <span className="font-bold text-[#4F46E5] text-sm">{role ? role.substring(0,2).toUpperCase() : 'U'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}