import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getMySubjects } from "../../services/subjectService";
import { approveEnrollment, rejectEnrollment } from "../../services/enrollmentService";
import { useToast } from "../../components/Toast";
import API from "../../services/api";
import { getErrorMessage } from "../../services/errorUtils";

function EnrollmentRequestsPage() {
    const toast = useToast();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const subRes = await getMySubjects();
            const all = [];
            await Promise.all((subRes.data || []).map(async (s) => {
                try {
                    const res = await API.get(`/enrollments/subject/${s.id}`);
                    (res.data || []).filter(e => e.status === "pending").forEach(e =>
                        all.push({ ...e, subject_title: s.title })
                    );
                } catch { }
            }));
            setEnrollments(all);
        } catch (err) {
            toast(getErrorMessage(err, "Failed to load requests"), "error");
        } finally { setLoading(false); }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { document.title = "Enrollments — ReviseAI"; load(); }, []);

    const handleApprove = async (id) => {
        setActionId(id);
        try { await approveEnrollment(id); toast("Approved! Student can now access the subject.", "success"); setEnrollments(prev => prev.filter(e => e.id !== id)); }
        catch (err) { toast(getErrorMessage(err, "Failed to approve"), "error"); }
        finally { setActionId(null); }
    };

    const handleReject = async (id) => {
        setActionId(id);
        try { await rejectEnrollment(id); toast("Request rejected.", "info"); setEnrollments(prev => prev.filter(e => e.id !== id)); }
        catch (err) { toast(getErrorMessage(err, "Failed to reject"), "error"); }
        finally { setActionId(null); }
    };

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {/* Hero */}
            <div className="page-hero">
                <h1>👥 Enrollment Requests</h1>
                <p>{enrollments.length} pending request{enrollments.length !== 1 ? "s" : ""}</p>
            </div>

            {!loading && enrollments.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <h3>All clear!</h3>
                    <p>No pending enrollment requests right now.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {enrollments.map(e => (
                        <article
                            key={e.id}
                            className="card animate-fadeIn"
                            aria-label={`Enrollment request from ${e.student_name || "Student"}`}
                            style={{ padding: "20px 22px" }}
                        >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                                {/* Avatar */}
                                <div style={{
                                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                                    background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
                                    color: "#fff",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 800, fontSize: "1.1rem",
                                }}>
                                    {e.student_name ? e.student_name.charAt(0).toUpperCase() : "S"}
                                </div>

                                {/* Details */}
                                <div style={{ flex: 1, minWidth: 180 }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                                        {e.student_name || `Student #${e.student_id}`}
                                    </h3>

                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                                        {e.institution && (
                                            <span style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, padding: "3px 12px", borderRadius: "var(--radius-pill)" }}>
                                                🏫 {e.institution}
                                            </span>
                                        )}
                                        {e.admission_number && (
                                            <span style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, padding: "3px 12px", borderRadius: "var(--radius-pill)" }}>
                                                🪪 {e.admission_number}
                                            </span>
                                        )}
                                        <span className="badge badge-pending">Pending</span>
                                    </div>

                                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        Subject: <strong style={{ color: "var(--text-secondary)" }}>{e.subject_title}</strong>
                                        {" · "}
                                        {e.requested_at ? new Date(e.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                                    <button
                                        onClick={() => handleApprove(e.id)}
                                        disabled={actionId === e.id}
                                        aria-label={`Approve enrollment for ${e.student_name}`}
                                        className="btn-success"
                                        style={{ padding: "9px 20px", fontSize: "0.87rem", fontWeight: 700 }}
                                    >
                                        {actionId === e.id ? "…" : "Approve ✓"}
                                    </button>
                                    <button
                                        onClick={() => handleReject(e.id)}
                                        disabled={actionId === e.id}
                                        aria-label={`Reject enrollment for ${e.student_name}`}
                                        className="btn-danger"
                                        style={{ padding: "9px 20px", fontSize: "0.87rem", fontWeight: 700 }}
                                    >
                                        Reject ✕
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

export default EnrollmentRequestsPage;
