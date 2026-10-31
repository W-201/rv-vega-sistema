import React from 'react';
import { Calendar, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header({ title, subtitle, onOpenMenu, menuOpen }) {
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sticky top-0 z-10 transition-colors duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onOpenMenu} aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="mobile-navigation" className="lg:hidden shrink-0 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500"><Menu className="w-5 h-5" /></button>
        <div className="min-w-0">
        <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle || 'Gestión Integral de Producción y Pedidos'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Planta Operativa</span>
        </div>

        {/* Date Display */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
          <span className="capitalize">{today}</span>
        </div>

        {/* Theme Switcher Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
