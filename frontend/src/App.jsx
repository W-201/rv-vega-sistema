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

function MainLayout() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const userRole = user?.rol === 'jefe_produccion' ? 'produccion' : (user?.rol || 'operario');
  const isAdmin = userRole === 'admin';

  // Si el usuario no es admin y se encuentra en dashboard, redirigir a su módulo por defecto
  useEffect(() => {
    if (user) {
      const role = user.rol === 'jefe_produccion' ? 'produccion' : (user.rol || 'operario');
      if (role !== 'admin' && activeTab === 'dashboard') {
        if (role === 'ventas') {
          setActiveTab('pedidos');
        } else if (role === 'produccion' || role === 'operario') {
          setActiveTab('produccion');
        } else {
          setActiveTab('pedidos');
        }
      }
    }
  }, [user, activeTab]);

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
          {activeTab === 'dashboard' && (isAdmin ? <Dashboard setActiveTab={setActiveTab} /> : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
              Acceso restringido: El Dashboard Gerencial está disponible únicamente para el Administrador.
            </div>
          ))}
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

