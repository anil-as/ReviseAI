import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import CalendarWidget from "../../components/CalendarWidget";
import { getMySubjects } from "../../services/subjectService";
import { getCalendarData } from "../../services/dashboardService";

function InstructorDashboard() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [calData, setCalData] = useState({ revisions: [], events: [] });

    const loadCalendar = useCallback(async () => {
        try { const res = await getCalendarData(); setCalData(res.data); } catch { }
    }, []);

    useEffect(() => {
        document.title = "Instructor Dashboard — ReviseAI";
        const load = async () => {
            try { const res = await getMySubjects(); setSubjects(res.data); }
            catch { } finally { setLoading(false); }
        };
        load();
        loadCalendar();
    }, [loadCalendar]);

    const quickActions = [
        { label: "Subjects", value: subjects.length, icon: "📚", color: "#2961FF", bg: "#EBE9FE", link: "/instructor/subjects" },
        { label: "Enrollments", value: "Review", icon: "👥", color: "#f59e0b", bg: "#fef3c7", link: "/instructor/enrollments" },
        { label: "Analytics", value: "View", icon: "📊", color: "#10b981", bg: "#d1fae5", link: "/instructor/analytics" },
        { label: "Chat", value: "Open", icon: "💬", color: "#8b5cf6", bg: "#ede9fe", link: "/chat" },
    ];

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {/* Quick action cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {quickActions.map(a => (
                    <Link to={a.link} key={a.label} style={{ textDecoration: "none" }}>
                        <article className="card animate-fadeIn" aria-label={a.label}
                            style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: a.bg, color: a.color,
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                            }}>{a.icon}</div>
                            <div>
                                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: a.color, lineHeight: 1 }}>{a.value}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>{a.label}</div>
                            </div>
                        </article>
                    </Link>
                ))}
            </div>

            {/* Two-column layout: subjects left, calendar right */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

                {/* ── Left: Subjects ── */}
                <div>
                    <div className="section-header" style={{ marginBottom: 14 }}>
                        <h2>My Subjects</h2>
                        <Link to="/instructor/subjects" style={{ fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: 600 }}>
                            Manage all →
                        </Link>
                    </div>

                    {subjects.length === 0 && !loading ? (
                        <div className="empty-state">
                            <div className="empty-icon">📚</div>
                            <h3>No subjects yet</h3>
                            <Link to="/instructor/subjects" style={{ color: "var(--color-primary)", fontWeight: 600, fontSize: "0.9rem" }}>
                                Create your first subject →
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10 }}>
                            {subjects.slice(0, 8).map(s => (
                                <article key={s.id} className="card animate-fadeIn" style={{ padding: "14px 16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                            background: "var(--color-primary-light)", color: "var(--color-primary)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontWeight: 800, fontSize: "0.95rem",
                                        }}>{s.title.charAt(0).toUpperCase()}</div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {s.title}
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                                {s.is_public ? "Public" : "Private"} · {new Date(s.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: Calendar ── */}
                <div className="card" style={{
                    padding: "22px 20px",
                    position: "sticky",
                    top: "calc(var(--navbar-height) + 24px)",
                }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                        📅 Planner
                    </div>
                    <CalendarWidget
                        revisions={calData.revisions}
                        events={calData.events}
                        onDataChange={loadCalendar}
                        role="instructor"
                    />
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                            Click any day to add plans or reminders
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default InstructorDashboard;
