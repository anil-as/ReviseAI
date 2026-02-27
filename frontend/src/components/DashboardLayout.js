import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { jwtDecode } from 'jwt-decode';

const THEMES = ['light', 'dark', 'black'];

function DashboardLayout({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [role, setRole] = useState('student');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                setRole(decoded.role || 'student');
            }
        } catch { }
    }, []);

    const cycleTheme = () => {
        setTheme(t => {
            const idx = THEMES.indexOf(t);
            return THEMES[(idx + 1) % THEMES.length];
        });
    };

    const setSpecificTheme = (t) => setTheme(t);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
            <Navbar onThemeToggle={cycleTheme} theme={theme} />
            <Sidebar role={role} currentTheme={theme} onThemeChange={setSpecificTheme} />
            <main style={{
                marginLeft: 'var(--sidebar-width)',
                marginTop: 'var(--navbar-height)',
                padding: 'var(--space-8)',
                minHeight: 'calc(100vh - var(--navbar-height))',
                transition: 'background var(--transition-slow)',
            }}>
                {children}
            </main>
        </div>
    );
}

export default DashboardLayout;
