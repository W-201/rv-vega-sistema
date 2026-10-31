import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function MobileMenu({ open, onClose, activeTab, onNavigate }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    const media = window.matchMedia('(min-width: 1024px)');
    const handleResize = () => { if (media.matches) onClose(); };
    media.addEventListener('change', handleResize);
    return () => media.removeEventListener('change', handleResize);
  }, [open, onClose]);

  return (
    <dialog ref={dialogRef} id="mobile-navigation" aria-label="Menú principal" onCancel={onClose} onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50">
      <div className="relative w-72 max-w-[90vw] h-full">
        <button autoFocus type="button" onClick={onClose} aria-label="Cerrar menú" className="absolute right-1 top-1 z-30 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500"><X className="w-5 h-5" /></button>
        <Sidebar activeTab={activeTab} setActiveTab={tab => { onNavigate(tab); onClose(); }} />
      </div>
    </dialog>
  );
}
