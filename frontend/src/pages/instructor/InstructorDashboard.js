import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import CalendarWidget from "../../components/CalendarWidget";
import { getMySubjects } from "../../services/subjectService";
import { getCalendarData } from "../../services/dashboardService";
import Spotlight from "../../components/bits/Spotlight";
import GlowCard from "../../components/bits/GlowCard";

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
        { label: "Subjects", value: subjects.length, icon: "fi fi-rr-book-alt", color: "#6366f1", link: "/instructor/subjects" },
        { label: "Enrollments", value: "Review", icon: "fi fi-rr-users", color: "#f59e0b", link: "/instructor/enrollments" },
        { label: "Analytics", value: "View", icon: "fi fi-rr-chart-histogram", color: "#10b981", link: "/instructor/analytics" },
        { label: "Chat", value: "Open", icon: "fi fi-rr-comment", color: "#8b5cf6", link: "/chat" },
    ];

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}


            {/* Quick action cards */}
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: 16, 
                marginBottom: 40 
            }}>
                {quickActions.map(a => (
                    <Link to={a.link} key={a.label} style={{ textDecoration: "none" }}>
                        <GlowCard glowColor={a.color.replace('#', '')} glowOpacity={0.15} borderRadius={16}>
                            <article className="card animate-fadeIn" aria-label={a.label}
                                style={{ 
                                    padding: "24px 20px", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 20, 
                                    border: "none",
                                    height: "100%"
                                }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: 14,
                                    background: `${a.color}15`, color: a.color,
                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
                                    flexShrink: 0
                                }}>
                                    <i className={a.icon} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                        {a.label}
                                    </div>
                                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>
                                        {a.value}
                                    </div>
                                </div>
                            </article>
                        </GlowCard>
                    </Link>
                ))}
            </div>

            {/* Main Content Grid */}
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 380px", 
                gap: 32, 
                alignItems: "start",
                // Responsive adjustment via standard CSS would be better, but we do inline for directness
            }} className="dashboard-grid">

                {/* ── Left: Subjects ── */}
                <div>
                    <div className="section-header" style={{ marginBottom: 14 }}>
                        <h2>My Subjects</h2>
                        <Link to="/instructor/subjects" style={{ fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: 600 }}>
                            Manage all →
                        </Link>
                    </div>

                    {subjects.length === 0 && !loading ? (
                        <div className="empty-state" style={{ padding: "60px 20px", background: "var(--bg-surface-2)", borderRadius: 20 }}>
                            <div className="empty-icon" style={{ fontSize: "3rem", marginBottom: 16 }}>📚</div>
                            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>No subjects yet</h3>
                            <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>Ready to share your knowledge? Start by creating your first subject.</p>
                            <Link to="/instructor/subjects" className="btn-primary" style={{ padding: "12px 24px" }}>
                                Create Subject →
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                            {subjects.slice(0, 8).map(s => (
                                <Link key={s.id} to={`/instructor/subjects/${s.id}/topics`} style={{ textDecoration: "none" }}>
                                    <GlowCard glowColor="99, 102, 241" glowOpacity={0.1} borderRadius={18}>
                                        <article className="card animate-fadeIn" style={{ padding: "20px", border: "none", height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                                                    background: "var(--color-primary-light)", color: "var(--color-primary)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontWeight: 800, fontSize: "1.1rem",
                                                }}>{s.title.charAt(0).toUpperCase()}</div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                                                        {s.title}
                                                    </div>
                                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                        <span className={`badge ${s.is_public ? 'badge-easy' : 'badge-hard'}`} style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                                                            {s.is_public ? "Public" : "Private"}
                                                        </span>
                                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
                                                            {new Date(s.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ 
                                                marginTop: "auto", 
                                                paddingTop: 14, 
                                                borderTop: "1px solid var(--border-color)",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}>
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                                    Manage Materials →
                                                </div>
                                                <div style={{ 
                                                    width: 28, height: 28, borderRadius: "50%", 
                                                    background: "var(--bg-surface-3)", 
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "0.85rem", color: "var(--text-secondary)"
                                                }}>
                                                    <i className="fi fi-rr-arrow-right" />
                                                </div>
                                            </div>
                                        </article>
                                    </GlowCard>
                                </Link>
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
