import React from 'react';
import { NavLink } from 'react-router-dom';

const studentLinks = [
    { to: '/student', label: 'Dashboard', icon: 'fi fi-rr-home' },
    { to: '/student/subjects', label: 'My Subjects', icon: 'fi fi-rr-book-alt' },
    { to: '/student/manage-revisions', label: 'Manage Revisions', icon: 'fi fi-rr-clipboard-list-check' },
    { to: '/student/enroll', label: 'Explore', icon: 'fi fi-rr-search' },
    { to: '/chat', label: 'Chat', icon: 'fi fi-rr-comment' },
    { to: '/profile', label: 'Profile', icon: 'fi fi-rr-user' },
];

const instructorLinks = [
    { to: '/instructor', label: 'Dashboard', icon: 'fi fi-rr-home' },
    { to: '/instructor/subjects', label: 'Subjects', icon: 'fi fi-rr-book-alt' },
    { to: '/instructor/enrollments', label: 'Enrollments', icon: 'fi fi-rr-users' },
    { to: '/instructor/analytics', label: 'Analytics', icon: 'fi fi-rr-chart-histogram' },
    { to: '/chat', label: 'Chat', icon: 'fi fi-rr-comment' },
    { to: '/profile', label: 'Profile', icon: 'fi fi-rr-user' },
];

function Sidebar({ role, currentTheme, onThemeChange }) {
    const links = role === 'instructor' ? instructorLinks : studentLinks;
    const roleLabel = role === 'instructor' ? 'Instructor' : 'Student';

    const linkStyle = (isActive) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        fontSize: '0.88rem',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--color-primary-light)' : 'transparent',
        textDecoration: 'none',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
        border: isActive ? '1.5px solid var(--avatar-border)' : '1.5px solid transparent',
    });

    const THEMES = [
        { id: 'light', icon: 'fi fi-sr-brightness', title: 'Light' },
        { id: 'dark', icon: 'fi fi-sr-moon', title: 'Dark' },
        { id: 'black', icon: 'fi fi-sr-circle-xmark', title: 'Black' },
    ];

    return (
        <nav
            role="navigation"
            aria-label={`${roleLabel} sidebar navigation`}
            style={{
                position: 'fixed',
                top: 'var(--navbar-height)',
                left: 0,
                width: 'var(--sidebar-width)',
                height: 'calc(100vh - var(--navbar-height))',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border-color)',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
                zIndex: 999,
            }}
        >
            {/* Role badge */}
            <div style={{
                fontSize: '0.65rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--color-primary)',
                padding: '4px 14px 14px',
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                <i className={role === 'instructor' ? 'fi fi-rr-chalkboard-user' : 'fi fi-rr-graduation-cap'}
                    style={{ fontSize: '0.85rem' }} />
                {roleLabel}
            </div>

            {/* Main nav */}
            {links.map(({ to, label, icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/student' || to === '/instructor'}
                    aria-label={label}
                    style={({ isActive }) => linkStyle(isActive)}
                    onMouseEnter={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                    onMouseLeave={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background = linkStyle(false).background; }}
                >
                    <i className={icon} style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1 }} />
                    <span>{label}</span>
                </NavLink>
            ))}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Settings link */}
            <NavLink
                to="/settings"
                aria-label="Settings"
                style={({ isActive }) => linkStyle(isActive)}
                onMouseEnter={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                onMouseLeave={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background = 'transparent'; }}
            >
                <i className="fi fi-rr-settings" style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1 }} />
                <span>Settings</span>
            </NavLink>

            {/* Theme switcher */}
            <div style={{
                display: 'flex', gap: 6, justifyContent: 'center',
                padding: '10px 14px 4px',
            }}>
                {THEMES.map(t => (
                    <button
                        key={t.id}
                        title={`${t.title} theme`}
                        onClick={() => onThemeChange?.(t.id)}
                        style={{
                            flex: 1, height: 32, borderRadius: 8,
                            background: currentTheme === t.id ? 'var(--color-primary-light)' : 'var(--bg-surface-2)',
                            border: currentTheme === t.id ? '1.5px solid var(--color-primary)' : '1.5px solid var(--border-color)',
                            color: currentTheme === t.id ? 'var(--color-primary)' : 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700,
                            transition: 'all 150ms',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <i className={t.icon} style={{ fontSize: '0.85rem', lineHeight: 1 }} />
                    </button>
                ))}
            </div>
        </nav>
    );
}

export default Sidebar;
