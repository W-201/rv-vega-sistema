import React from 'react';
import {
    LayoutDashboard,
    Users,
    ShoppingBag,
    Hammer,
    Boxes,
    FileSpreadsheet,
    LineChart,
    Bot,
    LogOut,
    ShieldCheck,
    Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({ activeTab, setActiveTab }) {
    const { user, logout } = useAuth();
    const rol = user?.rol || 'admin';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard Gerencial', icon: LayoutDashboard },
        { id: 'clientes', label: 'Gestión de Clientes', icon: Users },
        { id: 'pedidos', label: 'Gestión de Pedidos', icon: ShoppingBag },
        { id: 'produccion', label: 'Planificación / Producción', icon: Hammer },
        { id: 'inventario', label: 'Control de Inventario', icon: Boxes },
        { id: 'reportes', label: 'Reportes Gerenciales', icon: FileSpreadsheet },
        { id: 'bi', label: 'Inteligencia de Negocios (BI)', icon: LineChart },
        { id: 'ai', label: 'Módulo Asistencia con IA', icon: Bot, highlight: true }
    ];

    return (
        <aside className="w-72 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex flex-col flex-shrink-0 shadow-lg dark:shadow-2xl z-20 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
            {/* Brand Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-shrink-0">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight">RV VEGA</h1>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Servicios Generales E.I.R.L.</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
                <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-400 uppercase">
                    Módulos del Sistema ({rol.toUpperCase()})
                </div>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                                    : item.highlight
                                        ? 'text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800/80 hover:text-amber-700 dark:hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-400'}`} />
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.highlight && (
                                <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                                    IA
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex-shrink-0 transition-colors duration-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                        <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{user?.nombre || 'Usuario'}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium capitalize">
                                <ShieldCheck className="w-3 h-3" />
                                {user?.rol?.replace('_', ' ') || 'Administrador'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <ThemeToggle variant="simple" />
                        <button
                            onClick={logout}
                            title="Cerrar Sesión"
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}