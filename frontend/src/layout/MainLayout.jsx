import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext'; 
import { 
  LayoutDashboard, ClipboardList, BarChart2, Users, 
  Settings, Bell, Search, HelpCircle, ShieldAlert, 
  UserPlus, FileText, Lock, Folder, LogOut, BookOpen, Clock, GraduationCap, UserX,
  ChevronsLeft, ChevronsRight
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
    { name: 'Materias', path: '/materias', icon: BookOpen },
    { name: 'Docentes', path: '/docentes', icon: Users },
    { name: 'Casos Escalados', path: '/casos-escalados', icon: ShieldAlert },
    { name: 'Reportes', path: '/reportes', icon: FileText },
  ],
  Psicopedagogia: [
    { name: 'Dashboard', path: '/psicopedagogia/dashboard', icon: LayoutDashboard },
    { name: 'Directorio de Alumnos', path: '/estudiantes', icon: Users },
    { name: 'Casos Urgentes', path: '/casos-escalados', icon: ShieldAlert },
    { name: 'Carreras', path: '/carreras/gestion', icon: GraduationCap },
    { name: 'Materias', path: '/materias', icon: BookOpen },
    { name: 'Alta Estudiantes', path: '/estudiantes/nuevo', icon: UserPlus },
    { name: 'Baja Estudiantes', path: '/estudiantes/baja', icon: UserX },
    { name: 'Reportes', path: '/reportes', icon: FileText },
],
  RRHH: [
    { name: 'Dashboard', path: '/rrhh/dashboard', icon: LayoutDashboard },
    { name: 'Directorio Personal', path: '/rrhh/directorio', icon: Users },
    { name: 'Solicitudes Pendientes', path: '/rrhh/solicitudes', icon: Clock },
    { name: 'Gestión Accesos', path: '/rrhh/accesos', icon: Lock },
  ],
  Administrador: [
    { name: 'Dashboard General', path: '/rrhh/dashboard', icon: LayoutDashboard },
    { name: 'Visión Institucional', path: '/psicopedagogia/dashboard', icon: LayoutDashboard },
    { name: 'Directorio de Estudiantes', path: '/estudiantes', icon: Users },
    { name: 'Alta de Estudiantes', path: '/estudiantes/nuevo', icon: UserPlus },
    { name: 'Baja de Estudiantes', path: '/estudiantes/baja', icon: UserX },
    { name: 'Gestión de Grupos', path: '/grupos', icon: Folder },
    { name: 'Materias', path: '/materias', icon: BookOpen },
    { name: 'Carreras', path: '/carreras/gestion', icon: GraduationCap },
    { name: 'Calificaciones', path: '/calificaciones', icon: BarChart2 },
    { name: 'Asistencias', path: '/asistencias', icon: ClipboardList },
    { name: 'Panel de Riesgo', path: '/panel-riesgo', icon: ShieldAlert },
    { name: 'Casos Escalados', path: '/casos-escalados', icon: ShieldAlert },
    { name: 'Reportes Institucionales', path: '/reportes', icon: FileText },
    { name: 'Directorio de Personal', path: '/rrhh/directorio', icon: Users },
    { name: 'Solicitudes de Personal', path: '/rrhh/solicitudes', icon: Clock },
    { name: 'Gestión de Accesos', path: '/rrhh/accesos', icon: Lock },
    { name: 'Auditoría de Accesos', path: '/rrhh/auditoria', icon: FileText },
  ],
  Mixto: [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Asistencias', path: '/asistencias', icon: ClipboardList },
    { name: 'Calificaciones', path: '/calificaciones', icon: BarChart2 },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Panel de Riesgo', path: '/panel-riesgo', icon: ShieldAlert },
    { name: 'Casos Escalados', path: '/casos-escalados', icon: FileText },
  ],
};

export default function MainLayout() {
  const location = useLocation();
  const { role, logout, token } = useAuth(); 

  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotis, setMostrarNotis] = useState(false); 
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/notificaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setNotificaciones(data); })
      .catch(err => console.error(err));
  }, [token]);

  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const menuOptions = MENU_ITEMS[role] || [];

  return (
    <div className="flex h-screen bg-canvas overflow-hidden font-sans">

      {/* SIDEBAR */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } bg-ink-950 text-slate-300 flex flex-col justify-between shadow-2xl z-10 transition-all duration-200`}
      >
        <div>
          <div className="h-16 flex items-center px-5 border-b border-white/5">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm">
               <span className="text-ink-950 font-display font-bold">R</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-display font-bold text-white text-sm leading-tight tracking-wide">RISKORA</h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">Fiabilidad Institucional</p>
              </div>
            )}
          </div>

          <nav className="p-3 space-y-1">
            {menuOptions.length === 0 && !collapsed && (
              <p className="text-xs text-risk-high px-4 py-2">Rol "{role}" no configurado en menús.</p>
            )}
            
            {menuOptions.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center rounded-lg text-sm font-medium transition-all ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5'
                  } ${
                    isActive 
                      ? 'bg-brand-500/15 text-brand-400 border-l-2 border-brand-500' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${collapsed ? '' : 'mr-3'} ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-white/5 flex flex-col gap-1">
           <button
             onClick={() => setCollapsed(!collapsed)}
             className="flex items-center w-full px-3.5 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors"
           >
              {collapsed ? <ChevronsRight className="w-4 h-4 shrink-0" /> : <ChevronsLeft className="w-4 h-4 mr-3 shrink-0" />}
              {!collapsed && 'Contraer menú'}
           </button>

           {!collapsed && (
             <div className="flex items-center px-3.5 py-2.5 mb-1 bg-white/5 rounded-lg border border-white/5">
                <ShieldAlert className="w-4 h-4 mr-2 text-brand-400 shrink-0" />
                <span className="text-xs font-bold text-slate-300 uppercase truncate" title={role}>{role}</span>
             </div>
           )}
           
           <Link
             to="/support"
             title={collapsed ? 'Soporte' : undefined}
             className={`flex items-center w-full px-3.5 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors ${collapsed ? 'justify-center' : ''}`}
           >
              <HelpCircle className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && 'Soporte'}
           </Link>

           <button 
             onClick={logout}
             title={collapsed ? 'Cerrar sesión' : undefined}
             className={`flex items-center w-full px-3.5 py-2 text-sm text-risk-high hover:text-white hover:bg-risk-high/20 rounded-lg font-medium transition-colors ${collapsed ? 'justify-center' : ''}`}
           >
              <LogOut className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && 'Cerrar sesión'}
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="h-16 bg-white border-b border-slate-200/70 flex items-center justify-between px-6 z-0">
          <div className="flex items-center flex-1">
            <h2 className="font-display text-lg font-semibold text-ink-900 mr-8 hidden md:block">Portal Institucional</h2>
          
          </div>

          <div className="flex items-center space-x-5">
            <div className="relative">
              <button 
                onClick={() => setMostrarNotis(!mostrarNotis)}
                className="relative p-2 text-slate-400 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50"
              >
                <Bell className="h-5 w-5" />
                {noLeidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-risk-high ring-2 ring-white" />
                )}
              </button>

              {mostrarNotis && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-card border border-slate-200/70 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-slate-100 font-display font-semibold text-sm text-ink-900">
                    Notificaciones {noLeidas > 0 && `(${noLeidas} nuevas)`}
                  </div>
                  {notificaciones.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400 text-center">Sin notificaciones.</div>
                  ) : (
                    notificaciones.map(n => (
                      <div key={n.id_notificacion} className={`p-3 border-b border-slate-50 text-sm ${!n.leida ? 'bg-brand-50/50 font-medium text-ink-900' : 'text-slate-500'}`}>
                        {n.mensaje}
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.fecha).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="h-9 w-9 rounded-full bg-brand-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
               <span className="font-display font-bold text-brand-600 text-sm">{role ? role.substring(0,2).toUpperCase() : 'U'}</span>
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