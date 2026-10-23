import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';

export default function LoadingScreen({ message = 'Iniciando sistema...', onRetry, fullScreen = true }) {
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Si la carga tarda más de 3.5 segundos, activamos el aviso de arranque en Render
    const timer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 3500);

    // Animación suave y realista de la barra de progreso
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + (90 - prev) * 0.1 : prev));
    }, 280);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 text-white backdrop-blur-sm animate-fadeIn"
    : "flex flex-col items-center justify-center p-8 min-h-[320px] w-full rounded-2xl bg-slate-900/70 border border-slate-800 text-white backdrop-blur-sm animate-fadeIn relative overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Resplandor de fondo */}
      <div className="absolute w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Logo con Spinner concéntrico */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-full border-3 border-blue-500/20 border-t-blue-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Marca corporativa */}
        <h2 className="text-xl font-extrabold tracking-tight text-white mb-0.5">RV VEGA</h2>
        <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-4">Servicios Generales E.I.R.L.</p>

        {/* Mensaje principal */}
        <p className="text-xs text-slate-300 font-medium mb-3">
          {message}
        </p>

        {/* Barra de progreso fluida */}
        <div className="w-56 bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/60 p-0.5 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Aviso de servidor en reposo (Render Cold-Start) */}
        {showSlowNotice && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 text-left animate-fadeIn mt-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-300 block text-[11px]">Reactivando servidor en la nube...</span>
              <span className="text-[11px] text-slate-300 block leading-tight">
                El backend en Render entra en reposo tras inactividad. Se está despertando automáticamente (puede tomar 20-30 seg).
              </span>
            </div>
          </div>
        )}

        {/* Opción de reintento manual */}
        {showSlowNotice && onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
          >
            Reintentar conexión
          </button>
        )}
      </div>
    </div>
  );
}
