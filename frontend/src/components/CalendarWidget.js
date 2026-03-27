import { useState } from "react";
import { createCalendarEvent, deleteCalendarEvent } from "../services/dashboardService";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function memStatusColor(status) {
    if (status === "overdue") return "#ef4444";
    if (status === "due_today") return "#f59e0b";
    return "#10b981";
}

function CalendarWidget({ revisions = [], events = [], onDataChange, role = "student" }) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState(today.toISOString().slice(0, 10));
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: "", color: "#a3e635" });
    const [saving, setSaving] = useState(false);

    // Build a map: date-string -> { revisions: [], events: [] }
    const dayMap = {};

    revisions.forEach(r => {
        if (!dayMap[r.date]) dayMap[r.date] = { revisions: [], events: [] };
        dayMap[r.date].revisions.push(r);
    });
    events.forEach(e => {
        if (!dayMap[e.date]) dayMap[e.date] = { revisions: [], events: [] };
        dayMap[e.date].events.push(e);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const todayStr = today.toISOString().slice(0, 10);
    const selectedData = dayMap[selected] || { revisions: [], events: [] };

    const EVENT_COLORS = ["#a3e635", "#6366f1", "#f59e0b", "#ef4444", "#0ea5e9", "#ec4899", "#10b981"];

    const handleAddEvent = async () => {
        if (!newEvent.title.trim()) return;
        setSaving(true);
        try {
            await createCalendarEvent({ date: selected, title: newEvent.title.trim(), color: newEvent.color });
            setNewEvent({ title: "", color: "#a3e635" });
            setShowAddEvent(false);
            onDataChange?.();
        } catch { } finally { setSaving(false); }
    };

    const handleDeleteEvent = async (id) => {
        try {
            await deleteCalendarEvent(id);
            onDataChange?.();
        } catch { }
    };

    // Build calendar grid
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>

            {/* ── Month Header ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 16,
            }}>
                <button onClick={prevMonth} style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--bg-surface-2)", border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "1rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>‹</button>

                <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)", lineHeight: 1.2 }}>
                        {MONTHS[month]}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{year}</div>
                </div>

                <button onClick={nextMonth} style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--bg-surface-2)", border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "1rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>›</button>
            </div>

            {/* ── Day Headers ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {DAYS.map(d => (
                    <div key={d} style={{
                        textAlign: "center", fontSize: "0.68rem", fontWeight: 700,
                        color: "var(--text-muted)", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "4px 0",
                    }}>{d}</div>
                ))}
            </div>

            {/* ── Calendar Grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, flex: 1 }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selected;
                    const data = dayMap[dateStr];
                    const hasRevision = data?.revisions?.length > 0;
                    const hasEvent = data?.events?.length > 0;
                    const revStatuses = data?.revisions?.map(r => r.status) || [];
                    const dotColor = revStatuses.includes("overdue") ? "#ef4444"
                        : revStatuses.includes("due_today") ? "#f59e0b"
                            : hasRevision ? "#10b981" : null;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelected(dateStr)}
                            style={{
                                position: "relative",
                                height: 42,
                                borderRadius: 8,
                                background: isSelected ? "var(--color-primary)"
                                    : isToday ? "var(--bg-surface-2)"
                                        : "transparent",
                                border: isToday && !isSelected
                                    ? "1.5px solid var(--color-primary)"
                                    : "1.5px solid transparent",
                                color: isSelected ? "var(--text-on-primary)"
                                    : "var(--text-primary)",
                                fontWeight: isToday || isSelected ? 800 : 500,
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                gap: 2,
                                transition: "all 120ms",
                                padding: "4px 2px",
                            }}
                        >
                            <span>{day}</span>
                            {/* Dots row */}
                            <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                                {dotColor && (
                                    <div style={{
                                        width: 5, height: 5, borderRadius: "50%",
                                        background: isSelected ? "rgba(255,255,255,0.85)" : dotColor,
                                    }} />
                                )}
                                {hasEvent && (
                                    <div style={{
                                        width: 5, height: 5, borderRadius: "50%",
                                        background: isSelected ? "rgba(255,255,255,0.85)" : (data.events[0]?.color || "#6366f1"),
                                    }} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Selected Day Panel ── */}
            <div style={{
                marginTop: 16, borderTop: "1px solid var(--border-color)",
                paddingTop: 14,
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                        {new Date(selected + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                    </div>
                    <button
                        onClick={() => setShowAddEvent(v => !v)}
                        style={{
                            fontSize: "0.72rem", fontWeight: 700,
                            padding: "4px 10px", borderRadius: 6,
                            background: showAddEvent ? "var(--bg-surface-2)" : "var(--color-primary)",
                            color: showAddEvent ? "var(--text-secondary)" : "#fff",
                            border: "none", cursor: "pointer",
                        }}
                    >
                        {showAddEvent ? "✕" : "+ Add"}
                    </button>
                </div>

                {/* Add event form */}
                {showAddEvent && (
                    <div style={{
                        background: "var(--bg-surface-2)", borderRadius: 10,
                        padding: "12px", marginBottom: 10,
                        display: "flex", flexDirection: "column", gap: 8,
                        border: "1px solid var(--border-color)",
                        animation: "fadeIn 150ms both",
                    }}>
                        <input
                            placeholder="Event title…"
                            value={newEvent.title}
                            onChange={e => setNewEvent(v => ({ ...v, title: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddEvent()}
                            style={{
                                padding: "8px 10px", borderRadius: 7,
                                border: "1px solid var(--border-color)",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                fontSize: "0.82rem",
                            }}
                            autoFocus
                        />
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Color:</span>
                            {EVENT_COLORS.map(c => (
                                <button key={c} onClick={() => setNewEvent(v => ({ ...v, color: c }))}
                                    style={{
                                        width: 18, height: 18, borderRadius: "50%",
                                        background: c, border: newEvent.color === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                                        cursor: "pointer",
                                    }}
                                />
                            ))}
                        </div>
                        <button onClick={handleAddEvent} disabled={saving}
                            style={{
                                background: "var(--color-primary)", color: "#fff",
                                border: "none", borderRadius: 7, padding: "7px",
                                fontSize: "0.8rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                            }}
                        >
                            {saving ? "Saving…" : "Save Event"}
                        </button>
                    </div>
                )}

                {/* Revisions for selected day */}
                {selectedData.revisions.map((r, i) => (
                    <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 8,
                        background: `${memStatusColor(r.status)}12`,
                        border: `1px solid ${memStatusColor(r.status)}40`,
                        marginBottom: 5, fontSize: "0.8rem",
                    }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: memStatusColor(r.status), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.topic_title}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: memStatusColor(r.status), fontWeight: 700 }}>
                            {Math.round(r.memory_strength * 100)}%
                        </span>
                    </div>
                ))}

                {/* Custom events for selected day */}
                {selectedData.events.map((e, i) => (
                    <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 8,
                        background: `${e.color}15`,
                        border: `1px solid ${e.color}40`,
                        marginBottom: 5, fontSize: "0.8rem",
                    }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontWeight: 600, color: "var(--text-primary)" }}>{e.title}</span>
                        <button onClick={() => handleDeleteEvent(e.id)}
                            style={{
                                background: "none", border: "none", color: "var(--text-muted)",
                                cursor: "pointer", fontSize: "0.8rem", padding: "2px 4px",
                            }}
                        >✕</button>
                    </div>
                ))}

                {selectedData.revisions.length === 0 && selectedData.events.length === 0 && (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem", padding: "12px 0" }}>
                        No events · click + Add to plan something
                    </div>
                )}
            </div>
        </div>
    );
}

export default CalendarWidget;
