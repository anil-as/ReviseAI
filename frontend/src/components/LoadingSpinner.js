import React from 'react';

function LoadingSpinner({ size = 36, fullPage = false }) {
    const spinner = (
        <div style={{
            width: size, height: size,
            border: '3px solid var(--border-color)',
            borderTop: '3px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
        }} />
    );

    if (!fullPage) return spinner;

    return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-overlay)', zIndex: 9000,
        }}>
            {spinner}
        </div>
    );
}

export default LoadingSpinner;
