import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationContext';
import { logout } from '../services/auth';

function Navbar({ onMenuClick }) {
    const navigate = useNavigate();
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const { notifications, clearNotification, clearAll } = useNotifications();

    // Hide navbar gracefully on scroll down, show on scroll up (Aceternity style)
    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 100) {
            setHidden(false); // Keep it visible for now since we have popovers
        }
    });

    const handleLogout = () => { logout(); navigate('/'); };

    const handleNotifClick = (n) => {
        setShowNotifs(false);
        if (n.type === 'study') {
            navigate(`/student/subjects/${n.originalData.subject_id}/topics`);
        } else {
            navigate(`/student/assessment/${n.originalData.topic_id}`);
        }
    };

    return (
        <motion.div
            role="banner"
            aria-label="ReviseAI main navigation"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: 60,
                background: 'rgba(255, 255, 255, 0.85)',
                borderBottom: '1px solid var(--border-color)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                justifyContent: 'space-between',
                zIndex: 1000,
                boxShadow: 'var(--shadow-sm)',
            }}
        >
            {/* ── Left side (Mobile Toggle + Logo) ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {/* Mobile hamburger */}
                <motion.button
                    className="mobile-menu-btn"
                    onClick={onMenuClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                        background: 'var(--bg-surface-2)', color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)', cursor: 'pointer', display: 'none',
                        width: 34, height: 34, borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Toggle navigation menu"
                >
                    <i className="fi fi-rr-menu-burger" style={{ fontSize: '1rem', lineHeight: 1 }} />
                </motion.button>

                {/* Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <img 
                        src="/logo.svg" 
                        alt="ReviseAI" 
                        style={{ 
                            width: 34, 
                            height: 34, 
                            objectFit: 'contain'
                        }} 
                    />
                    <span style={{
                        fontFamily: '"Outfit", sans-serif',
                        fontWeight: 800, fontSize: '1.25rem',
                        letterSpacing: '-0.02em',
                        color: 'var(--text-primary)',
                    }}>
                        ReviseAI
                    </span>
                </Link>
            </div>

            {/* ── Right side ── */}
            <nav role="navigation" aria-label="User actions"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                <div style={{ position: 'relative' }}>
                    <motion.button
                        onClick={() => setShowNotifs(!showNotifs)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        aria-label="Notifications"
                        style={{
                            background: showNotifs ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)', 
                            border: '1px solid var(--border-color)',
                            color: showNotifs ? 'var(--text-primary)' : 'var(--text-secondary)', 
                            width: 38, height: 38,
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', position: 'relative',
                            transition: 'all 200ms ease',
                        }}
                    >
                        <i className="fi fi-rr-bell" style={{ fontSize: '1.05rem', lineHeight: 1 }} />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute', top: -2, right: -2,
                                minWidth: 18, height: 18, borderRadius: 9,
                                background: '#f43f5e', color: 'white',
                                fontSize: '0.65rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid white'
                            }}>
                                {notifications.length}
                            </span>
                        )}
                    </motion.button>

                    <AnimatePresence>
                        {showNotifs && (
                            <>
                                <div 
                                    style={{ position: 'fixed', inset: 0, zIndex: -1 }} 
                                    onClick={() => setShowNotifs(false)} 
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    style={{
                                        position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                                        width: 320, maxHeight: 400,
                                        background: 'white', borderRadius: 20,
                                        border: '1px solid var(--border-color)',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                        overflow: 'hidden', zIndex: 1001,
                                        display: 'flex', flexDirection: 'column'
                                    }}
                                >
                                    <div style={{ 
                                        padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Notifications</span>
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); clearAll(); }}
                                                style={{ 
                                                    background: 'none', border: 'none', color: 'var(--color-primary)',
                                                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                Clear All
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <i className="fi fi-rr-smile" style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }} />
                                                <span style={{ fontSize: '0.85rem' }}>All caught up!</span>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div 
                                                    key={n.id}
                                                    onClick={() => handleNotifClick(n)}
                                                    style={{
                                                        padding: '12px 16px', borderRadius: 14,
                                                        display: 'flex', gap: 12, alignItems: 'start',
                                                        cursor: 'pointer', transition: 'background 0.2s',
                                                        marginBottom: 4, position: 'relative'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        background: n.type === 'study' ? 'rgba(99,102,241,0.1)' : n.type === 'assessment' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                                                        color: n.type === 'study' ? 'var(--color-primary)' : n.type === 'assessment' ? 'var(--color-success)' : '#fbbf24',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                    }}>
                                                        <i className={n.type === 'study' ? 'fi fi-rr-book' : n.type === 'assessment' ? 'fi fi-rr-document' : 'fi fi-rr-calendar'} style={{ fontSize: '0.8rem' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {n.title}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            {n.subtitle}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }}
                                                        style={{ 
                                                            background: 'none', border: 'none', color: 'var(--text-muted)',
                                                            padding: 4, cursor: 'pointer', opacity: 0.5
                                                        }}
                                                    >
                                                        <i className="fi fi-rr-cross-small" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                                        <Link to="/student/manage-revisions" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}>
                                            View All Tasks
                                        </Link>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>


                {/* Divider */}
                <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 4px' }} />

                {/* Logout */}
                <motion.button
                    onClick={handleLogout}
                    aria-label="Log out"
                    title="Log out"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    style={{
                        background: 'rgba(239,68,68,0.1)', color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.2)',
                        width: 38, height: 38, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0,
                        transition: 'all 200ms ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(239,68,68,0.3)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <i className="fi fi-rr-sign-out-alt" style={{ fontSize: '1.05rem', lineHeight: 1, paddingLeft: 2 }} />
                </motion.button>
            </nav>
        </motion.div>
    );
}

export default Navbar;

