import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/Toast';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import CalendarWidget from '../../components/CalendarWidget';
import PdfViewerModal from '../../components/PdfViewerModal';
import AnimatedCounter from '../../components/bits/AnimatedCounter';
import FadeIn from '../../components/bits/FadeIn';
import GlowCard from '../../components/bits/GlowCard';
import { StaggerList, StaggerItem } from '../../components/bits/StaggerList';
import Spotlight from '../../components/bits/Spotlight';
import { getRevisionDashboard, getScheduledAssessments, getCalendarData, postponeRevision } from '../../services/dashboardService';
import { getAssessmentInfo } from '../../services/assessmentService';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const STATUS_CFG = {
    overdue:   { dot: "#818cf8", label: "STUDY",    gradient: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05))", border: "rgba(99,102,241,0.3)" },
    due_today: { dot: "#6366f1", label: "STUDY",    gradient: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05))", border: "rgba(99,102,241,0.35)" },
    upcoming:  { dot: "#10b981", label: "UPCOMING", gradient: "transparent",                                                            border: "var(--border-color)" },
};

// ─────────────────────────────────────────────
// ASSESSMENT INFO MODAL
// ─────────────────────────────────────────────
function AssessmentInfoModal({ item, info, onClose, onStart }) {
    const Q_TYPE_META = {
        mcq:             { label: "Multiple Choice", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
        true_false:      { label: "True / False",    color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
        fill_blank:      { label: "Fill in Blank",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
        short_answer:    { label: "Short Answer",    color: "#34d399", bg: "rgba(52,211,153,0.12)" },
        long_answer:     { label: "Long Answer",     color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
        diagram_question:{ label: "Diagram",         color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
        code_question:   { label: "Code",            color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
        application:     { label: "Application",     color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
        cunning:         { label: "Think Carefully", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
                style={{
                    maxWidth: 500, width: "100%",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 20, overflow: "hidden",
                    boxShadow: "var(--shadow-lg)",
                }}
            >
                <div style={{
                    background: "var(--bg-surface-3)",
                    borderBottom: "1px solid var(--border-color)",
                    padding: "20px 22px",
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                }}>
                    <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                            Assessment Instructions
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)" }}>{item.topic_title}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 3 }}>{item.subject_title}</div>
                    </div>
                    <button onClick={onClose} style={{
                        background: "transparent", border: "1px solid var(--border-color)",
                        borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "var(--text-secondary)",
                        display: "flex", alignItems: "center",
                    }}><i className="fi fi-rr-cross" style={{fontSize: 14}}/></button>
                </div>

                <div style={{ padding: "20px 22px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                        {[
                            { label: "Questions", value: info?.total_questions ?? "—", icon: <i className="fi fi-rr-clipboard" style={{fontSize: 15}}/>, color: "var(--color-primary)" },
                            { label: "Est. Time",  value: info?.estimated_minutes ? `~${info.estimated_minutes}m` : "—", icon: <i className="fi fi-rr-time-fast" style={{fontSize: 15}}/>, color: "var(--color-success)" },
                        ].map(s => (
                            <div key={s.label} style={{
                                padding: "12px 14px",
                                background: "var(--bg-surface-3)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 12,
                                display: "flex", alignItems: "center", gap: 10,
                            }}>
                                <div style={{ color: s.color }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: "1.2rem", color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {info?.question_types?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                                Question Types
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {info.question_types.map(qt => {
                                    const m = Q_TYPE_META[qt.type] || { label: qt.label, color: "#818cf8", bg: "rgba(129,140,248,0.12)" };
                                    return (
                                        <span key={qt.type} style={{
                                            padding: "4px 11px", borderRadius: 99, fontSize: "0.88rem", fontWeight: 700,
                                            background: m.bg, color: m.color,
                                            border: `1px solid ${m.color}30`,
                                        }}>
                                            {m.label} × {qt.count}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div style={{
                        padding: "11px 14px", borderRadius: 10,
                        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)",
                        fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16,
                    }}>
                        <div style={{ fontWeight: 700, color: "#818cf8", marginBottom: 6, fontSize: "0.7rem", textTransform: "uppercase" }}>📌 How it works</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                            <li>Navigate freely between questions using the number grid</li>
                            <li>Submit any time — unanswered questions score 0</li>
                            <li>Rate your confidence for better spaced-repetition scheduling</li>
                        </ul>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={onClose} style={{
                            flex: 1, padding: "11px", borderRadius: 10,
                            border: "1px solid var(--border-color)", background: "transparent",
                            color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                        }}>Cancel</button>
                        <button onClick={onStart} className="btn-primary" style={{ flex: 2, padding: "11px", fontSize: "0.95rem" }}>
                            Start Assessment →
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─────────────────────────────────────────────
// REVISION CARD
// ─────────────────────────────────────────────
function RevisionCard({ item, onViewPdf }) {
    const s = STATUS_CFG[item.status] || STATUS_CFG.upcoming;

    return (
        <Spotlight spotlightColor={s.dot + "20"}>
            <article className={`rev-card status-${item.status}`} style={{ border: "none", padding: "16px 18px", background: "var(--bg-surface-2)", borderRadius: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 3px", lineHeight: 1.3 }}>
                            {item.topic_title}
                        </h3>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="fi fi-rr-book" style={{fontSize: 10}}/> Recommended Study
                        </div>
                    </div>
                </div>

                <div style={{ margin: "12px 0" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fi fi-rr-clock" style={{ fontSize: 11 }} />
                        {item.days_until_assessment <= 0 
                            ? "Final review before assessment!" 
                            : `Study before assessment in ${item.days_until_assessment} ${item.days_until_assessment === 1 ? 'day' : 'days'}`}
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        className="btn-primary"
                        onClick={() => onViewPdf(item)}
                        style={{ padding: "6px 14px", fontSize: "0.85rem", opacity: 0.9, display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="fi fi-rr-book-alt" style={{fontSize: 13}}/> Study Material
                    </button>
                </div>
            </article>
        </Spotlight>
    );
}

// ─────────────────────────────────────────────
// ASSESSMENT CARD
// ─────────────────────────────────────────────
function AssessmentCard({ item, onOpenInfo }) {
    const statusCfg = {
        overdue:  { color: "#818cf8", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.3)",  label: "READY" },
        today:    { color: "#818cf8", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.3)",  label: "TODAY!" },
        soon:     { color: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", label: "SOON" },
        upcoming: { color: "#34d399", bg: "rgba(16,185,129,0.08)",border: "var(--border-color)", label: "SCHEDULED" },
    };
    const s = statusCfg[item.date_status] || statusCfg.upcoming;
    const assessDate = new Date(item.assessment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    return (
        <Spotlight spotlightColor={s.color + "20"}>
            <article style={{
                background: "var(--bg-surface-2)",
                borderRadius: 14, padding: "18px",
                display: "flex", flexDirection: "column", gap: 12,
                transition: "all 0.2s ease",
                position: "relative", overflow: "hidden",
                border: "none",
            }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", margin: "0 0 2px" }}>
                            {item.topic_title}
                        </h3>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>📚 {item.subject_title}</div>
                    </div>
                    <span style={{
                        background: s.bg, color: s.color,
                        fontSize: "0.82rem", fontWeight: 800, padding: "3px 9px", borderRadius: 99,
                        border: `1px solid ${s.color}30`, flexShrink: 0,
                    }}>
                        {s.label}
                    </span>
                </div>

                <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10,
                    background: "var(--bg-surface-3)", border: "1px solid var(--border-color)",
                }}>
                    <i className="fi fi-rr-calendar" style={{color: s.color, flexShrink: 0, fontSize: 13}}/>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                            Assessment Deadline: {assessDate}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 1 }}>
                            {item.days_until < 0
                                ? "Ready for assessment"
                                : item.days_until === 0
                                    ? "Assessment day!"
                                    : `${item.days_until} day${item.days_until > 1 ? "s" : ""} remaining`
                            }
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {item.can_take_today ? (
                        <button
                            className="btn-primary"
                            onClick={() => onOpenInfo(item)}
                            style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="fi fi-rr-play-circle" style={{fontSize: 13}}/> Take Assessment
                        </button>
                    ) : (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "7px 12px", borderRadius: 9,
                            background: "var(--bg-surface-3)", border: "1px solid var(--border-color)",
                            fontSize: "0.88rem", fontWeight: 600, color: "var(--text-muted)",
                        }}>
                            <i className="fi fi-rr-lock" style={{fontSize: 11}}/>
                            {item.days_until > 0 ? `Available in ${item.days_until}d` : "Locked"}
                        </div>
                    )}
                </div>
            </article>
        </Spotlight>
    );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
function StudentDashboard() {
    const navigate  = useNavigate();
    const toast     = useToast();

    const [revisions,  setRevisions]  = useState([]);
    const [assessments,setAssessments]= useState([]);
    const [calData,    setCalData]    = useState({ revisions: [], events: [] });
    const [loading,    setLoading]    = useState(true);
    const [pdfModal,   setPdfModal]   = useState({ open: false, url: "", title: "", subjectId: null, isEnrolled: false });
    const [infoModal,  setInfoModal]  = useState({ open: false, item: null, info: null, loading: false });
    const [listModal,  setListModal]  = useState({ open: false, type: "", title: "", items: [] });

    const loadRevisions = async () => {
        try {
            const res = await getRevisionDashboard();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const items = res.data.map(item => {
                const assessDate = item.next_assessment_date ? new Date(item.next_assessment_date) : null;
                if (assessDate) {
                    assessDate.setHours(0, 0, 0, 0);
                    item.days_until_assessment = Math.ceil((assessDate - today) / (1000 * 60 * 60 * 24));
                } else {
                    item.days_until_assessment = 1;
                }
                return item;
            });
            setRevisions(items);
        } catch {}
    };

    const loadAssessments = async () => {
        try { const res = await getScheduledAssessments(); setAssessments(res.data); }
        catch {}
    };

    const loadCalendar = useCallback(async () => {
        try { const res = await getCalendarData(); setCalData(res.data); } catch {}
    }, []);

    useEffect(() => {
        document.title = "Dashboard — ReviseAI";
        Promise.all([loadRevisions(), loadAssessments(), loadCalendar()]).finally(() => setLoading(false));
    }, [loadCalendar]); // eslint-disable-line

    const handleViewPdf = (item) => setPdfModal({
        open: true, url: item.topic_file_path, title: item.topic_title,
        subjectId: item.subject_id || null, isEnrolled: item.is_enrolled || false,
    });

    const handleOpenAssessmentInfo = async (item) => {
        setInfoModal({ open: true, item, info: null, loading: true });
        try {
            const res = await getAssessmentInfo(item.topic_id);
            setInfoModal(prev => ({ ...prev, info: res.data, loading: false }));
        } catch { setInfoModal(prev => ({ ...prev, loading: false })); }
    };

    const handleStartAssessment = () => {
        if (infoModal.item) {
            setInfoModal({ open: false, item: null, info: null, loading: false });
            navigate(`/student/assessment/${infoModal.item.topic_id}`);
        }
    };

    const overdue        = revisions.filter(d => d.status === "overdue");
    const todayRevisions = revisions.filter(d => d.status === "due_today");
    const upcoming       = revisions.filter(d => d.status === "upcoming");
    const dueItems       = [...overdue, ...todayRevisions];

    const statItems = [
        { id: "today",   label: "Ready to Study",  count: dueItems.length,                        color: "#fbbf24", glow: "rgba(245,158,11,0.3)",  icon: <i className="fi fi-rr-bolt" style={{fontSize: 16}}/>,  items: dueItems },
        { id: "upcoming",label: "Upcoming Study", count: upcoming.length,                        color: "#34d399", glow: "rgba(16,185,129,0.3)",  icon: <i className="fi fi-rr-book" style={{fontSize: 16}}/>,  items: upcoming },
        { id: "assess",  label: "Take Assessment",   count: assessments.filter(a => a.can_take_today).length, color: "#818cf8", glow: "rgba(99,102,241,0.3)", icon: <i className="fi fi-rr-document" style={{fontSize: 16}}/>, items: assessments.filter(a => a.can_take_today) },
    ];

    const handleStatClick = (s) => {
        if (s.count === 0) return;
        setListModal({ open: true, type: s.id, title: s.label, items: s.items });
    };



    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {infoModal.open && (
                <AssessmentInfoModal
                    item={infoModal.item}
                    info={infoModal.info}
                    onClose={() => setInfoModal({ open: false, item: null, info: null, loading: false })}
                    onStart={handleStartAssessment}
                />
            )}

            {listModal.open && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 20
                }} onClick={() => setListModal({ ...listModal, open: false })}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: 550, width: "100%", maxHeight: "80vh",
                            background: "var(--bg-surface)", border: "1px solid var(--border-color)",
                            borderRadius: 24, padding: "28px", display: "flex", flexDirection: "column",
                            boxShadow: "var(--shadow-lg)"
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{listModal.title}</h2>
                            <button onClick={() => setListModal({ ...listModal, open: false })} style={{
                                background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem"
                            }}><i className="fi fi-rr-cross" /></button>
                        </div>
                        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                            {listModal.items.map(item => (
                                listModal.type === 'assess'
                                    ? <AssessmentCard key={item.topic_id} item={item} onOpenInfo={handleOpenAssessmentInfo} />
                                    : <RevisionCard key={item.topic_id} item={item} onViewPdf={handleViewPdf} />
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ══ DASHBOARD CONTENT ══ */}
            <div style={{
                display: "flex", flexDirection: "column", gap: 32,
                width: "100%", padding: "0 10px 40px"
            }}>
                <FadeIn>
                    <div style={{ textAlign: "center", marginBottom: 10 }}>
                        <div style={{
                            fontSize: "0.82rem", fontWeight: 700,
                            color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.15em",
                            marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}>
                            <i className="fi fi-rr-star" style={{fontSize: 9}}/> Student Dashboard
                        </div>
                        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.04em" }}>
                            Welcome back
                        </h1>
                        <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: "1rem" }}>
                            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                    </div>
                </FadeIn>

                <StaggerList style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16,
                }}>
                    {statItems.map(s => (
                        <StaggerItem key={s.label}>
                            <div 
                                className="ace-stat-card" 
                                style={{ cursor: s.count > 0 ? "pointer" : "default", padding: '24px' }}
                                onClick={() => handleStatClick(s)}
                            >
                                <motion.div
                                    whileHover={s.count > 0 ? { scale: 1.1, rotate: 5 } : {}}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: `${s.color}15`,
                                        color: s.color,
                                        boxShadow: `0 0 20px ${s.glow}`,
                                        fontSize: '1.2rem'
                                    }}
                                >
                                    {s.icon}
                                </motion.div>
                                <div>
                                    <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>
                                        <AnimatedCounter to={s.count} duration={1} />
                                    </div>
                                    <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontWeight: 700, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        {s.label}
                                    </div>
                                </div>
                            </div>
                        </StaggerItem>
                    ))}
                </StaggerList>

                {/* ══ SIDE-BY-SIDE MAIN AREA ══ */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(320px, 1fr) 1.5fr", // ~40% and ~60%
                    gap: 32,
                    alignItems: "flex-start",
                }}>
                    {/* LEFT COLUMN: SCHEDULES & ASSESSMENTS */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                        {/* Schedules Section */}
                        <section>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border-color)" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(99,102,241,0.1)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="fi fi-rr-list-check" style={{fontSize: 18}}/>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Your Schedules</h2>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Upcoming study sessions</p>
                                </div>
                            </div>

                            {dueItems.length === 0 && upcoming.length === 0 ? (
                                <div className="empty-state" style={{ padding: "30px 20px", background: "var(--bg-surface-2)", borderRadius: 20, border: "1px dashed var(--border-color)" }}>
                                    <i className="fi fi-rr-calendar-check" style={{ fontSize: "1.5rem", color: "var(--text-muted)", marginBottom: 10, display: "block" }} />
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>No study sessions scheduled</p>
                                </div>
                            ) : (
                                <StaggerList style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {[...dueItems, ...upcoming.slice(0, 3)].map(item => (
                                        <StaggerItem key={item.topic_id}>
                                            <RevisionCard item={item} onViewPdf={handleViewPdf} />
                                        </StaggerItem>
                                    ))}
                                </StaggerList>
                            )}
                        </section>

                        {/* Assessments Section */}
                        <section>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border-color)" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16,185,129,0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="fi fi-rr-document" style={{fontSize: 18}}/>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Upcoming Assessments</h2>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Knowledge checks</p>
                                </div>
                            </div>

                            {assessments.length === 0 ? (
                                <div className="empty-state" style={{ padding: "30px 20px", background: "var(--bg-surface-2)", borderRadius: 20, border: "1px dashed var(--border-color)" }}>
                                    <i className="fi fi-rr-edit" style={{ fontSize: "1.5rem", color: "var(--text-muted)", marginBottom: 10, display: "block" }} />
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>No upcoming assessments</p>
                                </div>
                            ) : (
                                <StaggerList style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {assessments.slice(0, 4).map(item => (
                                        <StaggerItem key={item.topic_id}>
                                            <AssessmentCard item={item} onOpenInfo={handleOpenAssessmentInfo} />
                                        </StaggerItem>
                                    ))}
                                </StaggerList>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN: CALENDAR */}
                    <div className="cal-hero" style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 32, padding: "32px 36px",
                        boxShadow: "0 12px 48px rgba(0,0,0,0.35), inset 0 1px 0 var(--border-color)",
                        position: "sticky", top: 100
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 22 }}>
                            <div>
                                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    <i className="fi fi-rr-calendar" style={{fontSize: 10}}/> Study Schedule
                                </div>
                                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Calendar Overview</h2>
                            </div>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                {[["#818cf8", "Study"], ["#34d399", "Upcoming"], ["#6366f1", "Assessments"]].map(([c, l]) => (
                                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}80` }} />
                                        {l}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <CalendarWidget revisions={calData.revisions} events={calData.events} onDataChange={loadCalendar} role="student" />
                    </div>
                </div>
            </div>

            <PdfViewerModal
                isOpen={pdfModal.open}
                onClose={() => setPdfModal(p => ({ ...p, open: false }))}
                fileUrl={pdfModal.url}
                title={pdfModal.title}
                chatSubjectId={pdfModal.subjectId}
                isEnrolledSubject={pdfModal.isEnrolled}
            />
        </DashboardLayout>
    );
}

export default StudentDashboard;
