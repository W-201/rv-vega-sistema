import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Produccion from './pages/Produccion';
import Inventario from './pages/Inventario';
import Reportes from './pages/Reportes';
import BusinessIntelligence from './pages/BusinessIntelligence';
import AsistenteIA from './pages/AsistenteIA';
import LoadingScreen from './components/LoadingScreen';

function MainLayout() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="no-print h-screen sticky top-0 flex-shrink-0 z-20">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-slate-100 dark:bg-slate-950">
        <div className="no-print">
          <Header title={currentInfo.title} subtitle={currentInfo.subtitle} />
        </div>

        <main className="flex-1">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'clientes' && <Clientes />}
          {activeTab === 'pedidos' && <Pedidos setActiveTab={setActiveTab} />}
          {activeTab === 'produccion' && <Produccion />}
          {activeTab === 'inventario' && <Inventario />}
          {activeTab === 'reportes' && <Reportes />}
          {activeTab === 'bi' && <BusinessIntelligence />}
          {activeTab === 'ai' && <AsistenteIA />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
