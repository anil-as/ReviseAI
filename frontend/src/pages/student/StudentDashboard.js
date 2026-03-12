import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import MemoryBar from "../../components/MemoryBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import CalendarWidget from "../../components/CalendarWidget";
import { getRevisionDashboard, postponeRevision, getCalendarData } from "../../services/dashboardService";
import { useToast } from "../../components/Toast";
import PdfViewerModal from "../../components/PdfViewerModal";

function RevisionCard({ item, onPostpone, isPostponing, onViewPdf }) {
    const badgeMap = {
        overdue: { cls: "badge badge-overdue", label: "Overdue" },
        due_today: { cls: "badge badge-today", label: "Due Today" },
        upcoming: { cls: "badge badge-upcoming", label: "Upcoming" },
    };
    const { cls, label } = badgeMap[item.status] || badgeMap.upcoming;
    const nextDate = new Date(item.next_revision_date).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });

    return (
        <article
            className="card animate-fadeIn"
            aria-label={`Revision card for ${item.topic_title}`}
            style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", flex: 1, lineHeight: 1.3 }}>
                    {item.topic_title}
                </h3>
                <span className={cls}>{label}</span>
            </div>

            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Memory
                    </span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-primary)" }}>
                        {!item.last_revision_date ? '—' : `${Math.round(item.memory_strength * 100)}%`}
                    </span>
                </div>
                <MemoryBar value={item.memory_strength} isNew={!item.last_revision_date} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>📅 {nextDate}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {(item.status === "due_today" || item.status === "upcoming") && (
                        <button onClick={() => onPostpone(item.topic_id)} disabled={isPostponing}
                            className="btn-ghost" style={{ padding: "5px 10px", fontSize: "0.73rem" }}>
                            {isPostponing ? "…" : "Postpone"}
                        </button>
                    )}
                    {item.topic_file_path && (
                        <button onClick={() => onViewPdf(item.topic_file_path, item.topic_title)}
                            className="btn-secondary" style={{ padding: "5px 12px", fontSize: "0.76rem" }}>
                            📄 Revise Topic
                        </button>
                    )}
                    <Link to={`/student/assessment/${item.topic_id}`}
                        className="btn-primary"
                        style={{ padding: "5px 12px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center" }}
                    >
                        Take Assessment →
                    </Link>
                </div>
            </div>
        </article>
    );
}

function StudentDashboard() {
    const toast = useToast();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [postponing, setPostponing] = useState(null);
    const [calData, setCalData] = useState({ revisions: [], events: [] });

    // PDF Viewer State
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfData, setPdfData] = useState({ url: "", title: "" });

    const handleViewPdf = (url, title) => {
        setPdfData({ url, title });
        setPdfModalOpen(true);
    };

    const loadRevisions = async () => {
        try { const res = await getRevisionDashboard(); setData(res.data); }
        catch { } finally { setLoading(false); }
    };

    const loadCalendar = useCallback(async () => {
        try { const res = await getCalendarData(); setCalData(res.data); }
        catch { }
    }, []);

    useEffect(() => {
        document.title = "Dashboard — ReviseAI";
        loadRevisions();
        loadCalendar();
    }, [loadCalendar]);

    const handlePostpone = async (topicId) => {
        setPostponing(topicId);
        try {
            await postponeRevision(topicId);
            await Promise.all([loadRevisions(), loadCalendar()]);
        } catch (err) {
            toast(err.response?.data?.detail || "Cannot postpone", "error");
        } finally { setPostponing(null); }
    };

    const overdue = data.filter(d => d.status === "overdue");
    const today = data.filter(d => d.status === "due_today");
    const upcoming = data.filter(d => d.status === "upcoming");

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {/* Stat chips */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                    { label: "Overdue", count: overdue.length, color: "#ef4444", bg: "#fee2e2", icon: "🔴" },
                    { label: "Due Today", count: today.length, color: "#f59e0b", bg: "#fef3c7", icon: "🟡" },
                    { label: "Upcoming", count: upcoming.length, color: "#10b981", bg: "#d1fae5", icon: "🟢" },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", fontWeight: 600, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {s.icon} {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Two-column layout: revisions left, calendar right */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 340px",
                gap: 20,
                alignItems: "start",
            }}>
                {/* ── Left: Revision list ── */}
                <div>
                    {data.length === 0 && !loading ? (
                        <div className="empty-state">
                            <div className="empty-icon">🎉</div>
                            <h3>All caught up!</h3>
                            <p>No revisions scheduled right now. Great work!</p>
                        </div>
                    ) : (
                        <>
                            {[
                                { title: "🔴 Overdue", items: overdue },
                                { title: "🟡 Due Today", items: today },
                                { title: "🟢 Upcoming", items: upcoming },
                            ].map(({ title, items }) => items.length > 0 && (
                                <section key={title} style={{ marginBottom: 28 }}>
                                    <div className="section-header" style={{ marginBottom: 12 }}>
                                        <h2 style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                                            {title} <span style={{ marginLeft: 6, color: "var(--text-muted)", fontWeight: 500 }}>· {items.length}</span>
                                        </h2>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {items.map(item => (
                                            <RevisionCard
                                                key={item.topic_id}
                                                item={item}
                                                onPostpone={handlePostpone}
                                                isPostponing={postponing === item.topic_id}
                                                onViewPdf={handleViewPdf}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </>
                    )}
                </div>

                {/* ── Right: Calendar ── */}
                <div className="card" style={{
                    padding: "22px 20px",
                    position: "sticky",
                    top: "calc(var(--navbar-height) + 24px)",
                }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                        📅 Calendar
                    </div>
                    <CalendarWidget
                        revisions={calData.revisions}
                        events={calData.events}
                        onDataChange={loadCalendar}
                        role="student"
                    />
                    {/* Legend */}
                    <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-color)", flexWrap: "wrap" }}>
                        {[["#ef4444", "Overdue"], ["#f59e0b", "Due Today"], ["#10b981", "Upcoming"], ["#6366f1", "Event"]].map(([c, l]) => (
                            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{l}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <PdfViewerModal
                isOpen={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                fileUrl={pdfData.url}
                title={pdfData.title}
            />
        </DashboardLayout>
    );
}

export default StudentDashboard;
