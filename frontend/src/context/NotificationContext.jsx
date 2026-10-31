import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);
const styles = {
    success: { title: 'Operación completada', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
    error: { title: 'No se pudo completar', icon: AlertCircle, color: 'text-red-600 dark:text-red-400' },
    info: { title: 'Información', icon: Info, color: 'text-blue-600 dark:text-blue-400' }
};

function Notice({ notice, dismiss }) {
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        // Errors remain visible until dismissed; other notices allow time to read.
        if (paused || notice.type === 'error') return;
        const timer = setTimeout(() => dismiss(notice.id), 7000);
        return () => clearTimeout(timer);
    }, [notice.id, notice.type, paused, dismiss]);
    const { title, icon: Icon, color } = styles[notice.type];
    return <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl text-slate-800 dark:text-slate-100">
        <Icon aria-hidden="true" className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
        <div className="min-w-0 flex-1" role={notice.type === 'error' ? 'alert' : 'status'}>
            <p className={`text-sm font-semibold ${color}`}>{title}</p>
            <p className="mt-1 text-sm whitespace-pre-line break-words">{notice.message}</p>
        </div>
        <button type="button" aria-label="Cerrar notificación" onClick={() => dismiss(notice.id)} className="shrink-0 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500"><X className="w-4 h-4" /></button>
    </div>;
}

export function NotificationProvider({ children }) {
    const [notices, setNotices] = useState([]);
    const sequence = useRef(0);
    const dismiss = useCallback(id => setNotices(items => items.filter(item => item.id !== id)), []);
    const notify = useCallback((message, type = 'info') => {
        const notice = { id: ++sequence.current, message: String(message), type: styles[type] ? type : 'info' };
        setNotices(items => [...items, notice]);
    }, []);
    return <NotificationContext.Provider value={notify}>
        {children}
        <section aria-label="Notificaciones" className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[2000] pointer-events-none flex flex-col gap-3 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            {notices.map(notice => <Notice key={notice.id} notice={notice} dismiss={dismiss} />)}
        </section>
    </NotificationContext.Provider>;
}

export function useNotifications() {
    return useContext(NotificationContext);
}
