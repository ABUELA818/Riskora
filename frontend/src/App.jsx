import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AltaEstudiantes from './pages/Psicopedagogia/AltaEstudiantes';
import GestionEstudiantes from './pages/GestionEstudiantes';
import GestionGrupos from './pages/Director/GestionGrupos';
import DocentesCarrera from './pages/Director/DocentesCarrera';
import RegistroAsistencia from './pages/Profesor/RegistroAsistencia';
import CapturaCalificaciones from './pages/Profesor/CapturaCalificaciones';
import DashboardTutor from './pages/Tutor/DashboardTutor';
import PanelRiesgo from './pages/Tutor/PanelRiesgo';
import AnalisisPrediccion from './pages/Tutor/AnalisisPrediccion';
import BitacoraIntervenciones from './pages/Tutor/BitacoraIntervenciones';
import DashboardDirector from './pages/Director/DashboardDirector';
import RiesgoAgregado from './pages/Director/RiesgoAgregado';
import CasosEscalados from './pages/Psicopedagogia/CasosEscalados';
import DashboardInstitucional from './pages/Psicopedagogia/DashboardInstitucional';
import DashboardPsicopedagogia from './pages/Psicopedagogia/DashboardPsicopedagogia';
import ExpedienteCompleto from './pages/ExpedienteCompleto';
import DashboardRRHH from './pages/RRHH/DashboardRRHH';
import DirectorioPersonal from './pages/RRHH/DirectorioPersonal';
import GestionAccesos from './pages/RRHH/GestionAccesos';
import ReportesInstitucionales from './pages/Psicopedagogia/ReportesInstitucionales';
import AuditoriaAccesos from './pages/RRHH/AuditoriaAccesos';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingSession } = useAuth();
  if (isLoadingSession) return <div className="p-10 text-center text-gray-400">Cargando sesión...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { role } = useAuth();
  if (!allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

const Dashboard = () => <div className="p-6"><h1 className="text-2xl font-bold mb-2">Dashboard</h1></div>;
const Asistencias = () => <div className="p-6"><h1 className="text-2xl font-bold">Módulo de Asistencias</h1></div>;
const Unauthorized = () => <div className="p-10 text-center text-red-600"><h1>403 - Acceso Denegado</h1></div>;

const DashboardRouter = () => {
  const { role } = useAuth();
  switch (role) {
    case 'Tutor':
      return <DashboardTutor />;
    case 'Director':
      return <Navigate to="/carreras/dashboard" replace />;
    case 'Psicopedagogia':
      return <Navigate to="/psicopedagogia/dashboard" replace />;
    case 'RRHH':
    case 'Administrador':
      return <Navigate to="/rrhh/dashboard" replace />;
    default:
      return <Dashboard />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardRouter />} />
            <Route path="estudiantes" element={<GestionEstudiantes />} />
            <Route path="estudiantes/nuevo" element={<AltaEstudiantes />} />
            <Route path="grupos" element={<GestionGrupos />} />
            <Route path="docentes" element={<DocentesCarrera />} />
            <Route path="panel-riesgo" element={<PanelRiesgo />} />
            <Route path="estudiantes/:id/analisis" element={<AnalisisPrediccion />} />
            <Route path="carreras/dashboard" element={<RoleRoute allowedRoles={['Administrador', 'Director']}><DashboardDirector /></RoleRoute>} />
            <Route path="carreras/riesgo-agregado" element={<RoleRoute allowedRoles={['Administrador', 'Director']}><RiesgoAgregado /></RoleRoute>} />
            <Route path="casos-escalados" element={<RoleRoute allowedRoles={['Administrador', 'Tutor', 'Director', 'Psicopedagogia']}><CasosEscalados /></RoleRoute>} />
            <Route path="institucional/dashboard" element={<RoleRoute allowedRoles={['Administrador', 'Director']}><DashboardInstitucional /></RoleRoute>} />
            <Route path="rrhh/dashboard" element={<RoleRoute allowedRoles={['Administrador', 'RRHH']}><DashboardRRHH /></RoleRoute>} />
            <Route path="rrhh/directorio" element={<RoleRoute allowedRoles={['Administrador', 'RRHH']}><DirectorioPersonal /></RoleRoute>} />
            <Route path="rrhh/auditoria" element={<RoleRoute allowedRoles={['Administrador', 'RRHH']}><AuditoriaAccesos /></RoleRoute>} />
            <Route path="rrhh/accesos" element={<RoleRoute allowedRoles={['Administrador', 'RRHH']}><GestionAccesos /></RoleRoute>} />
            <Route path="estudiantes/:id/intervenciones" element={
              <RoleRoute allowedRoles={['Tutor', 'Administrador', 'Director', 'Psicopedagogia']}>
                <BitacoraIntervenciones />
              </RoleRoute>
            } />
            <Route path="calificaciones" element={
              <RoleRoute allowedRoles={['Docente', 'Administrador',]}>
                <CapturaCalificaciones />
              </RoleRoute>
            } />
            <Route path="asistencias" element={
              <RoleRoute allowedRoles={['Docente', 'Administrador']}>
                <RegistroAsistencia />
              </RoleRoute>
            } />
            <Route 
              path="psicopedagogia/dashboard" 
              element={
                <RoleRoute allowedRoles={['Administrador', 'Psicopedagogia']}>
                  <DashboardPsicopedagogia />
                </RoleRoute>
              } 
            />
            <Route 
              path="estudiantes/:id/expediente" 
              element={
                <RoleRoute allowedRoles={['Administrador', 'Psicopedagogia', 'Tutor', 'Docente']}>
                  <ExpedienteCompleto />
                </RoleRoute>
              } 
            />
            <Route path="reportes" element={
              <RoleRoute allowedRoles={['Administrador', 'Director', 'RRHH', 'Psicopedagogia']}>
                <ReportesInstitucionales />
              </RoleRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}