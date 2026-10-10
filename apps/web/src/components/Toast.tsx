import React, { useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ToastContext, type ToastItem, type ToastType } from './ToastContext';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, title }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-card p-4 shadow-lg border flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200 bg-white',
              toast.type === 'success' && 'border-emerald-200 text-slate-800',
              toast.type === 'error' && 'border-red-200 text-slate-800',
              toast.type === 'info' && 'border-brand-blue-200 text-slate-800',
            )}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-brand-terracotta shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && <Info className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />}

            <div className="flex-1 text-sm">
              {toast.title && (
                <div className="font-semibold text-brand-dark mb-0.5">{toast.title}</div>
              )}
              <div className="text-slate-600">{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 rounded p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
