import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import { getRevisionDashboard, getScheduledAssessments } from '../services/dashboardService';

const studentLinks = [
    { to: '/student', label: 'Dashboard', icon: 'fi fi-rr-home', section: 'main' },
    { to: '/student/subjects', label: 'My Subjects', icon: 'fi fi-rr-book-alt', section: 'main' },
    { to: '/student/manage-revisions', label: 'Revisions', icon: 'fi fi-rr-clipboard-list-check', section: 'main', badgeKey: 'revisions' },
    { to: '/student/assessments', label: 'Assessments', icon: 'fi fi-rr-peseta-sign', section: 'main', badgeKey: 'assessments' },
    { to: '/student/enroll', label: 'Explore', icon: 'fi fi-rr-search', section: 'main' },
    { to: '/chat', label: 'Groups', icon: 'fi fi-rr-users-alt', section: 'tools' },
    { to: '/profile', label: 'Profile', icon: 'fi fi-rr-user', section: 'account' },
];

const instructorLinks = [
    { to: '/instructor', label: 'Dashboard', icon: 'fi fi-rr-home', section: 'main' },
    { to: '/instructor/subjects', label: 'Subjects', icon: 'fi fi-rr-book-alt', section: 'main' },
    { to: '/instructor/enrollments', label: 'Enrollments', icon: 'fi fi-rr-users', section: 'main' },
    { to: '/instructor/analytics', label: 'Analytics', icon: 'fi fi-rr-chart-histogram', section: 'main' },
    { to: '/chat', label: 'Groups', icon: 'fi fi-rr-users-alt', section: 'tools' },
    { to: '/profile', label: 'Profile', icon: 'fi fi-rr-user', section: 'account' },
];

const sectionLabels = { main: 'Main', tools: 'Tools', account: 'Account' };

const sidebarVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
};

function Badge({ count }) {
    if (!count || count === 0) return null;
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 99,
            background: count > 0 ? '#ef4444' : '#f59e0b',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            lineHeight: 1,
            marginLeft: 'auto',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(239,68,68,0.5)',
            animation: 'pulse 2s infinite',
        }}>
            {count > 99 ? '99+' : count}
        </span>
    );
}

function SidebarNavItem({ to, label, icon, end, onClose, badge }) {
    return (
        <motion.div variants={itemVariants}>
            <NavLink
                to={to}
                end={end}
                aria-label={label}
                onClick={onClose}
                style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 10,
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 450,
                    color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                    background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 180ms ease',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(99,102,241,0.3)' : 'none',
                })}
                onMouseEnter={e => {
                    const isActive = e.currentTarget.getAttribute('aria-current');
                    if (!isActive) {
                        e.currentTarget.style.background = 'var(--sidebar-bg-hover)';
                        e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                    }
                }}
                onMouseLeave={e => {
                    const isActive = e.currentTarget.getAttribute('aria-current');
                    if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--sidebar-text)';
                    }
                }}
            >
                {({ isActive }) => (
                    <>
                        {/* Active left glow bar */}
                        {isActive && (
                            <motion.div
                                layoutId="sidebar-glow-bar"
                                style={{
                                    position: 'absolute', left: 0, top: '15%', bottom: '15%',
                                    width: 3, borderRadius: 99,
                                    background: 'var(--sidebar-icon-active)',
                                    boxShadow: '0 0 8px var(--sidebar-active-glow)',
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            />
                        )}
                        <i
                            className={icon}
                            style={{
                                fontSize: '1rem',
                                flexShrink: 0,
                                lineHeight: 1,
                                color: isActive ? 'var(--sidebar-icon-active)' : 'inherit',
                                transition: 'color 180ms ease',
                            }}
                        />
                        <span style={{ letterSpacing: '-0.01em', flex: 1 }}>{label}</span>
                        {badge > 0 && <Badge count={badge} />}
                    </>
                )}
            </NavLink>
        </motion.div>
    );
}

function Sidebar({ role, isOpen, onClose }) {
    const links = role === 'instructor' ? instructorLinks : studentLinks;
    const roleLabel = role === 'instructor' ? 'Instructor' : 'Student';

    const [userName, setUserName] = useState('');
    const initials = userName ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';

    // Badge counts
    const [revisionBadge, setRevisionBadge] = useState(0);
    const [assessmentBadge, setAssessmentBadge] = useState(0);

    useEffect(() => {
        const cached = localStorage.getItem('user_name');
        if (cached) { setUserName(cached); return; }
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserName(decoded.name || decoded.sub || 'User');
            }
        } catch { }
    }, []);

    // Fetch badge counts for student role only
    useEffect(() => {
        if (role !== 'student') return;

        const fetchBadges = async () => {
            try {
                const [revRes, assRes] = await Promise.all([
                    getRevisionDashboard().catch(() => ({ data: [] })),
                    getScheduledAssessments().catch(() => ({ data: [] })),
                ]);
                const revisions = revRes.data || [];
                const assessments = assRes.data || [];

                const revCount = revisions.filter(r =>
                    r.status === 'due_today' || r.status === 'overdue'
                ).length;
                const assCount = assessments.filter(a =>
                    a.date_status === 'today' || a.date_status === 'overdue'
                ).length;

                setRevisionBadge(revCount);
                setAssessmentBadge(assCount);
            } catch { }
        };

        fetchBadges();
        // Refresh badges every 5 minutes
        const interval = setInterval(fetchBadges, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [role]);

    const badgeMap = {
        revisions: revisionBadge,
        assessments: assessmentBadge,
    };

    // Group links by section, preserving first-seen order
    const sections = [];
    const seen = new Set();
    links.forEach(l => {
        if (!seen.has(l.section)) { seen.add(l.section); sections.push(l.section); }
    });

    return (
        <motion.nav
            role="navigation"
            aria-label={`${roleLabel} sidebar navigation`}
            variants={sidebarVariants}
            initial="hidden"
            animate="show"
            className={`sidebar ${isOpen ? 'open' : ''}`}
            style={{
                position: 'fixed',
                top: 'var(--navbar-height)',
                left: 0,
                width: 'var(--sidebar-width)',
                height: 'calc(100vh - var(--navbar-height))',
                background: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--sidebar-border)',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: 999,
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
        >
            {/* Nav sections */}
            <div style={{ flex: 1 }}>
                {sections.map((section, si) => {
                    const sectionLinks = links.filter(l => l.section === section);
                    return (
                        <div key={section} style={{ marginBottom: 4 }}>
                            {/* Section label */}
                            <motion.div
                                variants={itemVariants}
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: 'var(--sidebar-section-label)',
                                    padding: si === 0 ? '4px 12px 6px' : '16px 12px 6px',
                                }}
                            >
                                {sectionLabels[section]}
                            </motion.div>
                            {sectionLinks.map(({ to, label, icon, badgeKey }) => (
                                <SidebarNavItem
                                    key={to}
                                    to={to}
                                    label={label}
                                    icon={icon}
                                    end={to === '/student' || to === '/instructor'}
                                    onClose={onClose}
                                    badge={badgeKey ? badgeMap[badgeKey] : 0}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>


        </motion.nav>
    );
}

export default Sidebar;
