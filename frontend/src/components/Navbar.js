import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logout } from '../services/auth';
import { jwtDecode } from 'jwt-decode';

function Navbar({ onThemeToggle, theme }) {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserName(decoded.name || decoded.sub || 'User');
            }
        } catch { }
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = () => { logout(); navigate('/'); };
    const initials = userName ? userName.charAt(0).toUpperCase() : 'U';

    const themeIcon = theme === 'black' ? 'fi fi-sr-sun' : theme === 'dark' ? 'fi fi-sr-sun' : 'fi fi-sr-moon';
    const themeTitle = theme === 'light' ? 'Switch to Dark' : theme === 'dark' ? 'Switch to Black' : 'Switch to Light';

    return (
        <header
            role="banner"
            aria-label="ReviseAI main navigation"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                height: 'var(--navbar-height)',
                background: 'var(--bg-navbar)',
                borderBottom: '1px solid var(--border-color)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                display: 'flex', alignItems: 'center',
                padding: '0 28px',
                justifyContent: 'space-between',
                zIndex: 1000,
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
                boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
            }}
        >
            {/* ── Logo ── */}
            <Link
                to="/"
                aria-label="ReviseAI home"
                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
            >
                <img
                    src="/logo.svg"
                    alt="ReviseAI logo"
                    style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(41,97,255,0.35)' }}
                />
                <span style={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 800, fontSize: '1.25rem',
                    letterSpacing: '-0.02em',
                    color: 'var(--text-navbar)',
                }}>
                    Revise<span style={{ color: 'var(--color-primary)' }}>AI</span>
                </span>
            </Link>

            {/* ── Right side ── */}
            <nav role="navigation" aria-label="User actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                {/* Theme toggle */}
                <button
                    onClick={onThemeToggle}
                    aria-label={themeTitle}
                    title={themeTitle}
                    style={{
                        background: 'var(--bg-surface-2)',
                        color: 'var(--text-secondary)',
                        width: 36, height: 36,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid var(--border-color)',
                        cursor: 'pointer', flexShrink: 0,
                        transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-light)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <i className={themeIcon} style={{ fontSize: '0.95rem', lineHeight: 1 }} />
                </button>

                {/* User avatar chip — links to profile */}
                <Link
                    to="/profile"
                    title="View Profile"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--color-primary-light)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '5px 14px 5px 6px',
                        border: '1.5px solid var(--avatar-border)',
                        textDecoration: 'none',
                        transition: 'background 150ms, box-shadow 150ms',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(41,97,255,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                    }}>{initials}</div>
                    <span style={{
                        fontSize: '0.85rem', fontWeight: 600,
                        color: 'var(--text-navbar)',
                        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{userName}</span>
                </Link>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    aria-label="Log out of ReviseAI"
                    title="Log out"
                    style={{
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        width: 36, height: 36,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid var(--border-color)',
                        cursor: 'pointer', flexShrink: 0,
                        transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#b91c1c'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                    <i className="fi fi-rr-sign-out-alt" style={{ fontSize: '0.95rem', lineHeight: 1 }} />
                </button>
            </nav>
        </header>
    );
}

export default Navbar;
