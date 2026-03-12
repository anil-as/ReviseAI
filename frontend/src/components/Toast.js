import React, { useState, useCallback, useContext, createContext, useEffect, useRef } from 'react';

/* ── Context ── */
export const ToastContext = createContext(null);

/* ── Provider ── */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const remove = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <ToastContainer toasts={toasts} onRemove={remove} />
        </ToastContext.Provider>
    );
}

/* ── Hook ── */
export function useToast() { return useContext(ToastContext); }

/* ── Config ── */
const TOAST_CONFIG = {
    success: {
        icon: "✓",
        bg: "linear-gradient(135deg, #10b981, #059669)",
        border: "#34d399",
        label: "Success",
    },
    error: {
        icon: "✕",
        bg: "linear-gradient(135deg, #ef4444, #dc2626)",
        border: "#f87171",
        label: "Error",
    },
    warning: {
        icon: "!",
        bg: "linear-gradient(135deg, #f59e0b, #d97706)",
        border: "#fcd34d",
        label: "Warning",
    },
    info: {
        icon: "i",
        bg: "linear-gradient(135deg, #2961FF, #6366f1)",
        border: "#818cf8",
        label: "Info",
    },
};

/* ── Container ── */
function ToastContainer({ toasts, onRemove }) {
    return (
        <div style={{
            position: 'fixed', bottom: 28, right: 28,
            display: 'flex', flexDirection: 'column-reverse', gap: 12,
            zIndex: 99999, pointerEvents: 'none',
            maxWidth: 380,
        }}>
            {toasts.map(t => (
                <Toast key={t.id} toast={t} onRemove={onRemove} />
            ))}
        </div>
    );
}

/* ── Single Toast ── */
function Toast({ toast, onRemove }) {
    const cfg = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(100);
    const startRef = useRef(null);
    const rafRef = useRef(null);
    const duration = toast.duration || 4500;

    // Slide in
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), 320);
    }, [onRemove, toast.id]);

    // Progress bar countdown
    useEffect(() => {
        startRef.current = performance.now();
        const tick = (now) => {
            const elapsed = now - startRef.current;
            const pct = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(pct);
            if (pct > 0) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                handleDismiss();
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [duration, handleDismiss]);

    return (
        <div
            role="alert"
            aria-live="assertive"
            onClick={handleDismiss}
            style={{
                pointerEvents: 'all', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)',
                transform: visible ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.96)',
                opacity: visible ? 1 : 0,
                transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1), opacity 280ms ease',
                minWidth: 280, maxWidth: 360,
            }}
        >
            {/* Top stripe */}
            <div style={{ background: cfg.bg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Icon bubble */}
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '0.95rem', color: '#fff', flexShrink: 0,
                }}>
                    {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: 2, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {cfg.label}
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.93rem', lineHeight: 1.45 }}>
                        {toast.message}
                    </div>
                </div>
                {/* Close × */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                    aria-label="Dismiss notification"
                    style={{
                        background: 'rgba(255,255,255,0.2)', border: 'none',
                        color: '#fff', borderRadius: '50%',
                        width: 24, height: 24, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', cursor: 'pointer',
                    }}>✕</button>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(0,0,0,0.06)' }}>
                <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: cfg.bg,
                    transition: 'width 80ms linear',
                }} />
            </div>
        </div>
    );
}

export default ToastProvider;
