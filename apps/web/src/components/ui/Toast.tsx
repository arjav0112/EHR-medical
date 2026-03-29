'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms — undefined = persistent (error)
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { border: string; icon: string; iconBg: string; label: string }
> = {
  success: {
    border: 'border-l-[#10B981]',
    icon: '✓',
    iconBg: 'bg-[#D1FAE5] text-[#059669]',
    label: 'text-[#065F46]',
  },
  error: {
    border: 'border-l-[#EF4444]',
    icon: '✕',
    iconBg: 'bg-red-100 text-[#EF4444]',
    label: 'text-[#7F1D1D]',
  },
  warning: {
    border: 'border-l-[#F59E0B]',
    icon: '⚠',
    iconBg: 'bg-amber-100 text-[#D97706]',
    label: 'text-[#78350F]',
  },
  info: {
    border: 'border-l-[#6c63ff]',
    icon: '✦',
    iconBg: 'bg-[#EDE9FF] text-[#6c63ff]',
    label: 'text-[#3730A3]',
  },
};

// ─── Individual Toast ─────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const cfg = VARIANT_CONFIG[toast.variant];

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    if (toast.duration) {
      const d = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, toast.duration);
      return () => { clearTimeout(t); clearTimeout(d); };
    }
    return () => clearTimeout(t);
  }, [toast.duration, onDismiss]);

  return (
    <div
      className={`
        flex items-start gap-3 bg-white border border-[#E0DDD6] border-l-4 ${cfg.border}
        rounded-xl shadow-lg px-4 py-3 w-[340px] transition-all duration-300
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${cfg.iconBg}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold leading-snug ${cfg.label}`}>{toast.message}</p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-[12px] text-[#6c63ff] font-medium mt-1 hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="text-[#9CA3AF] hover:text-[#1A1A1A] text-[16px] leading-none flex-shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { ...opts, id }];
      // Max 3 stacked
      return next.slice(-3);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Portal — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Pre-built toast helpers ──────────────────────────────────────────────────

export function useClinicalToasts() {
  const { toast } = useToast();
  return {
    sectionApproved: (section: string) =>
      toast({ message: `${section} approved`, variant: 'success', duration: 2000 }),

    revisionComplete: (section: string) =>
      toast({
        message: `${section} revised — review and approve`,
        variant: 'info',
        duration: 3000,
      }),

    sectionInvalidated: (section: string, onReview: () => void) =>
      toast({
        message: `${section} needs re-review`,
        variant: 'warning',
        duration: 4000,
        action: { label: 'Review now', onClick: onReview },
      }),

    exportSuccess: (format: 'PDF' | 'FHIR' | 'text') =>
      toast({ message: `${format} downloaded`, variant: 'success', duration: 2000 }),

    apiError: (message: string) =>
      toast({ message, variant: 'error' }), // persistent
  };
}
