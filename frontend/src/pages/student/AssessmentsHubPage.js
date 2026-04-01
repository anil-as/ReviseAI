import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';
import { getScheduledAssessments, getRevisionDashboard } from '../../services/dashboardService';

const TAB_OPTIONS = [
    { id: 'today', label: 'Today', icon: 'fi fi-rr-calendar-day' },
    { id: 'upcoming', label: 'Upcoming', icon: 'fi fi-rr-calendar-clock' },
    { id: 'past', label: 'Past Results', icon: 'fi fi-rr-chart-line-up' },
];

function statusPill(date_status) {
    switch (date_status) {
        case 'today': return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Due Today' };
        case 'overdue': return { bg: 'rgba(239,68,68,0.10)', color: '#ef4444', label: 'Overdue' };
        case 'soon': return { bg: 'rgba(99,102,241,0.10)', color: '#6366f1', label: 'Soon' };
        default: return { bg: 'rgba(16,185,129,0.10)', color: '#10b981', label: 'Upcoming' };
    }
}

function memLabel(mem) {
    if (mem >= 0.75) return { label: 'Strong', color: '#10b981' };
    if (mem >= 0.5) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Weak', color: '#ef4444' };
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Today Tab ─────────────────────────────────────────────────────────────────
function TodayTab({ items, navigate }) {
    if (items.length === 0) return (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <i className="fi fi-rr-check-circle" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 14, color: '#10b981' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--text-primary)' }}>All clear for today!</div>
            <div style={{ fontSize: '0.85rem' }}>No assessments due today for this subject.</div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map(item => (
                <motion.div
                    key={item.topic_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{ padding: '20px 22px', border: '2px solid rgba(245,158,11,0.4)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                                {item.topic_title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {item.subject_title}
                            </div>
                        </div>
                        <span style={{
                            padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800,
                            background: '#f59e0b20', color: '#f59e0b', flexShrink: 0,
                        }}>📅 Due Today</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.round((item.memory_strength || 0.5) * 100)}%`,
                                height: '100%',
                                background: memLabel(item.memory_strength).color,
                                borderRadius: 4,
                            }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: memLabel(item.memory_strength).color, flexShrink: 0 }}>
                            {memLabel(item.memory_strength).label} · {Math.round((item.memory_strength || 0.5) * 100)}%
                        </span>
                    </div>
                    <button
                        onClick={() => navigate(`/student/assessment/${item.topic_id}`)}
                        style={{
                            width: '100%', padding: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: 10,
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'opacity 150ms',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        <i className="fi fi-rr-play" /> Start Assessment →
                    </button>
                </motion.div>
            ))}
        </div>
    );
}

// ── Upcoming Tab ──────────────────────────────────────────────────────────────
function UpcomingTab({ items }) {
    if (items.length === 0) return (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <i className="fi fi-rr-calendar" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 14 }} />
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>No upcoming assessments</div>
            <div style={{ fontSize: '0.85rem' }}>Complete today's assessments to schedule more.</div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => {
                const pill = statusPill(item.date_status);
                return (
                    <motion.div
                        key={item.topic_id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 18px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 12,
                        }}
                    >
                        {/* Countdown circle */}
                        <div style={{
                            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                            background: `${pill.color}15`,
                            border: `2px solid ${pill.color}40`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '1rem', fontWeight: 900, color: pill.color, lineHeight: 1 }}>
                                {item.days_until <= 0 ? '!' : item.days_until}
                            </span>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                                {item.days_until <= 0 ? 'now' : 'd'}
                            </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.topic_title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {formatDate(item.assessment_date)} · {item.subject_title}
                            </div>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: pill.bg, color: pill.color, flexShrink: 0 }}>
                            {pill.label}
                        </span>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ── Past Results Tab ──────────────────────────────────────────────────────────
function PastTab({ subjectRevisions }) {
    // Build past history from revision progress records that have been assessed (have last_revision_date)
    const assessed = subjectRevisions.filter(r => r.last_revision_date);

    if (assessed.length === 0) return (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <i className="fi fi-rr-chart-line-up" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 14 }} />
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>No past results yet</div>
            <div style={{ fontSize: '0.85rem' }}>Complete an assessment to see your history here.</div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {assessed.length} assessed topic{assessed.length !== 1 ? 's' : ''}
            </div>
            {assessed
                .sort((a, b) => new Date(b.last_revision_date) - new Date(a.last_revision_date))
                .map((item, i) => {
                    const mem = Math.round((item.memory_strength || 0.5) * 100);
                    const ml = memLabel(item.memory_strength);
                    return (
                        <motion.div
                            key={item.topic_id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr auto',
                                gap: 12, alignItems: 'center',
                                padding: '14px 18px',
                                background: 'var(--bg-surface)',
                                border: `1px solid ${ml.color}30`,
                                borderLeft: `4px solid ${ml.color}`,
                                borderRadius: 12,
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 5 }}>
                                    {item.topic_title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 80, height: 5, background: 'var(--bg-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${mem}%`, height: '100%', background: ml.color, borderRadius: 4 }} />
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ml.color }}>{mem}% memory</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Last: {new Date(item.last_revision_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: '50%',
                                    background: `${ml.color}12`,
                                    border: `2px solid ${ml.color}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, fontSize: '0.88rem', color: ml.color,
                                }}>
                                    {mem}%
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AssessmentsHubPage() {
    const navigate = useNavigate();
    const toast = useToast();

    const [assessments, setAssessments] = useState([]);
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [activeTab, setActiveTab] = useState('today');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [assRes, revRes] = await Promise.all([
                getScheduledAssessments().catch(() => ({ data: [] })),
                getRevisionDashboard().catch(() => ({ data: [] })),
            ]);
            setAssessments(assRes.data || []);
            setRevisions(revRes.data || []);
        } catch {
            toast('Failed to load assessments', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        document.title = 'Assessments — ReviseAI';
        fetchData();
    }, [fetchData]);

    // Group assessments by subject
    const subjectMap = {};
    assessments.forEach(a => {
        const key = a.subject_id || 'personal';
        const label = a.subject_title || 'Personal Topics';
        if (!subjectMap[key]) subjectMap[key] = { subject_id: key, subject_title: label, assessments: [] };
        subjectMap[key].assessments.push(a);
    });
    const subjects = Object.values(subjectMap);

    // Auto-select first subject
    useEffect(() => {
        if (subjects.length > 0 && selectedSubjectId === null) {
            setSelectedSubjectId(subjects[0].subject_id);
        }
    }, [subjects.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedSubject = subjects.find(s => s.subject_id === selectedSubjectId);
    const subjectAssessments = selectedSubject?.assessments || [];

    // Tabs content
    const todayItems = subjectAssessments.filter(a => a.date_status === 'today' || a.date_status === 'overdue');
    const upcomingItems = subjectAssessments.filter(a => a.date_status === 'soon' || a.date_status === 'upcoming');

    // Past results come from revisions (have been assessed already)
    const subjectRevisions = revisions.filter(r => r.subject_id === selectedSubjectId);

    // Subject badge = today + overdue count
    const getSubjectBadge = (subjectAssessments) =>
        subjectAssessments.filter(a => a.date_status === 'today' || a.date_status === 'overdue').length;

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <LoadingSpinner size={40} />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="animate-fadeIn" style={{ padding: '0 8px' }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 14,
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem'
                        }}>
                            <i className="fi fi-rr-peseta-sign" />
                        </div>
                        Assessments
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                        View scheduled assessments, start today's tests, and review past performance.
                    </p>
                </div>

                {subjects.length === 0 ? (
                    <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <i className="fi fi-rr-peseta-sign" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', display: 'block', marginBottom: 16 }} />
                        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No assessments scheduled</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Complete revisions to generate assessment schedules.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

                        {/* ── Subject List ─────────────────────────────── */}
                        <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, paddingLeft: 4 }}>
                                Subjects
                            </div>
                            {subjects.map(sub => {
                                const isActive = sub.subject_id === selectedSubjectId;
                                const badge = getSubjectBadge(sub.assessments);
                                return (
                                    <motion.button
                                        key={sub.subject_id}
                                        onClick={() => setSelectedSubjectId(sub.subject_id)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        style={{
                                            width: '100%', padding: '12px 14px', borderRadius: 12,
                                            background: isActive ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'var(--bg-surface)',
                                            border: `1.5px solid ${isActive ? 'transparent' : 'var(--border-color)'}`,
                                            color: isActive ? '#fff' : 'var(--text-primary)',
                                            fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                                            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                                            transition: 'all 180ms',
                                        }}
                                    >
                                        <i className="fi fi-rr-book-alt" style={{ fontSize: '0.9rem', flexShrink: 0 }} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {sub.subject_title}
                                        </span>
                                        {badge > 0 && (
                                            <span style={{
                                                minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
                                                fontSize: '0.65rem', fontWeight: 800,
                                                background: isActive ? 'rgba(255,255,255,0.25)' : '#ef4444',
                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>{badge}</span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* ── Detail Panel ─────────────────────────────── */}
                        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                            {/* Tabs */}
                            <div style={{
                                display: 'flex', borderBottom: '1px solid var(--border-color)',
                                padding: '0 20px',
                            }}>
                                {TAB_OPTIONS.map(tab => {
                                    const count = tab.id === 'today' ? todayItems.length
                                        : tab.id === 'upcoming' ? upcomingItems.length
                                            : subjectRevisions.filter(r => r.last_revision_date).length;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            style={{
                                                padding: '16px 18px', background: 'none', border: 'none',
                                                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                                                fontWeight: isActive ? 700 : 500, fontSize: '0.87rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                                                borderBottom: isActive ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                                                transition: 'all 150ms', marginBottom: '-1px',
                                            }}
                                        >
                                            <i className={tab.icon} style={{ fontSize: '0.85rem' }} />
                                            {tab.label}
                                            {count > 0 && (
                                                <span style={{
                                                    minWidth: 16, height: 16, padding: '0 4px',
                                                    borderRadius: 99, fontSize: '0.6rem', fontWeight: 800,
                                                    background: tab.id === 'today' ? '#ef4444' : 'var(--bg-surface-2)',
                                                    color: tab.id === 'today' ? '#fff' : 'var(--text-secondary)',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                }}>{count}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tab content */}
                            <div style={{ padding: 22 }}>
                                {selectedSubject && (
                                    <div style={{ marginBottom: 18 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {selectedSubject.subject_title}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {subjectAssessments.length} assessment{subjectAssessments.length !== 1 ? 's' : ''} scheduled
                                        </div>
                                    </div>
                                )}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab + '_' + selectedSubjectId}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        {activeTab === 'today' && <TodayTab items={todayItems} navigate={navigate} />}
                                        {activeTab === 'upcoming' && <UpcomingTab items={upcomingItems} />}
                                        {activeTab === 'past' && <PastTab subjectRevisions={subjectRevisions} />}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

export default AssessmentsHubPage;
