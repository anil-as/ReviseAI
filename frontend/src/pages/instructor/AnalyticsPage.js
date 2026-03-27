import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getMySubjects } from "../../services/subjectService";
import { getSubjectAnalytics, getSubjectStudents, getStudentAnalytics } from "../../services/analyticsService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";

/* ─── helpers ──────────────────────────────────────────────────── */
function memColor(v) {
    if (v >= 0.7) return "#10b981";
    if (v >= 0.4) return "#f59e0b";
    return "#ef4444";
}
function accColor(v) {
    if (v >= 0.7) return "#3b82f6";
    if (v >= 0.4) return "#8b5cf6";
    return "#ec4899";
}

function memLabel(v) {
    if (v >= 0.7) return "Strong";
    if (v >= 0.4) return "Fair";
    return "Weak";
}

/* ─── SVG Bar Chart ─────────────────────────────────────────────── */
function BarChart({ topics }) {
    const [hovered, setHovered] = useState(null);
    if (!topics.length) return null;

    const maxVal = 1.0;
    const BAR_W = 20;
    const GROUP_GAP = 20;
    const INTRAGROUP_GAP = 4;
    const H = 200;           // chart area height
    const LABEL_H = 52;      // height reserved for x-axis labels
    const PADDING_T = 24;    // top padding inside chart
    const GROUP_W = (BAR_W * 2) + INTRAGROUP_GAP;
    const totalWidth = topics.length * (GROUP_W + GROUP_GAP) + GROUP_GAP;

    return (
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <svg
                width={Math.max(totalWidth, 400)}
                height={H + LABEL_H + PADDING_T}
                style={{ display: "block", minWidth: "100%" }}
            >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map(v => {
                    const y = PADDING_T + H - (v / maxVal) * H;
                    return (
                        <g key={v}>
                            <line x1={0} y1={y} x2={totalWidth} y2={y}
                                stroke="var(--border-color)" strokeWidth={1} strokeDasharray={v === 0 ? "" : "4 4"} />
                            <text x={2} y={y - 4} fontSize={10} fill="var(--text-muted)" fontFamily="inherit">
                                {Math.round(v * 100)}%
                            </text>
                        </g>
                    );
                })}

                {/* Bars */}
                {topics.map((t, i) => {
                    const groupX = GROUP_GAP + i * (GROUP_W + GROUP_GAP);
                    const memH = Math.max(4, (t.avg_memory_strength / maxVal) * H);
                    const accH = Math.max(4, ((t.accuracy || 0) / maxVal) * H);
                    
                    const memY = PADDING_T + H - memH;
                    const accY = PADDING_T + H - accH;
                    
                    const mColor = memColor(t.avg_memory_strength);
                    const aColor = accColor(t.accuracy || 0);
                    const isH = hovered === i;

                    // Truncate label
                    const maxChars = 10;
                    const label = t.topic.length > maxChars ? t.topic.slice(0, maxChars) + "…" : t.topic;

                    return (
                        <g key={i}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: "default" }}
                        >
                            {/* Mem Bar */}
                            <rect x={groupX} y={memY} width={BAR_W} height={memH} rx={4} fill={isH ? mColor : mColor + "cc"} style={{ transition: "fill 150ms" }} />
                            {/* Acc Bar */}
                            <rect x={groupX + BAR_W + INTRAGROUP_GAP} y={accY} width={BAR_W} height={accH} rx={4} fill={isH ? aColor : aColor + "cc"} style={{ transition: "fill 150ms" }} />

                            {/* X-axis label */}
                            <foreignObject
                                x={groupX - 5} y={PADDING_T + H + 8}
                                width={GROUP_W + 10} height={LABEL_H - 8}
                            >
                                <div
                                    xmlns="http://www.w3.org/1999/xhtml"
                                    style={{
                                        fontSize: "10px", textAlign: "center",
                                        color: isH ? "var(--text-primary)" : "var(--text-muted)",
                                        fontWeight: isH ? 700 : 500,
                                        lineHeight: 1.2, wordBreak: "break-word",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {label}
                                </div>
                            </foreignObject>

                            {/* Hover tooltip */}
                            {isH && (
                                <g>
                                    <rect
                                        x={groupX + GROUP_W / 2 - 70} y={Math.min(memY, accY) - 56}
                                        width={140} height={48}
                                        rx={8}
                                        fill="var(--bg-surface)"
                                        stroke="var(--border-color)"
                                        strokeWidth={1}
                                        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
                                    />
                                    <text x={groupX + GROUP_W / 2} y={Math.min(memY, accY) - 40}
                                        textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text-secondary)" fontFamily="inherit"
                                    >
                                        {t.topic.length > 20 ? t.topic.slice(0, 20) + "…" : t.topic}
                                    </text>
                                    <text x={groupX + GROUP_W / 2} y={Math.min(memY, accY) - 24}
                                        textAnchor="middle" fontSize={11} fontWeight={800} fill="var(--text-primary)" fontFamily="inherit"
                                    >
                                        <tspan fill={mColor}>Mem: {Math.round(t.avg_memory_strength * 100)}%</tspan>
                                        <tspan fill="var(--text-muted)"> | </tspan>
                                        <tspan fill={aColor}>Acc: {Math.round((t.accuracy || 0) * 100)}%</tspan>
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
function AnalyticsPage() {
    const toast = useToast();
    const [searchParams] = useSearchParams();
    const [subjects, setSubjects] = useState([]);
    const [selectedId, setSelectedId] = useState(searchParams.get("subject") || "");
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [subLoading, setSubLoading] = useState(true);

    // Student filter
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(""); // "" = all students
    const [studentsLoading, setStudentsLoading] = useState(false);

    // View toggle
    const [view, setView] = useState("chart"); // "chart" | "table"

    // Roster sort
    const [sortKey, setSortKey] = useState("memory");
    const [sortOrder, setSortOrder] = useState(-1);

    /* ── Load my subjects ── */
    useEffect(() => {
        document.title = "Analytics — ReviseAI";
        const load = async () => {
            try {
                const res = await getMySubjects();
                setSubjects(res.data);
                if (!selectedId && res.data.length > 0) setSelectedId(String(res.data[0].id));
            } catch { } finally { setSubLoading(false); }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Load student list when subject changes ── */
    useEffect(() => {
        if (!selectedId) return;
        setSelectedStudent("");
        const fetchStudents = async () => {
            setStudentsLoading(true);
            try {
                const res = await getSubjectStudents(selectedId);
                setStudents(res.data || []);
            } catch { setStudents([]); }
            finally { setStudentsLoading(false); }
        };
        fetchStudents();
    }, [selectedId]);

    /* ── Load analytics when subject or student changes ── */
    useEffect(() => {
        if (!selectedId) return;
        const fetch = async () => {
            setLoading(true); setAnalytics(null);
            try {
                let res;
                if (selectedStudent) {
                    res = await getStudentAnalytics(selectedId, selectedStudent);
                } else {
                    res = await getSubjectAnalytics(selectedId);
                }
                setAnalytics(res.data);
            } catch (err) { toast(getErrorMessage(err, "Failed to load analytics"), "error"); }
            finally { setLoading(false); }
        };
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, selectedStudent]);

    const topics = analytics?.topic_memory_average || [];
    const sortedTopics = topics.slice().sort((a, b) => a.avg_memory_strength - b.avg_memory_strength);
    const avgMem = topics.length > 0
        ? (topics.reduce((a, t) => a + t.avg_memory_strength, 0) / topics.length)
        : 0;
    const avgAcc = topics.length > 0
        ? (topics.reduce((a, t) => a + (t.accuracy || 0), 0) / topics.length)
        : 0;
    const weakTopics = sortedTopics.filter(t => t.avg_memory_strength < 0.4 || (t.accuracy && t.accuracy < 0.4));

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];
            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();
            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });
    }, [students, sortKey, sortOrder]);

    const toggleSort = (k) => {
        if (sortKey === k) {
            setSortOrder(sortOrder * -1);
        } else {
            setSortKey(k);
            setSortOrder(-1); // default highest first for numbers
        }
    };

    return (
        <DashboardLayout>
            {subLoading && <LoadingSpinner fullPage />}

            {/* Hero */}
            <div className="page-hero">
                <h1>📊 Analytics</h1>
                <p>Student retention and performance across your subjects</p>
            </div>

            {/* ── Filters row ── */}
            {!subLoading && subjects.length > 0 && (
                <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
                        <label className="form-label" htmlFor="subject-select">Subject</label>
                        <select id="subject-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                        {[{ k: "chart", icon: "📊", label: "Chart" }, { k: "table", icon: "☰", label: "Table" }].map(v => (
                            <button
                                key={v.k}
                                onClick={() => setView(v.k)}
                                style={{
                                    padding: "9px 16px", borderRadius: 10, fontSize: "0.84rem", fontWeight: 700,
                                    background: view === v.k ? "var(--color-primary)" : "var(--bg-surface)",
                                    color: view === v.k ? "#fff" : "var(--text-secondary)",
                                    border: `1.5px solid ${view === v.k ? "var(--color-primary)" : "var(--border-color)"}`,
                                    cursor: "pointer", transition: "all 150ms",
                                }}
                            >
                                {v.icon} {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                    <LoadingSpinner size={40} />
                </div>
            ) : analytics ? (
                <div className="animate-fadeIn">

                    {/* Stat cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 32 }}>
                        {[
                            { label: "Enrolled Students", value: analytics.total_students ?? 1, color: "#2961FF", bg: "#EBE9FE", icon: "👥" },
                            { label: "Avg Memory", value: `${Math.round(avgMem * 100)}%`, color: "#10b981", bg: "#d1fae5", icon: "🧠" },
                            { label: "Avg Accuracy", value: `${Math.round(avgAcc * 100)}%`, color: "#3b82f6", bg: "#dbeafe", icon: "🎯" },
                            { label: "Action Needed", value: weakTopics.length, color: "#ef4444", bg: "#fee2e2", icon: "⚠️" },
                        ].map(s => (
                            <div key={s.label} className="card" style={{ padding: "20px 18px" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: 12 }}>
                                    {s.icon}
                                </div>
                                <div style={{ fontSize: "1.9rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Weakest topics alert */}
                    {weakTopics.length > 0 && (
                        <div style={{
                            background: "#fff7ed", border: "1.5px solid #fdba74",
                            borderRadius: 14, padding: "14px 18px", marginBottom: 24,
                            display: "flex", alignItems: "flex-start", gap: 12,
                        }}>
                            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚠️</span>
                            <div>
                                <div style={{ fontWeight: 700, color: "#c2410c", marginBottom: 4, fontSize: "0.9rem" }}>
                                    {weakTopics.length} topic{weakTopics.length > 1 ? "s" : ""} need attention (Memory or Accuracy &lt; 40%)
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {weakTopics.map((t, i) => (
                                        <span key={i} style={{
                                            background: "#fee2e2", color: "#b91c1c",
                                            padding: "3px 10px", borderRadius: 99,
                                            fontSize: "0.78rem", fontWeight: 700,
                                        }}>{t.topic}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chart / Table header */}
                    <div className="section-header" style={{ marginBottom: 16 }}>
                        <h2>Topic Breakdown</h2>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {selectedStudent
                                ? `📌 ${analytics.student_name || "Student"}`
                                : "avg across all students"}
                        </span>
                        {selectedStudent && (
                            <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.7rem", marginLeft: 16 }} onClick={() => setSelectedStudent("")}>
                                Clear Filter
                            </button>
                        )}
                    </div>

                    {topics.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📊</div>
                            <h3>No revision data yet</h3>
                            <p>Students need to complete assessments to see analytics here.</p>
                        </div>
                    ) : view === "chart" ? (
                        /* ── BAR CHART VIEW ── */
                        <div className="card" style={{ padding: "28px 24px", marginBottom: 40 }}>
                            <BarChart topics={topics} />
                            {/* Legend */}
                            <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap", borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#10b981" }} /> Memory Strength
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#3b82f6" }} /> Assessment Accuracy
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── TABLE VIEW ── */
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
                            {sortedTopics.map((t, i) => (
                                <article key={i} className="card animate-fadeIn" style={{ padding: "16px 22px", display: "flex", alignItems: "center", gap: 16 }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                        background: memColor(t.avg_memory_strength) + "18",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "1.1rem", fontWeight: 800, color: memColor(t.avg_memory_strength),
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {t.topic}
                                        </h3>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Mem:</span>
                                            <div style={{ flex: 1, height: 6, background: "var(--border-color)", borderRadius: 99 }}>
                                                <div style={{ height: "100%", borderRadius: 99, width: `${t.avg_memory_strength * 100}%`, background: memColor(t.avg_memory_strength) }} />
                                            </div>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: memColor(t.avg_memory_strength), width: 30 }}>{Math.round(t.avg_memory_strength * 100)}%</span>
                                            
                                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginLeft: 6 }}>Acc:</span>
                                            <div style={{ flex: 1, height: 6, background: "var(--border-color)", borderRadius: 99 }}>
                                                <div style={{ height: "100%", borderRadius: 99, width: `${(t.accuracy || 0) * 100}%`, background: accColor(t.accuracy || 0) }} />
                                            </div>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: accColor(t.accuracy || 0), width: 30 }}>{Math.round((t.accuracy || 0) * 100)}%</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* ── STUDENT ROSTER ── */}
                    {students.length > 0 && (
                        <div className="card" style={{ padding: "24px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>Student Roster</h3>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{students.length} Enrolled</div>
                            </div>
                            
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                                            <th style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => toggleSort("student_name")}>
                                                Student Name {sortKey === "student_name" ? (sortOrder === 1 ? "↑" : "↓") : ""}
                                            </th>
                                            <th style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => toggleSort("memory")}>
                                                Memory {sortKey === "memory" ? (sortOrder === 1 ? "↑" : "↓") : ""}
                                            </th>
                                            <th style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => toggleSort("accuracy")}>
                                                Accuracy {sortKey === "accuracy" ? (sortOrder === 1 ? "↑" : "↓") : ""}
                                            </th>
                                            <th style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => toggleSort("weakest_topic")}>
                                                Weakest Topic {sortKey === "weakest_topic" ? (sortOrder === 1 ? "↑" : "↓") : ""}
                                            </th>
                                            <th style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedStudents.map(s => (
                                            <tr key={s.student_id} style={{ 
                                                borderBottom: "1px solid var(--border-color)",
                                                background: selectedStudent === String(s.student_id) ? "var(--bg-surface-2)" : "transparent"
                                            }}>
                                                <td style={{ padding: "16px 12px", fontWeight: 700, fontSize: "0.95rem" }}>
                                                    {s.student_name}
                                                </td>
                                                <td style={{ padding: "16px 12px" }}>
                                                    <span style={{
                                                        padding: "4px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
                                                        background: memColor(s.memory || 0) + "22", color: memColor(s.memory || 0)
                                                    }}>
                                                        {Math.round((s.memory || 0) * 100)}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 12px" }}>
                                                    <span style={{
                                                        padding: "4px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
                                                        background: accColor(s.accuracy || 0) + "22", color: accColor(s.accuracy || 0)
                                                    }}>
                                                        {Math.round((s.accuracy || 0) * 100)}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 12px", fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {s.weakest_topic || "N/A"}
                                                </td>
                                                <td style={{ padding: "16px 12px", textAlign: "right" }}>
                                                    <button 
                                                        className={selectedStudent === String(s.student_id) ? "btn-primary" : "btn-secondary"}
                                                        style={{ padding: "6px 14px", fontSize: "0.75rem" }}
                                                        onClick={() => setSelectedStudent(selectedStudent === String(s.student_id) ? "" : String(s.student_id))}
                                                    >
                                                        {selectedStudent === String(s.student_id) ? "Viewing" : "View"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : !subLoading && subjects.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>No subjects yet</h3>
                    <p>Create subjects and upload topics to see analytics here.</p>
                </div>
            ) : null}
        </DashboardLayout>
    );
}

export default AnalyticsPage;
