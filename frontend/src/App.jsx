import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function MainLayout() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const titles = {
    dashboard: { title: 'Panel Principal de Control', subtitle: 'Vista ejecutiva general y operaciones en curso' },
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
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-800">
      <div className="no-print">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
