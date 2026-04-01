import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';
import { getRevisionDashboard, deleteRevision } from '../../services/dashboardService';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getStatusColor(status) {
    if (status === 'overdue') return '#ef4444';
    if (status === 'due_today') return '#f59e0b';
    return '#6366f1';
}

function getMemColor(mem) {
    if (mem >= 0.75) return '#10b981';
    if (mem >= 0.5) return '#f59e0b';
    return '#ef4444';
}

// ── localStorage helpers ──────────────────────────────────────────────────────
// ── localStorage helpers ──────────────────────────────────────────────────────
// Revision STATUS per topic per date: 'full' | 'partial' | '' (not revised)
function getRevStatusKey(topicId, dateStr) { return `rev_status_${topicId}_${dateStr}`; }
function getRevStatus(topicId, dateStr) { return localStorage.getItem(getRevStatusKey(topicId, dateStr)) || ''; }
function setRevStatus(topicId, dateStr, status) {
    const key = getRevStatusKey(topicId, dateStr);
    if (status) localStorage.setItem(key, status);
    else localStorage.removeItem(key);
}

// Per-TOPIC note for a specific date
function getTopicNoteKey(topicId, dateStr) { return `rev_note_topic_${topicId}_${dateStr}`; }
function getTopicNote(topicId, dateStr) { return localStorage.getItem(getTopicNoteKey(topicId, dateStr)) || ''; }
function saveTopicNote(topicId, dateStr, text) {
    const key = getTopicNoteKey(topicId, dateStr);
    if (text.trim()) localStorage.setItem(key, text);
    else localStorage.removeItem(key);
}

// Global date note (kept for the day-level notes panel)
function getNoteKey(dateStr) { return `revise_note_${dateStr}`; }
function getNote(dateStr) { return localStorage.getItem(getNoteKey(dateStr)) || ''; }
function saveNote(dateStr, text) {
    if (text.trim()) localStorage.setItem(getNoteKey(dateStr), text);
    else localStorage.removeItem(getNoteKey(dateStr));
}

// isDone = any status set (used for calendar dot colouring)
function isDone(topicId, dateStr) { return !!getRevStatus(topicId, dateStr); }

// ── Full Calendar Component ───────────────────────────────────────────────────
function RevisionCalendar({ topicsForSubject, onDeleteTopic, navigate }) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
    const [, forceUpdate] = useState(0);
    const [noteText, setNoteText] = useState(() => getNote(today.toISOString().slice(0, 10)));
    const [noteEditing, setNoteEditing] = useState(false);
    // Per-topic note editing state: { [topicId]: boolean }
    const [topicNoteEditing, setTopicNoteEditing] = useState({});
    const [topicNoteTexts, setTopicNoteTexts] = useState({});

    const todayStr = today.toISOString().slice(0, 10);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build date → topics map
    const dateMap = {};
    topicsForSubject.forEach(rev => {
        const d = (rev.next_revision_date || '').slice(0, 10);
        if (!d) return;
        if (!dateMap[d]) dateMap[d] = [];
        dateMap[d].push(rev);
    });

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const handleSelectDate = (dateStr) => {
        setSelectedDate(dateStr);
        setNoteText(getNote(dateStr));
        setNoteEditing(false);
        setTopicNoteEditing({});
        setTopicNoteTexts({});
    };

    const handleSetRevStatus = (topicId, status) => {
        setRevStatus(topicId, selectedDate, status);
        forceUpdate(n => n + 1);
    };

    const openTopicNote = (topicId) => {
        setTopicNoteTexts(prev => ({ ...prev, [topicId]: getTopicNote(topicId, selectedDate) }));
        setTopicNoteEditing(prev => ({ ...prev, [topicId]: true }));
    };
    const saveTopicNoteLocal = (topicId) => {
        saveTopicNote(topicId, selectedDate, topicNoteTexts[topicId] || '');
        setTopicNoteEditing(prev => ({ ...prev, [topicId]: false }));
        forceUpdate(n => n + 1);
    };

    const handleSaveNote = () => {
        saveNote(selectedDate, noteText);
        setNoteEditing(false);
        forceUpdate(n => n + 1);
    };

    const selectedTopics = dateMap[selectedDate] || [];
    const savedNote = getNote(selectedDate);

    // Build grid cells
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div style={{ display: 'flex', gap: 24, height: '100%', minHeight: 500 }}>
            {/* ── Calendar Grid ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Month nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <button onClick={prevMonth} style={navBtnStyle}>‹</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{MONTHS[month]}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{year}</div>
                    </div>
                    <button onClick={nextMonth} style={navBtnStyle}>›</button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                    {DAYS.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
                    {cells.map((day, idx) => {
                        if (!day) return <div key={`e-${idx}`} />;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = dateStr === todayStr;
                        const isSel = dateStr === selectedDate;
                        const dayTopics = dateMap[dateStr] || [];
                        const hasWork = dayTopics.length > 0;
                        const statusList = dayTopics.map(t => t.status);
                        const dotColor = statusList.includes('overdue') ? '#ef4444'
                            : statusList.includes('due_today') ? '#f59e0b'
                                : hasWork ? '#6366f1' : null;
                        const hasNote = !!getNote(dateStr);
                        const allDone = hasWork && dayTopics.every(t => isDone(t.topic_id, dateStr));

                        return (
                            <button
                                key={dateStr}
                                onClick={() => handleSelectDate(dateStr)}
                                title={`${dateStr}${dayTopics.length ? ` — ${dayTopics.length} revision${dayTopics.length > 1 ? 's' : ''}` : ''}`}
                                style={{
                                    height: 52,
                                    borderRadius: 10,
                                    background: isSel ? 'var(--color-primary)'
                                        : allDone ? 'rgba(16,185,129,0.12)'
                                            : isToday ? 'var(--bg-surface-2)' : 'transparent',
                                    border: isSel ? '2px solid var(--color-primary)'
                                        : isToday ? '1.5px solid var(--color-primary)'
                                            : allDone ? '1.5px solid rgba(16,185,129,0.5)'
                                                : '1.5px solid transparent',
                                    color: isSel ? '#fff' : 'var(--text-primary)',
                                    fontWeight: isToday || isSel ? 800 : 500,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 3,
                                    transition: 'all 120ms',
                                    padding: '4px 2px',
                                    position: 'relative',
                                }}
                            >
                                <span>{day}</span>
                                <div style={{ display: 'flex', gap: 2 }}>
                                    {dotColor && (
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.85)' : dotColor }} />
                                    )}
                                    {hasNote && (
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.6)' : '#a3e635' }} />
                                    )}
                                </div>
                                {allDone && !isSel && (
                                    <div style={{ position: 'absolute', top: 3, right: 4, fontSize: '0.55rem', color: '#10b981' }}>✓</div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
                    {[
                        { color: '#ef4444', label: 'Overdue' },
                        { color: '#f59e0b', label: 'Due today' },
                        { color: '#6366f1', label: 'Upcoming' },
                        { color: '#a3e635', label: 'Has note' },
                        { color: '#10b981', label: 'Completed' },
                    ].map(({ color, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                            {label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Day Detail Panel ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedDate}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        width: 320, flexShrink: 0,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 16,
                        padding: '20px 18px',
                        display: 'flex', flexDirection: 'column', gap: 14,
                        overflowY: 'auto', maxHeight: 560,
                    }}
                >
                    {/* Date header */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                            {selectedDate === todayStr ? '📅 Today' : selectedDate < todayStr ? '📂 Past' : '🔮 Upcoming'}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>

                    {/* Revisions for this day */}
                    {selectedTopics.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {selectedTopics.length} Revision{selectedTopics.length > 1 ? 's' : ''}
                            </div>
                            {selectedTopics.map(rev => {
                                const revStatus = getRevStatus(rev.topic_id, selectedDate);
                                const mem = Math.round((rev.memory_strength || 0) * 100);
                                const topicNote = getTopicNote(rev.topic_id, selectedDate);
                                const isEditingNote = topicNoteEditing[rev.topic_id];

                                // Card background based on status
                                const cardBg = revStatus === 'full' ? 'rgba(16,185,129,0.07)'
                                    : revStatus === 'partial' ? 'rgba(245,158,11,0.06)'
                                        : 'var(--bg-surface-2)';
                                const cardBorder = revStatus === 'full' ? 'rgba(16,185,129,0.35)'
                                    : revStatus === 'partial' ? 'rgba(245,158,11,0.35)'
                                        : 'var(--border-color)';

                                return (
                                    <div
                                        key={rev.topic_id}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 12,
                                            background: cardBg,
                                            border: `1px solid ${cardBorder}`,
                                            transition: 'all 200ms',
                                        }}
                                    >
                                        {/* Topic header row */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                                            {/* Status icon */}
                                            <div style={{
                                                width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                                                background: revStatus === 'full' ? '#10b981'
                                                    : revStatus === 'partial' ? '#f59e0b' : 'var(--bg-surface)',
                                                border: `2px solid ${revStatus === 'full' ? '#10b981' : revStatus === 'partial' ? '#f59e0b' : 'var(--border-color)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontSize: '0.7rem',
                                            }}>
                                                {revStatus === 'full' ? '✓' : revStatus === 'partial' ? '~' : ''}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 700, fontSize: '0.87rem', color: 'var(--text-primary)',
                                                    textDecoration: revStatus === 'full' ? 'line-through' : 'none',
                                                    opacity: revStatus === 'full' ? 0.6 : 1,
                                                    marginBottom: 5, wordBreak: 'break-word',
                                                }}>
                                                    {rev.topic_title}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 56, height: 4, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                                                        <div style={{ width: `${mem}%`, height: '100%', background: getMemColor(rev.memory_strength), borderRadius: 4 }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: getMemColor(rev.memory_strength), fontWeight: 700 }}>{mem}%</span>
                                                    <span style={{
                                                        fontSize: '0.67rem', fontWeight: 700,
                                                        padding: '2px 6px', borderRadius: 6,
                                                        background: `${getStatusColor(rev.status)}15`,
                                                        color: getStatusColor(rev.status),
                                                    }}>
                                                        {rev.status === 'overdue' ? 'Overdue' : rev.status === 'due_today' ? 'Today' : 'Upcoming'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Revision status picker ── */}
                                        <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                                            {[
                                                { id: 'full', label: '✓ Fully Revised', activeColor: '#10b981' },
                                                { id: 'partial', label: '~ Partially', activeColor: '#f59e0b' },
                                                { id: '', label: '✕ Not Yet', activeColor: '#94a3b8' },
                                            ].map(opt => {
                                                const isActive = revStatus === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => handleSetRevStatus(rev.topic_id, opt.id)}
                                                        title={opt.label}
                                                        style={{
                                                            flex: 1, padding: '5px 4px',
                                                            borderRadius: 7, fontSize: '0.68rem', fontWeight: 700,
                                                            border: `1.5px solid ${isActive ? opt.activeColor : 'var(--border-color)'}`,
                                                            background: isActive ? `${opt.activeColor}15` : 'var(--bg-surface)',
                                                            color: isActive ? opt.activeColor : 'var(--text-muted)',
                                                            cursor: 'pointer', transition: 'all 130ms',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* ── Per-topic note ── */}
                                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 8 }}>
                                            {isEditingNote ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <textarea
                                                        value={topicNoteTexts[rev.topic_id] || ''}
                                                        onChange={e => setTopicNoteTexts(prev => ({ ...prev, [rev.topic_id]: e.target.value }))}
                                                        placeholder={`Notes for "${rev.topic_title}"…`}
                                                        rows={3}
                                                        autoFocus
                                                        style={{
                                                            width: '100%', boxSizing: 'border-box',
                                                            padding: '8px 10px', borderRadius: 8,
                                                            border: '1.5px solid var(--color-primary)',
                                                            background: 'var(--bg-surface)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '0.8rem', lineHeight: 1.5, resize: 'vertical',
                                                            fontFamily: 'inherit',
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 5 }}>
                                                        <button onClick={() => saveTopicNoteLocal(rev.topic_id)}
                                                            style={{ flex: 1, padding: '5px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700, background: '#6366f115', color: '#6366f1', border: '1px solid #6366f130', cursor: 'pointer' }}>
                                                            Save Note
                                                        </button>
                                                        <button onClick={() => setTopicNoteEditing(prev => ({ ...prev, [rev.topic_id]: false }))}
                                                            style={{ flex: 1, padding: '5px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : topicNote ? (
                                                <div
                                                    onClick={() => openTopicNote(rev.topic_id)}
                                                    style={{
                                                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                                                        background: 'rgba(163,230,53,0.07)',
                                                        border: '1px solid rgba(163,230,53,0.25)',
                                                        fontSize: '0.78rem', color: 'var(--text-secondary)',
                                                        lineHeight: 1.5, whiteSpace: 'pre-wrap',
                                                    }}
                                                    title="Click to edit note"
                                                >
                                                    {topicNote}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openTopicNote(rev.topic_id)}
                                                    style={{
                                                        width: '100%', padding: '5px', borderRadius: 7,
                                                        fontSize: '0.72rem', fontWeight: 600,
                                                        color: 'var(--text-muted)', background: 'none',
                                                        border: '1px dashed var(--border-color)',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                                    }}
                                                >
                                                    <i className="fi fi-rr-add" style={{ fontSize: '0.7rem' }} /> Add topic note…
                                                </button>
                                            )}
                                        </div>

                                        {/* Remove only */}
                                        <div style={{ marginTop: 8 }}>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Remove this topic from your revision schedule?')) {
                                                        onDeleteTopic(rev.topic_id);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%', padding: '5px', borderRadius: 7,
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                                                    border: '1px solid rgba(239,68,68,0.2)',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                }}
                                            >
                                                <i className="fi fi-rr-trash" style={{ fontSize: '0.7rem' }} /> Remove from schedule
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '20px 0' }}>
                            <i className="fi fi-rr-calendar" style={{ fontSize: '1.5rem', marginBottom: 8, display: 'block' }} />
                            No revisions on this day
                        </div>
                    )}


                    {/* Notes section */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                📝 Notes
                            </div>
                            {!noteEditing && (
                                <button
                                    onClick={() => setNoteEditing(true)}
                                    style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    {savedNote ? 'Edit' : '+ Add'}
                                </button>
                            )}
                        </div>

                        {noteEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <textarea
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder="e.g. Covered chapters 1–3, key formula: F = ma…"
                                    rows={4}
                                    autoFocus
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        padding: '10px 12px', borderRadius: 10,
                                        border: '1.5px solid var(--color-primary)',
                                        background: 'var(--bg-surface-2)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.83rem', lineHeight: 1.6, resize: 'vertical',
                                        fontFamily: 'inherit',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={handleSaveNote} style={{ flex: 1, ...actionBtn('#6366f1') }}>Save</button>
                                    <button onClick={() => { setNoteEditing(false); setNoteText(savedNote); }} style={{ flex: 1, ...actionBtn('#64748b') }}>Cancel</button>
                                </div>
                            </div>
                        ) : savedNote ? (
                            <div style={{
                                padding: '10px 12px', borderRadius: 10,
                                background: 'rgba(163,230,53,0.07)',
                                border: '1px solid rgba(163,230,53,0.3)',
                                fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                            }}>
                                {savedNote}
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No notes yet. Click + Add to jot something down.
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

const navBtnStyle = {
    width: 34, height: 34, borderRadius: 9,
    background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const actionBtn = (color) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '5px 0', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700,
    background: `${color}12`, color, border: `1px solid ${color}30`,
    cursor: 'pointer', transition: 'all 150ms',
});

// ── Main Page ─────────────────────────────────────────────────────────────────
function ManageRevisionsPage() {
    const [allRevisions, setAllRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const toast = useToast();
    const navigate = useNavigate();

    const fetchRevisions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getRevisionDashboard();
            setAllRevisions(res.data || []);
        } catch {
            toast('Failed to load revisions', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        document.title = 'Revisions — ReviseAI';
        fetchRevisions();
    }, [fetchRevisions]);

    const handleDelete = async (topicId) => {
        try {
            await deleteRevision(topicId);
            toast('Revision removed', 'success');
            setAllRevisions(prev => prev.filter(r => r.topic_id !== topicId));
        } catch {
            toast('Failed to remove revision', 'error');
        }
    };

    // Group by subject
    const subjectMap = {};
    allRevisions.forEach(rev => {
        const key = rev.subject_id || 'personal';
        const label = rev.subject_title || 'Personal Topics';
        if (!subjectMap[key]) subjectMap[key] = { subject_id: key, subject_title: label, revisions: [] };
        subjectMap[key].revisions.push(rev);
    });
    const subjects = Object.values(subjectMap);

    // Auto-select first subject
    useEffect(() => {
        if (subjects.length > 0 && selectedSubjectId === null) {
            setSelectedSubjectId(subjects[0].subject_id);
        }
    }, [subjects.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedSubject = subjects.find(s => s.subject_id === selectedSubjectId);
    const selectedRevisions = selectedSubject?.revisions || [];

    // Badge counts per subject
    const getBadgeCount = (revisions) =>
        revisions.filter(r => r.status === 'due_today' || r.status === 'overdue').length;

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
                            width: 44, height: 44, borderRadius: 14, background: 'var(--color-primary)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                        }}>
                            <i className="fi fi-rr-clipboard-list-check" />
                        </div>
                        Revisions
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                        Select a subject to view your revision calendar. Mark sessions complete and add notes.
                    </p>
                </div>

                {subjects.length === 0 ? (
                    <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <i className="fi fi-rr-folder-open" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', display: 'block', marginBottom: 16 }} />
                        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No revisions tracked</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Add topics from My Subjects and take assessments to build your revision schedule.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

                        {/* ── Subject List ─────────────────────────────── */}
                        <div style={{
                            width: 270, flexShrink: 0,
                            display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, paddingLeft: 4 }}>
                                Subjects
                            </div>
                            {subjects.map(sub => {
                                const isActive = sub.subject_id === selectedSubjectId;
                                const badge = getBadgeCount(sub.revisions);
                                return (
                                    <motion.button
                                        key={sub.subject_id}
                                        onClick={() => setSelectedSubjectId(sub.subject_id)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: 12,
                                            background: isActive ? 'var(--color-primary)' : 'var(--bg-surface)',
                                            border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                            color: isActive ? '#fff' : 'var(--text-primary)',
                                            fontWeight: 600, fontSize: '0.88rem',
                                            cursor: 'pointer', textAlign: 'left',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            transition: 'all 180ms',
                                        }}
                                    >
                                        <i className="fi fi-rr-book-alt" style={{ fontSize: '0.9rem', flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {sub.subject_title}
                                        </span>
                                        {badge > 0 && (
                                            <span style={{
                                                minWidth: 18, height: 18, padding: '0 5px',
                                                borderRadius: 99, fontSize: '0.65rem', fontWeight: 800,
                                                background: isActive ? 'rgba(255,255,255,0.25)' : '#ef4444',
                                                color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>{badge}</span>
                                        )}
                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{sub.revisions.length}t</span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* ── Calendar View ────────────────────────────── */}
                        <div className="card" style={{ flex: 1, padding: 24 }}>
                            {selectedSubject ? (
                                <>
                                    <div style={{ marginBottom: 20 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                                            {selectedSubject.subject_title}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {selectedRevisions.length} topic{selectedRevisions.length !== 1 ? 's' : ''} · Click a date to view revisions, mark complete, and add notes
                                        </div>
                                    </div>
                                    <RevisionCalendar
                                        topicsForSubject={selectedRevisions}
                                        onDeleteTopic={handleDelete}
                                        navigate={navigate}
                                    />
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
                                    Select a subject to view its calendar
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

export default ManageRevisionsPage;
