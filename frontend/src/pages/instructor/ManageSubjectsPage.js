import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Modal from "../../components/Modal";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getMySubjects, createSubject, updateSubject, deleteSubject } from "../../services/subjectService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";

const COLORS = ["#2961FF", "#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#3b82f6", "#ef4444"];
const colorFor = (id) => COLORS[id % COLORS.length];

function ManageSubjectsPage() {
    const toast = useToast();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [editModal, setEditModal] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try { const res = await getMySubjects(); setSubjects(res.data); }
        catch { } finally { setLoading(false); }
    };
    useEffect(() => { document.title = "Manage Subjects — ReviseAI"; load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault(); setSaving(true);
        try { await createSubject({ title: newTitle.trim() }); toast("Subject created!", "success"); setNewTitle(""); setCreateModal(false); load(); }
        catch (err) { toast(getErrorMessage(err, "Failed"), "error"); }
        finally { setSaving(false); }
    };

    const handleEdit = async (e) => {
        e.preventDefault(); setSaving(true);
        try { await updateSubject(editModal.id, { title: editTitle.trim() }); toast("Updated!", "success"); setEditModal(null); load(); }
        catch (err) { toast(getErrorMessage(err, "Failed"), "error"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this subject and all its topics?")) return;
        try { await deleteSubject(id); toast("Deleted", "success"); load(); }
        catch { toast("Error deleting", "error"); }
    };

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {/* Hero */}
            <div className="page-hero">
                <h1>📚 Manage Subjects</h1>
                <p>{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <button
                    onClick={() => setCreateModal(true)}
                    aria-label="Create new subject"
                    className="btn-primary"
                    style={{ padding: "10px 22px", fontSize: "0.9rem" }}
                >
                    + New Subject
                </button>
            </div>

            {subjects.length === 0 && !loading ? (
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h3>No subjects yet</h3>
                    <p>Create your first subject to begin!</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {subjects.map(s => (
                        <article
                            key={s.id}
                            className="card animate-fadeIn"
                            aria-label={`Subject: ${s.title}`}
                            style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}
                        >
                            <div style={{
                                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                                background: `${colorFor(s.id)}22`, color: colorFor(s.id),
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 800, fontSize: "1.1rem",
                            }}>{s.title.charAt(0).toUpperCase()}</div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: "0.97rem", fontWeight: 700, marginBottom: 3, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {s.title}
                                </h3>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    {new Date(s.created_at).toLocaleDateString()} ·{" "}
                                    <span className={`badge ${s.is_public ? "badge-approved" : "badge-pending"}`} style={{ fontSize: "0.65rem", padding: "1px 8px" }}>
                                        {s.is_public ? "Public" : "Private"}
                                    </span>
                                </p>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                <Link
                                    to={`/instructor/subjects/${s.id}/topics`}
                                    aria-label={`Manage topics for ${s.title}`}
                                    className="btn-ghost"
                                    style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                                >
                                    Topics →
                                </Link>
                                <Link
                                    to={`/instructor/analytics?subject=${s.id}`}
                                    aria-label={`View analytics for ${s.title}`}
                                    className="btn-secondary"
                                    style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                                >
                                    Analytics
                                </Link>
                                <button
                                    onClick={() => { setEditModal(s); setEditTitle(s.title); }}
                                    aria-label={`Edit ${s.title}`}
                                    style={{ background: "#fef3c7", color: "#92400e", padding: "7px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.82rem", fontWeight: 600 }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    aria-label={`Delete ${s.title}`}
                                    className="btn-danger"
                                    style={{ padding: "7px 12px", fontSize: "0.82rem" }}
                                >
                                    🗑
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Subject">
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="new-subject">Subject title</label>
                        <input id="new-subject" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Operating Systems" required />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "12px" }}>
                        {saving ? <><span className="spinner" /> Creating…</> : "Create Subject"}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Subject">
                <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-subject">Subject title</label>
                        <input id="edit-subject" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "12px" }}>
                        {saving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
                    </button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}

export default ManageSubjectsPage;
