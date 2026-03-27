import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/DashboardLayout";
import Modal from "../../components/Modal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getTopics, updateTopic, deleteTopic } from "../../services/topicService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";
import { useUploads } from "../../contexts/UploadContext";

const TYPE_MAP = {
    theory: { label: "Theory / General", cls: "badge badge-easy" },
    coding: { label: "Programming / Coding", cls: "badge badge-hard" },
};

function ManageTopicsPage() {
    const { subjectId } = useParams();
    const toast = useToast();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create modal
    const { activeUploads, startUpload } = useUploads();
    const [createModal, setCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ title: "", topic_type: "theory", file: null });

    // Edit modal
    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ id: null, title: "", topic_type: "theory" });
    const [editSaving, setEditSaving] = useState(false);

    // Delete Confirm Modal
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, topicId: null, topicName: "" });
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        try { const res = await getTopics(subjectId); setTopics(res.data); }
        catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        document.title = "Manage Topics — ReviseAI";
        // eslint-disable-next-line react-hooks/exhaustive-deps
        load();
    }, [subjectId]);

    // ── Create ──────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createForm.file) { toast("Please select a PDF file", "warning"); return; }
        
        const fd = new FormData();
        fd.append("title", createForm.title);
        fd.append("topic_type", createForm.topic_type);
        fd.append("file", createForm.file);

        startUpload(subjectId, fd, () => {
            load();
        });
        
        toast("Upload started in background", "success");
        setCreateModal(false);
        setCreateForm({ title: "", topic_type: "theory", file: null });
    };

    // ── Edit ────────────────────────────────────────
    const openEdit = (t) => {
        setEditForm({ id: t.id, title: t.title, topic_type: t.topic_type || "theory" });
        setEditModal(true);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editForm.title.trim()) { toast("Title cannot be empty", "warning"); return; }
        setEditSaving(true);
        try {
            await updateTopic(editForm.id, { title: editForm.title.trim(), topic_type: editForm.topic_type });
            toast("Topic updated!", "success");
            setEditModal(false);
            load();
        } catch (err) { toast(getErrorMessage(err, "Update failed"), "error"); }
        finally { setEditSaving(false); }
    };

    // ── Delete ──────────────────────────────────────
    const confirmDelete = async (clearData) => {
        setDeleting(true);
        try {
            await deleteTopic(deleteModal.topicId, clearData);
            toast("Topic deleted", "success");
            load();
        } catch (err) {
            toast(getErrorMessage(err, "Error deleting"), "error");
        } finally {
            setDeleting(false);
            setDeleteModal({ isOpen: false, topicId: null, topicName: "" });
        }
    };

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {/* Hero */}
            <div className="page-hero">
                <Link
                    to="/instructor/subjects"
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "inline-block", marginBottom: 10 }}
                >
                    ← Back to Subjects
                </Link>
                <h1>📄 Manage Topics</h1>
                <p>{topics.length} topic{topics.length !== 1 ? "s" : ""} in this subject</p>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <button
                    onClick={() => setCreateModal(true)}
                    aria-label="Upload new topic PDF"
                    className="btn-primary"
                    style={{ padding: "10px 22px", fontSize: "0.9rem" }}
                >
                    + Upload PDF
                </button>
            </div>

            {topics.length === 0 && Object.values(activeUploads).length === 0 && !loading ? (
                <div className="empty-state">
                    <div className="empty-icon">📄</div>
                    <h3>No topics yet</h3>
                    <p>Upload a PDF to create the first topic for students.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Active Uploads */}
                    {Object.values(activeUploads).map(u => (
                        <article key={u.id} className="card" style={{ padding: "18px 22px", border: "1px dashed var(--color-primary)", opacity: 0.8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {u.status === 'completed' ? '✅' : <div className="spinner" style={{ width: 18, height: 18 }} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>{u.title}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                        {u.status === 'completed' ? 'Processing complete!' : `Uploading topic... ${u.progress}%`}
                                    </div>
                                    <div style={{ width: "100%", height: 6, background: "var(--bg-surface-3)", borderRadius: 10, marginTop: 8, overflow: "hidden" }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${u.progress}%` }}
                                            style={{ height: "100%", background: "var(--color-primary)", borderRadius: 10 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}

                    {/* Existing Topics */}
                    {topics.map(t => {
                        const tType = TYPE_MAP[t.topic_type] || TYPE_MAP.theory;
                        return (
                            <article
                                key={t.id}
                                className="card animate-fadeIn"
                                aria-label={`Topic: ${t.title}`}
                                style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}
                            >
                                <div style={{
                                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                    background: "var(--color-primary-light)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1.2rem",
                                }}>📄</div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: "0.97rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {t.title}
                                    </h3>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <span className={tType.cls}>{tType.label}</span>
                                        <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                                            📅 {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                                    <button
                                        onClick={() => openEdit(t)}
                                        aria-label={`Edit ${t.title}`}
                                        style={{
                                            padding: "8px 14px", fontSize: "0.82rem", fontWeight: 700,
                                            background: "var(--bg-surface-2)",
                                            color: "var(--text-secondary)",
                                            border: "1.5px solid var(--border-color)",
                                            borderRadius: 8, cursor: "pointer",
                                            transition: "all 150ms",
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                                    >
                                        ✏ Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: true, topicId: t.id, topicName: t.title })}
                                        aria-label={`Delete ${t.title}`}
                                        className="btn-danger"
                                        style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                                    >
                                        🗑 Delete
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* ── Create Modal ── */}
            <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Upload Topic PDF">
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-title">Topic title</label>
                        <input id="topic-title" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Process Scheduling" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-type">Topic Type</label>
                        <select
                            id="topic-type"
                            value={createForm.topic_type}
                            onChange={e => setCreateForm({ ...createForm, topic_type: e.target.value })}
                        >
                            <option value="theory">📖 Theory / General</option>
                            <option value="coding">🖥️ Programming / Coding</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-file">PDF file</label>
                        <input id="topic-file" type="file" accept=".pdf" onChange={e => setCreateForm({ ...createForm, file: e.target.files[0] })} required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ padding: "12px" }}>
                        Upload Topic
                    </button>
                </form>
            </Modal>

            {/* ── Edit Modal ── */}
            <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Topic">
                <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-topic-title">Topic title</label>
                        <input
                            id="edit-topic-title"
                            value={editForm.title}
                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            placeholder="e.g. Process Scheduling"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-type">Topic Type</label>
                        <select
                            id="topic-type"
                            value={editForm.topic_type}
                            onChange={e => setEditForm({ ...editForm, topic_type: e.target.value })}
                        >
                            <option value="theory">📖 Theory / General</option>
                            <option value="coding">🖥️ Programming / Coding</option>
                        </select>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: -8 }}>
                        Note: to change the PDF content, delete this topic and re-upload.
                    </p>
                    <button type="submit" disabled={editSaving} className="btn-primary" style={{ padding: "12px" }}>
                        {editSaving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
                    </button>
                </form>
            </Modal>

            <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, topicId: null, topicName: "" })}
                onConfirm={confirmDelete}
                itemName={deleteModal.topicName}
                isDeleting={deleting}
            />
        </DashboardLayout>
    );
}

export default ManageTopicsPage;
