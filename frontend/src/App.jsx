import ModuleBoundary from './components/ModuleBoundary';
import { NotificationProvider } from './context/NotificationContext';
import React, { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MobileMenu from './components/MobileMenu';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Pedidos = lazy(() => import('./pages/Pedidos'));
const Produccion = lazy(() => import('./pages/Produccion'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Reportes = lazy(() => import('./pages/Reportes'));
const BusinessIntelligence = lazy(() => import('./pages/BusinessIntelligence'));
const AsistenteIA = lazy(() => import('./pages/AsistenteIA'));
import LoadingScreen from './components/LoadingScreen';

function MainLayout() {
  const { user, loading } = useAuth();
  const [activeTab, updateTab] = useState('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState(null);
  const setActiveTab = (tab, filter = null) => { setDashboardFilter(filter); updateTab(tab); };
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return <LoadingScreen message="Verificando sesión del sistema..." />;
  }

  if (!user) {
    return <Login />;
  }

  const titles = {
    dashboard: { title: 'Dashboard Gerencial', subtitle: 'Vista ejecutiva general, KPIs y operaciones en curso' },
    clientes: { title: 'Gestión de Clientes', subtitle: 'Padrón de empresas, RUCs y contactos comerciales' },
    pedidos: { title: 'Gestión de Pedidos', subtitle: 'Recepción, cotizaciones y compromisos de entrega (SLA)' },
    produccion: { title: 'Planificación y Seguimiento de Producción', subtitle: 'Control de Órdenes de Trabajo, etapas y tiempos de ciclo' },
    inventario: { title: 'Control de Inventario de Materia Prima', subtitle: 'Catálogo de insumos, stock de seguridad y Kardex' },
    reportes: { title: 'Reportes Gerenciales', subtitle: 'Cumplimiento OTIF, rentabilidad de órdenes y productividad' },
    bi: { title: 'Inteligencia de Negocios (BI)', subtitle: 'Indicadores clave de rendimiento (OEE) y analítica de planta' },
    ai: { title: 'Asistencia y Análisis con Inteligencia Artificial', subtitle: 'Copiloto de planta, detección de riesgos y compras inteligentes' }
  };

  const currentInfo = titles[activeTab] || titles.dashboard;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="no-print hidden lg:block h-[100dvh] sticky top-0 flex-shrink-0 z-20">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} activeTab={activeTab} onNavigate={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto bg-slate-100 dark:bg-slate-950">
        <div className="no-print">
          <Header onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} title={currentInfo.title} subtitle={currentInfo.subtitle} />
        </div>

        <main className="flex-1 min-w-0">
          <ModuleBoundary key={activeTab}>
          <Suspense fallback={<div role="status" className="p-8 flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300"><span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-blue-600 animate-spin" /><span>Cargando {currentInfo.title}…</span></div>}>
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'clientes' && <Clientes />}
          {activeTab === 'pedidos' && <Pedidos initialFilter={dashboardFilter} setActiveTab={setActiveTab} />}
          {activeTab === 'produccion' && <Produccion initialFilter={dashboardFilter} />}
          {activeTab === 'inventario' && <Inventario initialFilter={dashboardFilter} />}
          {activeTab === 'reportes' && <Reportes />}
          {activeTab === 'bi' && <BusinessIntelligence />}
          {activeTab === 'ai' && <AsistenteIA />}
          </Suspense>
          </ModuleBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
