import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { getMessages, sendMessage, deleteMessage, getChatSubjects } from "../services/chatService";
import { jwtDecode } from "jwt-decode";

function ChatPage() {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [activeId, setActiveId] = useState(subjectId ? parseInt(subjectId) : null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [subLoading, setSubLoading] = useState(true);
    const [myRole, setMyRole] = useState("student");
    const bottomRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        document.title = "Chat — ReviseAI";
        try {
            const t = localStorage.getItem("token");
            if (t) { const d = jwtDecode(t); setMyRole(d.role); }
        } catch { }
    }, []);

    // Load subject list
    useEffect(() => {
        const load = async () => {
            try { const res = await getChatSubjects(); setSubjects(res.data || []); }
            catch { } finally { setSubLoading(false); }
        };
        load();
    }, []);

    // When activeId changes, navigate and load messages
    const fetchMessages = useCallback(async () => {
        if (!activeId) return;
        try {
            const res = await getMessages(activeId);
            setMessages(res.data || []);
        } catch { }
    }, [activeId]);

    useEffect(() => {
        if (!activeId) return;
        setLoading(true);
        navigate(`/chat/${activeId}`, { replace: true });
        fetchMessages().finally(() => setLoading(false));

        // Poll every 5 seconds
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchMessages, 5000);
        return () => clearInterval(pollRef.current);
    }, [activeId, fetchMessages, navigate]);

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !activeId) return;
        const text = input.trim();
        setInput("");
        setSending(true);
        try {
            const res = await sendMessage(activeId, text);
            setMessages(m => [...m, res.data]);
        } catch { setInput(text); }
        finally { setSending(false); }
    };

    const handleDelete = async (msgId) => {
        try {
            await deleteMessage(msgId);
            setMessages(m => m.filter(x => x.id !== msgId));
        } catch { }
    };

    const activeSubject = subjects.find(s => s.id === activeId);

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Today";
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    // Group messages by date
    const grouped = [];
    let lastDate = null;
    messages.forEach(m => {
        const dLabel = formatDate(m.created_at);
        if (dLabel !== lastDate) {
            grouped.push({ type: "divider", label: dLabel });
            lastDate = dLabel;
        }
        grouped.push({ type: "msg", data: m });
    });

    return (
        <DashboardLayout>
            <div style={{
                display: "flex", gap: 0, height: "calc(100vh - var(--navbar-height) - 64px)",
                background: "var(--bg-surface)", borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                boxShadow: "var(--shadow-md)",
            }}>
                {/* ── Left: Subject list ── */}
                <div style={{
                    width: 260, flexShrink: 0,
                    borderRight: "1px solid var(--border-color)",
                    overflowY: "auto",
                    background: "var(--bg-surface-2)",
                }}>
                    <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>💬 Chats</div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 2 }}>
                            {myRole === "instructor" ? "Your subjects" : "Enrolled subjects"}
                        </div>
                    </div>

                    {subLoading ? (
                        <div style={{ padding: 20, textAlign: "center" }}><LoadingSpinner size={24} /></div>
                    ) : subjects.length === 0 ? (
                        <div style={{ padding: "20px 16px", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
                            {myRole === "instructor" ? "Create subjects to start chats" : "Get enrolled to chat"}
                        </div>
                    ) : subjects.map(s => (
                        <button key={s.id} onClick={() => setActiveId(s.id)}
                            style={{
                                width: "100%", textAlign: "left",
                                padding: "12px 16px", border: "none",
                                background: activeId === s.id ? "var(--color-primary-light)" : "transparent",
                                borderLeft: activeId === s.id ? "3px solid var(--color-primary)" : "3px solid transparent",
                                cursor: "pointer",
                                transition: "all 120ms",
                                display: "flex", alignItems: "center", gap: 10,
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: activeId === s.id ? "var(--color-primary)" : "var(--bg-surface)",
                                color: activeId === s.id ? "#fff" : "var(--color-primary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 800, fontSize: "0.9rem",
                                border: activeId === s.id ? "none" : "1px solid var(--border-color)",
                            }}>{s.title.charAt(0).toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: "0.85rem", fontWeight: activeId === s.id ? 700 : 600,
                                    color: activeId === s.id ? "var(--color-primary)" : "var(--text-primary)",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{s.title}</div>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                    {s.is_public ? "Public" : "Private"}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── Right: Chat pane ── */}
                {!activeId ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "3rem" }}>💬</div>
                        <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-secondary)" }}>Select a subject to start chatting</div>
                        <div style={{ fontSize: "0.82rem" }}>Ask doubts, get help from your instructor</div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                        {/* Chat header */}
                        <div style={{
                            padding: "14px 20px", borderBottom: "1px solid var(--border-color)",
                            display: "flex", alignItems: "center", gap: 12,
                            background: "var(--bg-surface)",
                        }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: "var(--color-primary-light)", color: "var(--color-primary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 800, fontSize: "1rem", flexShrink: 0,
                            }}>{activeSubject?.title.charAt(0).toUpperCase()}</div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                    {activeSubject?.title || "Chat"}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                    Subject Q&amp;A · live
                                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#10b981", marginLeft: 6, verticalAlign: "middle" }} />
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                            {loading ? (
                                <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}><LoadingSpinner size={32} /></div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: "center", color: "var(--text-muted)", paddingTop: 60, fontSize: "0.88rem" }}>
                                    No messages yet — be the first to ask a question!
                                </div>
                            ) : grouped.map((item, idx) => {
                                if (item.type === "divider") {
                                    return (
                                        <div key={idx} style={{ textAlign: "center", margin: "12px 0 4px" }}>
                                            <span style={{
                                                fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)",
                                                background: "var(--bg-surface-2)", padding: "3px 12px",
                                                borderRadius: 99, border: "1px solid var(--border-color)",
                                            }}>{item.label}</span>
                                        </div>
                                    );
                                }
                                const m = item.data;
                                const isOwn = m.is_own;
                                const isInstructor = m.sender_role === "instructor";

                                return (
                                    <div key={m.id} style={{
                                        display: "flex",
                                        justifyContent: isOwn ? "flex-end" : "flex-start",
                                        marginBottom: 2,
                                    }}>
                                        <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: 2, alignItems: isOwn ? "flex-end" : "flex-start" }}>
                                            {!isOwn && (
                                                <div style={{ fontSize: "0.67rem", fontWeight: 700, color: isInstructor ? "var(--color-primary)" : "var(--text-muted)", paddingLeft: 4 }}>
                                                    {isInstructor ? "👨‍🏫 " : ""}{m.sender_name}
                                                </div>
                                            )}
                                            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                                                {!isOwn && (
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                                                        background: isInstructor ? "var(--color-primary)" : "var(--bg-surface-2)",
                                                        border: "1px solid var(--border-color)",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: "0.75rem", fontWeight: 700,
                                                        color: isInstructor ? "#fff" : "var(--text-secondary)",
                                                    }}>{m.sender_name.charAt(0).toUpperCase()}</div>
                                                )}
                                                <div style={{
                                                    padding: "10px 14px",
                                                    borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                                    background: isOwn ? "var(--color-primary)"
                                                        : isInstructor ? "var(--bg-surface-2)"
                                                            : "var(--bg-surface-2)",
                                                    border: `1px solid ${isOwn ? "transparent" : "var(--border-color)"}`,
                                                    color: isOwn ? "#fff" : "var(--text-primary)",
                                                    fontSize: "0.87rem", lineHeight: 1.5,
                                                    boxShadow: "var(--shadow-sm)",
                                                    wordBreak: "break-word",
                                                }}>
                                                    {m.content}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: isOwn ? 0 : 34, paddingRight: isOwn ? 4 : 0 }}>
                                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{formatTime(m.created_at)}</span>
                                                {isOwn && (
                                                    <button onClick={() => handleDelete(m.id)}
                                                        style={{ fontSize: "0.65rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                                    >Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input bar */}
                        <div style={{
                            padding: "12px 16px", borderTop: "1px solid var(--border-color)",
                            display: "flex", gap: 10, alignItems: "flex-end",
                            background: "var(--bg-surface)",
                        }}>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                                rows={1}
                                style={{
                                    flex: 1, resize: "none", border: "1.5px solid var(--border-color)",
                                    borderRadius: 12, padding: "10px 14px",
                                    background: "var(--bg-surface-2)", color: "var(--text-primary)",
                                    fontSize: "0.87rem", outline: "none",
                                    maxHeight: 120, overflowY: "auto",
                                    lineHeight: 1.5,
                                    fontFamily: "inherit",
                                }}
                                onFocus={e => e.target.style.borderColor = "var(--color-primary)"}
                                onBlur={e => e.target.style.borderColor = "var(--border-color)"}
                            />
                            <button onClick={handleSend} disabled={sending || !input.trim()}
                                style={{
                                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                    background: input.trim() ? "var(--color-primary)" : "var(--bg-surface-2)",
                                    border: "none", color: input.trim() ? "#fff" : "var(--text-muted)",
                                    cursor: input.trim() ? "pointer" : "default",
                                    fontSize: "1.2rem", transition: "all 150ms",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                            >{sending ? "…" : "↑"}</button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

export default ChatPage;
