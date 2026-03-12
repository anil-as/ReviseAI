import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { getMyProfile, updateMyProfile } from "../services/userService";
import { useToast } from "../components/Toast";
import { getErrorMessage } from "../services/errorUtils";

const AVATAR_GRADIENTS = [
    ["#2961FF", "#6366f1"],
    ["#8b5cf6", "#a78bfa"],
    ["#10b981", "#34d399"],
    ["#f59e0b", "#fbbf24"],
];

function ProfilePage() {
    const toast = useToast();
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ name: "", institution: "", admission_number: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        document.title = "My Profile — ReviseAI";
        (async () => {
            try {
                const res = await getMyProfile();
                setProfile(res.data);
                setForm({
                    name: res.data.name || "",
                    institution: res.data.institution || "",
                    admission_number: res.data.admission_number || "",
                });
            } catch (err) { toast(getErrorMessage(err, "Failed to load profile"), "error"); }
            finally { setLoading(false); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (field) => (e) => {
        setForm(p => ({ ...p, [field]: e.target.value }));
        setDirty(true); setSaved(false);
    };

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const res = await updateMyProfile({
                name: form.name.trim(),
                institution: form.institution.trim(),
                admission_number: form.admission_number.trim(),
            });
            setProfile(res.data); setDirty(false); setSaved(true);
            // Keep Navbar in sync — no page reload needed
            localStorage.setItem('user_name', form.name.trim());
            window.dispatchEvent(new Event('user-updated'));
            toast("✅ Profile saved!", "success");
            setTimeout(() => setSaved(false), 3000);
        } catch (err) { toast(getErrorMessage(err, "Failed to save profile"), "error"); }
        finally { setSaving(false); }
    };

    if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;

    const grad = AVATAR_GRADIENTS[(profile?.id || 0) % AVATAR_GRADIENTS.length];
    const initial = (form.name || profile?.name || "U").charAt(0).toUpperCase();
    const isStudent = profile?.role === "student";
    const profileComplete = form.institution.trim() && form.admission_number.trim();

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 580, margin: "0 auto" }}>

                {/* Avatar card */}
                <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
                    {/* Banner */}
                    <div style={{
                        height: 90,
                        background: `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`,
                        position: "relative",
                    }}>
                        <div style={{
                            position: "absolute", bottom: -36,
                            left: 28,
                            width: 72, height: 72, borderRadius: "50%",
                            background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 900, fontSize: "1.8rem", color: "#fff",
                            border: "4px solid var(--bg-surface)",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}>{initial}</div>
                    </div>

                    <div style={{ padding: "48px 28px 24px" }}>
                        <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-primary)" }}>
                            {form.name || "—"}
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{profile?.email}</span>
                            <span
                                className={`badge ${isStudent ? "badge-pending" : "badge-today"}`}
                                style={{ textTransform: "capitalize" }}
                            >
                                {profile?.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile tip banner for students */}
                {isStudent && !profileComplete && (
                    <div style={{
                        background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
                        border: "1px solid #c4b5fd",
                        borderRadius: "var(--border-radius-sm)",
                        padding: "12px 16px", fontSize: "0.85rem", color: "#5b21b6",
                        display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16,
                    }}>
                        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💡</span>
                        <span>
                            <strong>Tip:</strong> Fill in your Institution and Admission Number so they auto-fill when you request enrollment — no re-typing needed!
                        </span>
                    </div>
                )}
                {isStudent && profileComplete && (
                    <div style={{
                        background: "#d1fae5", border: "1px solid #86efac",
                        borderRadius: "var(--border-radius-sm)",
                        padding: "10px 16px", fontSize: "0.85rem", color: "#065f46",
                        display: "flex", gap: 10, alignItems: "center", marginBottom: 16,
                    }}>
                        <span>✅</span>
                        <span>Profile complete — enrollment forms will auto-fill from your saved details.</span>
                    </div>
                )}

                {/* Edit form card */}
                <div className="card" style={{ padding: 28 }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 22, color: "var(--text-primary)" }}>
                        Edit Information
                    </h2>
                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                        <div className="form-group">
                            <label className="form-label" htmlFor="prof-name">👤 Full Name</label>
                            <input
                                id="prof-name"
                                value={form.name}
                                onChange={handleChange("name")}
                                placeholder="Your full name"
                            />
                        </div>

                        {isStudent && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="prof-institution">🏛️ Institution</label>
                                    <input
                                        id="prof-institution"
                                        value={form.institution}
                                        onChange={handleChange("institution")}
                                        placeholder="e.g. St. Xavier's College"
                                    />
                                    <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 4 }}>
                                        Used when requesting enrollment in a subject
                                    </span>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="prof-admission">🪪 Admission Number</label>
                                    <input
                                        id="prof-admission"
                                        value={form.admission_number}
                                        onChange={handleChange("admission_number")}
                                        placeholder="e.g. 2024CS001"
                                    />
                                </div>
                            </>
                        )}

                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            <button
                                type="submit"
                                disabled={saving || !dirty}
                                className="btn-primary"
                                style={{
                                    padding: "12px 28px",
                                    background: saved
                                        ? "var(--color-success)"
                                        : (!dirty || saving) ? "var(--bg-surface-2)" : undefined,
                                    color: (!dirty && !saved) ? "var(--text-muted)" : undefined,
                                    boxShadow: (!dirty || saving) ? "none" : undefined,
                                    cursor: (!dirty || saving) ? "not-allowed" : "pointer",
                                    opacity: (!dirty && !saving && !saved) ? 0.7 : 1,
                                }}
                            >
                                {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
                            </button>
                            {dirty && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm({ name: profile.name || "", institution: profile.institution || "", admission_number: profile.admission_number || "" });
                                        setDirty(false);
                                    }}
                                    className="btn-ghost"
                                    style={{ padding: "12px 18px" }}
                                >
                                    Discard
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default ProfilePage;
