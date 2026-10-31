import React from 'react';

export default class ModuleBoundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) return (
            <div role="alert" className="m-4 sm:m-6 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-6 text-slate-800 dark:text-slate-100 space-y-3">
                <h2 className="font-semibold">No se pudo abrir este módulo</h2>
                <p className="text-sm">Comprueba tu conexión. Puedes abrir otra sección o recargar la aplicación para intentarlo de nuevo.</p>
                <button onClick={() => window.location.reload()} className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Recargar aplicación</button>
            </div>
        );
        return this.props.children;
    }
}
