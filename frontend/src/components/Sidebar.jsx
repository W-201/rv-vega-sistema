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

export default function Sidebar({ activeTab, setActiveTab }) {
    const { user, logout } = useAuth();
    const rol = user?.rol === 'jefe_produccion' ? 'produccion' : (user?.rol || 'operario');

    // Definición de módulos con sus permisos por rol (OE5)
    // El Dashboard Gerencial está restringido exclusivamente para administradores
    const allMenuItems = [
        { id: 'dashboard', label: 'Dashboard Gerencial', icon: LayoutDashboard, roles: ['admin'] },
        { id: 'clientes', label: 'Gestión de Clientes', icon: Users, roles: ['admin', 'ventas'] },
        { id: 'pedidos', label: 'Gestión de Pedidos', icon: ShoppingBag, roles: ['admin', 'ventas', 'produccion'] },
        { id: 'produccion', label: 'Planificación / Producción', icon: Hammer, roles: ['admin', 'produccion', 'operario'] },
        { id: 'inventario', label: 'Control de Inventario', icon: Boxes, roles: ['admin', 'produccion'] },
        { id: 'reportes', label: 'Reportes Gerenciales', icon: FileSpreadsheet, roles: ['admin', 'produccion', 'ventas'] },
        { id: 'bi', label: 'Inteligencia de Negocios (BI)', icon: LineChart, roles: ['admin'] },
        { id: 'ai', label: 'Módulo Asistencia con IA', icon: Bot, highlight: true, roles: ['admin', 'produccion', 'ventas'] }
    ];

    // Filtrar los módulos según el rol del usuario autenticado
    const menuItems = allMenuItems.filter(item => item.roles.includes(rol));

    return (
        <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 shadow-2xl z-20 min-h-screen">
            {/* Brand Header */}
            <div className="p-5 border-b border-slate-800 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">RV VEGA</h1>
                    <p className="text-xs text-blue-400 font-medium">Servicios Generales E.I.R.L.</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
                <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
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
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : item.highlight
                                        ? 'text-amber-300 hover:bg-slate-800/80 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
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
            <div className="p-4 border-t border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-semibold text-sm">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                        <div className="truncate">
                            <p className="text-xs font-semibold text-white truncate">{user?.nombre || 'Usuario'}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-medium capitalize">
                                <ShieldCheck className="w-3 h-3" />
                                {user?.rol?.replace('_', ' ') || 'Operario'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        title="Cerrar Sesión"
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}