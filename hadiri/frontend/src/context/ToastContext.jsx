import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [activeDialog, setActiveDialog] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newToast = {
        id,
        type,
        title: title || (type === 'success' ? 'Berhasil' : type === 'error' ? 'Kesalahan' : type === 'warning' ? 'Perhatian' : 'Informasi'),
        message: typeof message === 'object' ? JSON.stringify(message) : String(message || ''),
        duration,
        createdAt: Date.now(),
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  // Modern Dialog API (Promise-based for alert, confirm, prompt)
  const dialog = useRef({
    alert: (messageOrOptions, title) => {
      const options =
        typeof messageOrOptions === 'string'
          ? { message: messageOrOptions, title }
          : messageOrOptions || {};

      return new Promise((resolve) => {
        setActiveDialog({
          type: 'alert',
          title: options.title || 'Informasi',
          message: typeof options.message === 'object' ? JSON.stringify(options.message) : String(options.message || ''),
          confirmText: options.confirmText || 'Mengerti',
          variant: options.variant || options.type || 'info',
          resolve: () => {
            setActiveDialog(null);
            resolve(true);
          },
        });
      });
    },

    confirm: (messageOrOptions, title) => {
      const options =
        typeof messageOrOptions === 'string'
          ? { message: messageOrOptions, title }
          : messageOrOptions || {};

      return new Promise((resolve) => {
        setActiveDialog({
          type: 'confirm',
          title: options.title || 'Konfirmasi Tindakan',
          message: typeof options.message === 'object' ? JSON.stringify(options.message) : String(options.message || ''),
          confirmText: options.confirmText || 'Ya, Lanjutkan',
          cancelText: options.cancelText || 'Batal',
          variant: options.variant || options.type || 'warning',
          resolve: (result) => {
            setActiveDialog(null);
            resolve(Boolean(result));
          },
        });
      });
    },

    prompt: (messageOrOptions, defaultValue = '') => {
      const options =
        typeof messageOrOptions === 'string'
          ? { message: messageOrOptions, defaultValue }
          : messageOrOptions || {};

      return new Promise((resolve) => {
        setActiveDialog({
          type: 'prompt',
          title: options.title || 'Input Diperlukan',
          message: typeof options.message === 'object' ? JSON.stringify(options.message) : String(options.message || ''),
          placeholder: options.placeholder || 'Ketik di sini...',
          defaultValue: options.defaultValue || '',
          confirmText: options.confirmText || 'Kirim',
          cancelText: options.cancelText || 'Batal',
          required: Boolean(options.required),
          variant: options.variant || options.type || 'info',
          resolve: (result) => {
            setActiveDialog(null);
            resolve(result); // string or null
          },
        });
      });
    },
  }).current;

  // Intercept standard window.alert globally to use modern toast
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg) => {
        const text = typeof msg === 'object' ? JSON.stringify(msg) : String(msg ?? '');
        addToast({
          type: 'info',
          title: 'Notifikasi Sistem',
          message: text,
        });
      };
      return () => {
        window.alert = originalAlert;
      };
    }
  }, [addToast]);

  const toast = useCallback(
    (message, options = {}) => {
      return addToast({ message, ...options });
    },
    [addToast]
  );

  toast.success = (message, title, duration) =>
    addToast({ type: 'success', message, title, duration });

  toast.error = (message, title, duration) =>
    addToast({ type: 'error', message, title, duration });

  toast.warning = (message, title, duration) =>
    addToast({ type: 'warning', message, title, duration });

  toast.info = (message, title, duration) =>
    addToast({ type: 'info', message, title, duration });

  // Attach dialog methods to toast for maximum developer convenience
  toast.alert = dialog.alert;
  toast.confirm = dialog.confirm;
  toast.prompt = dialog.prompt;
  toast.dialog = dialog;

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast, dialog }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      {activeDialog && <ModernDialogModal dialog={activeDialog} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

export function useDialog() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useDialog must be used within a ToastProvider');
  }
  return context.dialog;
}

/**
 * Toast Container & Notification Item (Toastr Style)
 */
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastItem({ item, onDismiss }) {
  const { type, title, message, duration } = item;

  const typeConfig = {
    success: {
      border: 'border-emerald-200 dark:border-emerald-800/80',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
      progressBar: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    error: {
      border: 'border-rose-200 dark:border-rose-800/80',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400',
      progressBar: 'bg-rose-500',
      icon: XCircle,
    },
    warning: {
      border: 'border-amber-200 dark:border-amber-800/80',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
      progressBar: 'bg-amber-500',
      icon: AlertTriangle,
    },
    info: {
      border: 'border-blue-200 dark:border-blue-800/80',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
      progressBar: 'bg-blue-500',
      icon: Info,
    },
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`pointer-events-auto w-full rounded-2xl shadow-xl backdrop-blur-md border ${config.border} ${config.bg} p-3.5 sm:p-4 flex flex-col gap-2 relative overflow-hidden transition-all animate-slideDown`}
      style={{
        animationDuration: '0.25s',
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 pr-2">
          {title && (
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h4>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${config.progressBar}`}
            style={{
              animation: `toastProgress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Modern Dialog Modal (Drop-in replacement for alert(), confirm(), prompt())
 */
function ModernDialogModal({ dialog }) {
  const {
    type,
    title,
    message,
    placeholder,
    defaultValue,
    confirmText,
    cancelText,
    variant = 'info',
    resolve,
  } = dialog;

  const [inputValue, setInputValue] = useState(defaultValue || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [type]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (type === 'prompt') resolve(null);
      else if (type === 'confirm') resolve(false);
      else resolve(true);
    } else if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    if (type === 'prompt') {
      resolve(inputValue);
    } else if (type === 'confirm') {
      resolve(true);
    } else {
      resolve(true);
    }
  };

  const handleCancel = () => {
    if (type === 'prompt') {
      resolve(null);
    } else {
      resolve(false);
    }
  };

  const variantConfig = {
    danger: {
      icon: XCircle,
      iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400',
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20',
    },
    info: {
      icon: Info,
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400',
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20',
    },
  };

  const currentVariant = variantConfig[variant] || variantConfig.info;
  const VariantIcon = currentVariant.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp transition-all">
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl shrink-0 ${currentVariant.iconBg}`}>
            <VariantIcon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Input box for prompt dialog */}
        {type === 'prompt' && (
          <div className="pt-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {type !== 'alert' && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all active:scale-95"
            >
              {cancelText || 'Batal'}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${currentVariant.confirmBtn}`}
          >
            {confirmText || 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
