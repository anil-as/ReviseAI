import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Modal from "../../components/Modal";
import PdfViewerModal from "../../components/PdfViewerModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getTopics, createTopic, deleteTopic } from "../../services/topicService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";

const DIFF_MAP = {
    1: { label: "Easy", cls: "badge badge-easy" },
    2: { label: "Medium", cls: "badge badge-medium" },
    3: { label: "Hard", cls: "badge badge-hard" },
};

function TopicListPage() {
    const { subjectId } = useParams();
    const toast = useToast();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ title: "", difficulty_level: 1, file: null });
    const [saving, setSaving] = useState(false);

    // PDF Viewer State
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfData, setPdfData] = useState({ url: "", title: "" });

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, topicId: null, topicName: "" });
    const [deleting, setDeleting] = useState(false);

    const handleViewPdf = (url, title) => {
        setPdfData({ url, title });
        setPdfModalOpen(true);
    };

    const load = async () => {
        try { const res = await getTopics(subjectId); setTopics(res.data); }
        catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        document.title = "Topics — ReviseAI";
        load();
    }, [subjectId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.file) { toast("Please select a PDF file", "warning"); return; }
        setSaving(true);
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("difficulty_level", form.difficulty_level);
        fd.append("file", form.file);
        try {
            await createTopic(subjectId, fd);
            toast("Topic uploaded!", "success");
            setModal(false);
            setForm({ title: "", difficulty_level: 1, file: null });
            load();
        } catch (err) { toast(getErrorMessage(err, "Upload failed"), "error"); }
        finally { setSaving(false); }
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
                    to="/student/subjects"
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "inline-block", marginBottom: 10 }}
                >
                    ← Back to Subjects
                </Link>
                <h1>📄 Topics</h1>
                <p>{topics.length} topic{topics.length !== 1 ? "s" : ""} in this subject</p>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <button
                    onClick={() => setModal(true)}
                    aria-label="Upload new topic PDF"
                    className="btn-primary"
                    style={{ padding: "10px 22px", fontSize: "0.9rem" }}
                >
                    + Upload PDF
                </button>
            </div>

            {/* Topic list */}
            {topics.length === 0 && !loading ? (
                <div className="empty-state">
                    <div className="empty-icon">📄</div>
                    <h3>No topics yet</h3>
                    <p>Upload a PDF to create your first topic</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {topics.map(topic => {
                        const diff = DIFF_MAP[topic.difficulty_level] || DIFF_MAP[1];
                        return (
                            <article
                                key={topic.id}
                                className="card animate-fadeIn"
                                aria-label={`Topic: ${topic.title}`}
                                style={{
                                    padding: "18px 22px",
                                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: "0.97rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {topic.title}
                                    </h3>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <span className={diff.cls}>{diff.label}</span>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                            📅 {new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    {topic.file_path && (
                                        <button onClick={() => handleViewPdf(topic.file_path, topic.title)}
                                            aria-label={`View PDF for ${topic.title}`}
                                            className="btn-secondary" style={{ padding: "8px 18px", fontSize: "0.85rem" }}>
                                            📄 View Topic
                                        </button>
                                    )}
                                    <Link
                                        to={`/student/assessment/${topic.id}`}
                                        aria-label={`Start assessment for ${topic.title}`}
                                        className="btn-primary"
                                        style={{ padding: "8px 18px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center" }}
                                    >
                                        Take Assessment →
                                    </Link>
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: true, topicId: topic.id, topicName: topic.title })}
                                        aria-label={`Delete ${topic.title}`}
                                        className="btn-danger"
                                        style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                                    >
                                        🗑
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Upload Modal */}
            <Modal isOpen={modal} onClose={() => setModal(false)} title="Upload Topic PDF">
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-title">Topic title</label>
                        <input
                            id="topic-title"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Binary Trees"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-difficulty">Difficulty level</label>
                        <select
                            id="topic-difficulty"
                            value={form.difficulty_level}
                            onChange={e => setForm({ ...form, difficulty_level: parseInt(e.target.value) })}
                        >
                            <option value={1}>Easy</option>
                            <option value={2}>Medium</option>
                            <option value={3}>Hard</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="topic-file">PDF file</label>
                        <input
                            id="topic-file"
                            type="file"
                            accept=".pdf"
                            onChange={e => setForm({ ...form, file: e.target.files[0] })}
                            required
                        />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "12px", fontSize: "0.95rem" }}>
                        {saving ? <><span className="spinner" /> Uploading…</> : "Upload Topic"}
                    </button>
                </form>
            </Modal>

            <PdfViewerModal
                isOpen={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                fileUrl={pdfData.url}
                title={pdfData.title}
            />

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

export default TopicListPage;
