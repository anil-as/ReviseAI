import React, { useEffect } from 'react';

function Modal({ isOpen, onClose, title, children, maxWidth = 500 }) {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                background: 'var(--bg-overlay)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 8000, padding: 16,
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 200ms ease',
            }}
            onClick={onClose}
        >
            <div
                className="card animate-scaleIn"
                style={{
                    width: '100%', maxWidth,
                    padding: '28px 28px',
                    position: 'relative',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-surface-2)', color: 'var(--text-secondary)',
                            width: 32, height: 32, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}

export default Modal;
