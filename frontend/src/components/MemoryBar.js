import React from 'react';

function MemoryBar({ value = 0, showLabel = true, isNew = false }) {
    const pct = isNew ? 0 : Math.round((value || 0) * 100);

    const getColor = (v) => {
        if (isNew) return 'var(--text-muted)';
        if (v >= 0.8) return 'var(--color-success)';
        if (v >= 0.6) return '#84cc16';
        if (v >= 0.4) return 'var(--color-warning)';
        if (v >= 0.2) return '#f97316';
        return 'var(--color-danger)';
    };

    const getLabel = (v) => {
        if (isNew) return 'Unassessed';
        if (v >= 0.8) return 'Strong';
        if (v >= 0.6) return 'Good';
        if (v >= 0.4) return 'Fair';
        if (v >= 0.2) return 'Weak';
        return 'Critical';
    };

    return (
        <div>
            {showLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Memory: {getLabel(value)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: getColor(value), fontWeight: 700 }}>
                        {isNew ? '—' : `${pct}%`}
                    </span>
                </div>
            )}
            <div style={{
                height: 6, background: 'var(--bg-surface-2)',
                borderRadius: 99, overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: isNew ? '100%' : `${pct}%`,
                    background: isNew ? 'var(--bg-surface-2)' : getColor(value),
                    borderRadius: 99,
                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
        </div>
    );
}

export default MemoryBar;
