import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@rvvega.com');
  const [password, setPassword] = useState('Admin123*');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative">
      {/* Botón flotante de cambio de tema */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-slate-800 transition-colors duration-200">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">RV VEGA</h1>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">Servicios Generales E.I.R.L.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Sistema de Gestión de Producción, Pedidos y Eficiencia Operativa</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Correo Corporativo</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@rvvega.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
