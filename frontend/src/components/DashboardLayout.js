import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { jwtDecode } from 'jwt-decode';
import { AnimatePresence, motion } from 'framer-motion';
import PageTransition from './PageTransition';

function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [role, setRole] = useState('student');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 769);

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                setRole(decoded.role || 'student');
            }
        } catch { }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 769;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false); // close overlay when switching to desktop
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(prev => !prev);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
            <Navbar onMenuClick={toggleSidebar} />

            {/* Sidebar — always visible on desktop, slide-in overlay on mobile */}
            <Sidebar
                role={role}
                isOpen={isMobile ? sidebarOpen : true}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Mobile-only backdrop with Framer Motion */}
            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.6)', zIndex: 998,
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />
                )}
            </AnimatePresence>

            <main className="dashboard-main" style={{
                transition: 'background var(--transition-slow)',
            }}>
                <AnimatePresence mode="wait">
                    <PageTransition>
                        {children}
                    </PageTransition>
                </AnimatePresence>
            </main>
        </div>
    );
}

export default DashboardLayout;
