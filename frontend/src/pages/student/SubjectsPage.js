import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Modal from "../../components/Modal";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getMySubjects, getEnrolledSubjects, createSubject, deleteSubject } from "../../services/subjectService";
import { unenrollSubject } from "../../services/enrollmentService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";

const SUBJECT_COLORS = ["#2961FF", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];
const colorFor = (id) => SUBJECT_COLORS[id % SUBJECT_COLORS.length];

function SubjectCard({ subject, showDelete, showUnenroll, onDelete, onUnenroll }) {
    const color = colorFor(subject.id);
    const created = new Date(subject.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    return (
        <article
            className="card animate-fadeIn"
            aria-label={`Subject: ${subject.title}`}
            style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: 14 }}
        >
            {/* Color bar */}
            <div style={{ width: "100%", height: 4, borderRadius: 99, background: color, opacity: 0.7, marginBottom: 2 }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", flex: 1, lineHeight: 1.3 }}>
                    {subject.title}
                </h3>
                <span className={`badge ${subject.is_public ? "badge-approved" : "badge-pending"}`}>
                    {subject.is_public ? "Public" : "Private"}
                </span>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                📅 Created {created}
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Link
                    to={`/student/subjects/${subject.id}/topics`}
                    aria-label={`View topics for ${subject.title}`}
                    className="btn-primary"
                    style={{ flex: 1, textAlign: "center", padding: "9px 12px", fontSize: "0.85rem" }}
                >
                    View Topics →
                </Link>
                {showDelete && (
                    <button
                        onClick={() => onDelete(subject.id)}
                        aria-label={`Delete ${subject.title}`}
                        className="btn-danger"
                        style={{ padding: "9px 14px", fontSize: "0.82rem" }}
                    >
                        🗑
                    </button>
                )}
                {showUnenroll && (
                    <button
                        onClick={() => onUnenroll(subject.id)}
                        aria-label={`Unenroll from ${subject.title}`}
                        className="btn-secondary"
                        style={{ padding: "9px 14px", fontSize: "0.82rem", color: "#ef4444", borderColor: "#fca5a5", background: "#fef2f2" }}
                    >
                        Unenroll
                    </button>
                )}
            </div>
        </article>
    );
}

function SubjectsPage() {
    const toast = useToast();
    const [mySubjects, setMySubjects] = useState([]);
    const [publicSubjects, setPublicSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState("my");

    const load = async () => {
        try {
            const [mine, enrolled] = await Promise.all([getMySubjects(), getEnrolledSubjects()]);
            setMySubjects(mine.data);
            setPublicSubjects(enrolled.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { document.title = "Subjects — ReviseAI"; load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setSaving(true);
        try {
            await createSubject({ title: newTitle.trim() });
            toast("Subject created!", "success");
            setNewTitle(""); setModal(false); load();
        } catch (err) { toast(getErrorMessage(err, "Failed to create"), "error"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this subject?")) return;
        try { await deleteSubject(id); toast("Subject deleted", "success"); load(); }
        catch (err) { toast(getErrorMessage(err, "Error deleting"), "error"); }
    };

    const handleUnenroll = async (id) => {
        if (!window.confirm("Are you sure you want to unenroll from this subject? You will lose related topic progress.")) return;
        try { await unenrollSubject(id); toast("Successfully unenrolled", "success"); load(); }
        catch (err) { toast(getErrorMessage(err, "Error unenrolling"), "error"); }
    };

    const displayed = tab === "my" ? mySubjects : publicSubjects;

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {/* Hero */}
            <div className="page-hero">
                <h1>📚 Subjects</h1>
                <p>Manage your learning subjects and topics</p>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 6, background: "var(--bg-surface-2)", padding: 4, borderRadius: "var(--radius-pill)" }}>
                    {[["my", "My Subjects"], ["enrolled", "Enrolled"]].map(([key, lbl]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            aria-pressed={tab === key}
                            style={{
                                background: tab === key ? "var(--bg-surface)" : "transparent",
                                color: tab === key ? "var(--color-primary)" : "var(--text-secondary)",
                                fontWeight: tab === key ? 700 : 500,
                                padding: "7px 18px",
                                borderRadius: "var(--radius-pill)",
                                fontSize: "0.875rem",
                                boxShadow: tab === key ? "var(--shadow-sm)" : "none",
                                transition: "all var(--transition-fast)",
                            }}
                        >{lbl}</button>
                    ))}
                </div>
                {tab === "my" && (
                    <button
                        onClick={() => setModal(true)}
                        aria-label="Create new subject"
                        className="btn-primary"
                        style={{ padding: "10px 22px", fontSize: "0.9rem" }}
                    >
                        + New Subject
                    </button>
                )}
            </div>

            {/* Grid */}
            {displayed.length === 0 && !loading ? (
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h3>{tab === "my" ? "No subjects yet" : "No enrolled subjects"}</h3>
                    <p>{tab === "my" ? "Create your first subject to get started!" : "Enroll in a subject to see it here."}</p>
                </div>
            ) : (
                <div className="grid-cards">
                    {displayed.map(s => (
                        <SubjectCard
                            key={s.id}
                            subject={s}
                            showDelete={tab === "my"}
                            onDelete={handleDelete}
                            showUnenroll={tab === "enrolled"}
                            onUnenroll={handleUnenroll}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={modal} onClose={() => setModal(false)} title="New Subject">
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="subject-title">Subject title</label>
                        <input
                            id="subject-title"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="e.g. Data Structures"
                            required
                        />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "12px", fontSize: "0.95rem" }}>
                        {saving ? <><span className="spinner" /> Creating…</> : "Create Subject"}
                    </button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}

export default SubjectsPage;
