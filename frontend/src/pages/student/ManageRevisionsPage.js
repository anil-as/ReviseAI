import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';
import { getRevisionDashboard, deleteRevision } from '../../services/dashboardService';

function ManageRevisionsPage() {
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const toast = useToast();
    const navigate = useNavigate();

    const fetchRevisions = async () => {
        try {
            setLoading(true);
            const res = await getRevisionDashboard();
            setRevisions(res.data);
        } catch (error) {
            toast('Failed to load revisions', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = "Manage Revisions — ReviseAI";
        fetchRevisions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async (topicId) => {
        const confirmed = window.confirm(
            "Are you sure you want to remove this topic from your revision schedule completely?"
        );
        if (!confirmed) return;

        try {
            setDeletingId(topicId);
            await deleteRevision(topicId);
            toast('Revision schedule removed successfully', 'success');
            setRevisions((prev) => prev.filter((r) => r.topic_id !== topicId));
        } catch (err) {
            toast('Failed to delete revision', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'overdue':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Overdue' };
            case 'due_today':
                return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Due Today' };
            case 'upcoming':
                return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Upcoming' };
            default:
                return { bg: 'var(--bg-surface-2)', color: 'var(--text-secondary)', label: status };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <LoadingSpinner size={40} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14, background: 'var(--color-primary)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                            }}>
                                <i className="fi fi-rr-clipboard-list-check" />
                            </div>
                            Manage Revisions
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                            Review your upcoming and postponed revision tasks. You can also stop tracking specific topics here.
                        </p>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {revisions.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-surface-2)', color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 16px'
                            }}>
                                <i className="fi fi-rr-folder-open" />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>No revisions tracked</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
                                Enroll in subjects and take assessments to begin building your revision schedule.
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topic</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Memory</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Postponed</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revisions.map((rev) => {
                                        const statusStyle = getStatusStyles(rev.status);
                                        const memoryPct = Math.round(rev.memory_strength * 100);

                                        return (
                                            <tr key={rev.topic_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-surface-hover)' } }}>
                                                {/* Topic Name */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                                        {rev.topic_title}
                                                    </div>
                                                </td>

                                                {/* Status Badge */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 6,
                                                        background: statusStyle.bg, color: statusStyle.color, fontSize: '0.8rem', fontWeight: 700
                                                    }}>
                                                        {statusStyle.label}
                                                    </span>
                                                </td>

                                                {/* Memory Strength bar */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    {!rev.last_revision_date ? (
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                            Unassessed
                                                        </span>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ width: 80, height: 6, background: 'var(--bg-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                                                                <div style={{ width: `${memoryPct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 4 }} />
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                                {memoryPct}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Schedule Dates */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                        Next: {formatDate(rev.next_revision_date)}
                                                    </div>
                                                    {rev.last_revision_date && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                            Last: {formatDate(rev.last_revision_date)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Postpone Count/Logs */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <i className="fi fi-rr-time-past" style={{ color: rev.postpone_count > 0 ? '#f59e0b' : 'var(--text-muted)' }} />
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: rev.postpone_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                            {rev.postpone_count} time{rev.postpone_count !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                                        <button
                                                            onClick={() => navigate(`/student/assessment/${rev.topic_id}`)}
                                                            className="btn-ghost"
                                                            style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--color-primary)' }}
                                                            title="Launch Assessment"
                                                        >
                                                            <i className="fi fi-rr-play" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(rev.topic_id)}
                                                            className="btn-ghost"
                                                            style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444' }}
                                                            disabled={deletingId === rev.topic_id}
                                                            title="Remove Revision"
                                                        >
                                                            {deletingId === rev.topic_id ? (
                                                                <i className="fi fi-rr-spinner fi-spin" />
                                                            ) : (
                                                                <i className="fi fi-rr-trash" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default ManageRevisionsPage;
