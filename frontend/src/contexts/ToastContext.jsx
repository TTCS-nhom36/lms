import { useState, useCallback } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { ToastContext } from './toastContext';

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast]);
  const warning = useCallback((msg) => addToast(msg, 'warning'), [addToast]);
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);

  // Apple notifications are typically simple translucent floating capsules
  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-full bg-[rgba(255,255,255,0.85)] backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] animate-slide-up"
          >
            {toast.type === 'success' && <div className="w-6 h-6 rounded-full bg-[#0071e3] text-white flex items-center justify-center"><Check size={14} strokeWidth={3} /></div>}
            {toast.type === 'error' && <div className="w-6 h-6 rounded-full bg-[#e30000] text-white flex items-center justify-center"><X size={14} strokeWidth={3} /></div>}
            {toast.type === 'warning' && <div className="text-[#1d1d1f]"><AlertTriangle size={18} /></div>}
            {toast.type === 'info' && <div className="text-[#0071e3]"><Info size={18} /></div>}
            
            <span className="control-label text-[#1d1d1f] whitespace-nowrap">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
