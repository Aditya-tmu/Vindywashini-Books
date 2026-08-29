import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useAppStore();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium ${
          isSuccess
            ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
            : isError
            ? 'bg-rose-950 text-rose-100 border-rose-700'
            : 'bg-slate-900 text-slate-100 border-slate-700'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-400 shrink-0" />}

        <span className="flex-1">{toast.message}</span>

        <button
          onClick={hideToast}
          className="p-1 hover:bg-white/10 rounded transition text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
