import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getPublicSubjects } from "../../services/subjectService";
import { requestEnrollment, getMyEnrollments, unenrollSubject } from "../../services/enrollmentService";
import { getMyProfile } from "../../services/userService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";

/* ─────────────────────────────────────────────────────────────
   ENROLLMENT MODAL — floating panel, step-by-step feel
   ───────────────────────────────────────────────────────────── */
function EnrollmentModal({ subject, onClose, onSubmit, submitting, prefill, startOnConfirm }) {
    const [form, setForm] = useState({
        student_name: prefill?.student_name || "",
        institution: prefill?.institution || "",
        admission_number: prefill?.admission_number || "",
    });
    const [touched, setTouched] = useState({});
    // If profile is complete, open directly on confirmation step
    const [step, setStep] = useState(startOnConfirm ? 1 : 0);
    const firstInputRef = useRef(null);

    useEffect(() => {
        // Lock body scroll while modal open
        document.body.style.overflow = "hidden";
        if (!startOnConfirm) setTimeout(() => firstInputRef.current?.focus(), 120);
        return () => { document.body.style.overflow = ""; };
    }, [startOnConfirm]);

    const fields = [
        { key: "student_name", label: "Full Name", placeholder: "e.g. Anil Kumar", icon: "👤" },
        { key: "institution", label: "Institution", placeholder: "e.g. St. Xavier's", icon: "🏛️" },
        { key: "admission_number", label: "Admission No.", placeholder: "e.g. 2024CS001", icon: "🪪" },
    ];

    const errors = {
        student_name: !form.student_name.trim() ? "Required" : "",
        institution: !form.institution.trim() ? "Required" : "",
        admission_number: !form.admission_number.trim() ? "Required" : "",
    };
    const hasErrors = Object.values(errors).some(Boolean);

    const handleChange = (key) => (e) => {
        setForm(p => ({ ...p, [key]: e.target.value }));
        setTouched(p => ({ ...p, [key]: true }));
    };

    const handleNext = (e) => {
        e.preventDefault();
        setTouched({ student_name: true, institution: true, admission_number: true });
        if (!hasErrors) setStep(1);
    };

    const handleSubmit = () => onSubmit(form);

    // Keyboard: Escape to close
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);


    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 24,
                animation: "fadeIn 180ms ease both",
            }}
        >
            <div style={{
                width: "100%", maxWidth: 440,
                background: "var(--bg-surface)",
                borderRadius: 24,
                boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                overflow: "hidden",
                animation: "scaleIn 220ms cubic-bezier(.34,1.56,.64,1) both",
                border: "1px solid var(--border-color)",
            }}>
                {/* ── Top gradient band ── */}
                <div style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                    padding: "28px 32px 24px",
                    position: "relative",
                }}>
                    {/* Close */}
                    <button
                        onClick={onClose}
                        style={{
                            position: "absolute", top: 14, right: 14,
                            width: 32, height: 32, borderRadius: "50%",
                            background: "rgba(255,255,255,0.18)",
                            color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "none", cursor: "pointer",
                            transition: "background 150ms",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                    >✕</button>

                    {/* Subject icon */}
                    <div style={{
                        width: 46, height: 46, borderRadius: 14,
                        background: "rgba(255,255,255,0.22)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.4rem", fontWeight: 900, color: "#fff",
                        marginBottom: 14,
                        backdropFilter: "blur(4px)",
                    }}>
                        {subject.title.charAt(0).toUpperCase()}
                    </div>
                    <h2 style={{ color: "#fff", fontSize: "1.15rem", fontWeight: 800, marginBottom: 4 }}>
                        {step === 0 ? "Request Enrollment" : "Confirm & Send"}
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                        {subject.title}
                    </p>

                    {/* Step dots */}
                    <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                        {[0, 1].map(i => (
                            <div key={i} style={{
                                height: 3, flex: i === 0 ? 2 : 1,
                                borderRadius: 99,
                                background: step >= i ? "#fff" : "rgba(255,255,255,0.3)",
                                transition: "background 300ms",
                            }} />
                        ))}
                    </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: "28px 32px 32px" }}>
                    {step === 0 ? (
                        /* ── Step 1: Form ── */
                        <form onSubmit={handleNext} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            {fields.map((f, idx) => {
                                const err = touched[f.key] && errors[f.key];
                                return (
                                    <div key={f.key}>
                                        <label style={{
                                            display: "flex", alignItems: "center", gap: 6,
                                            fontSize: "0.78rem", fontWeight: 700,
                                            color: "var(--text-secondary)",
                                            letterSpacing: "0.04em", textTransform: "uppercase",
                                            marginBottom: 7,
                                        }}>
                                            <span>{f.icon}</span> {f.label}
                                        </label>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                ref={idx === 0 ? firstInputRef : null}
                                                type="text"
                                                placeholder={f.placeholder}
                                                value={form[f.key]}
                                                onChange={handleChange(f.key)}
                                                onBlur={() => setTouched(p => ({ ...p, [f.key]: true }))}
                                                style={{
                                                    paddingLeft: 14,
                                                    borderColor: err ? "var(--color-danger)" : form[f.key] ? "var(--color-primary)" : "var(--border-color)",
                                                    borderRadius: 10,
                                                    background: "var(--bg-surface-2)",
                                                    transition: "all 150ms",
                                                }}
                                            />
                                            {form[f.key] && !err && (
                                                <span style={{
                                                    position: "absolute", right: 12, top: "50%",
                                                    transform: "translateY(-50%)",
                                                    color: "var(--color-success)", fontSize: "0.85rem",
                                                }}>✓</span>
                                            )}
                                        </div>
                                        {err && (
                                            <p style={{ fontSize: "0.72rem", color: "var(--color-danger)", marginTop: 4, paddingLeft: 2 }}>
                                                ⚠ {err}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}

                            <button type="submit" style={{
                                marginTop: 6,
                                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                                color: "#fff",
                                padding: "12px", borderRadius: 12,
                                fontWeight: 700, fontSize: "0.9rem",
                                letterSpacing: "0.01em",
                                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                                transition: "opacity 150ms, transform 150ms",
                            }}>
                                Review & Confirm →
                            </button>
                        </form>
                    ) : (
                        /* ── Step 2: Confirm ── */
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                Please review your details before sending the request to the instructor.
                            </p>

                            <div style={{
                                background: "var(--bg-surface-2)",
                                borderRadius: 14, overflow: "hidden",
                                border: "1px solid var(--border-color)",
                            }}>
                                {[
                                    { icon: "👤", label: "Name", value: form.student_name },
                                    { icon: "🏛️", label: "Institution", value: form.institution },
                                    { icon: "🪪", label: "Admission No.", value: form.admission_number },
                                ].map((row, i, arr) => (
                                    <div key={row.label} style={{
                                        display: "flex", alignItems: "center", gap: 12,
                                        padding: "13px 16px",
                                        borderBottom: i < arr.length - 1 ? "1px solid var(--border-color)" : "none",
                                    }}>
                                        <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center" }}>{row.icon}</span>
                                        <div>
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                {row.label}
                                            </div>
                                            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginTop: 1 }}>
                                                {row.value}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    onClick={() => setStep(0)}
                                    disabled={submitting}
                                    style={{
                                        flex: 1, background: "var(--bg-surface-2)",
                                        color: "var(--text-secondary)",
                                        padding: "12px", borderRadius: 12,
                                        fontWeight: 700, fontSize: "0.875rem",
                                    }}
                                >
                                    ← Edit
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    style={{
                                        flex: 2,
                                        background: submitting ? "var(--bg-surface-2)" : "linear-gradient(135deg, #6366f1, #818cf8)",
                                        color: submitting ? "var(--text-muted)" : "#fff",
                                        padding: "12px", borderRadius: 12,
                                        fontWeight: 700, fontSize: "0.875rem",
                                        boxShadow: submitting ? "none" : "0 4px 16px rgba(99,102,241,0.35)",
                                        transition: "all 200ms",
                                    }}
                                >
                                    {submitting ? "Sending…" : "Send Request ✦"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   SUBJECT CARD
   ───────────────────────────────────────────────────────────── */
function SubjectCard({ subject, isEnrolled, onEnroll, onUnenroll, style }) {
    const [hovered, setHov] = useState(false);

    const colors = [
        ["#6366f1", "#818cf8"],
        ["#8b5cf6", "#a78bfa"],
        ["#ec4899", "#f472b6"],
        ["#0ea5e9", "#38bdf8"],
        ["#14b8a6", "#2dd4bf"],
        ["#f59e0b", "#fbbf24"],
    ];
    const pair = colors[(subject.id || 0) % colors.length];

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 18,
                overflow: "hidden",
                display: "flex", flexDirection: "column",
                transition: "transform 220ms cubic-bezier(.34,1.56,.64,1), box-shadow 220ms",
                transform: hovered ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hovered ? `0 20px 50px rgba(0,0,0,0.13)` : "var(--shadow-sm)",
                cursor: isEnrolled ? "default" : "pointer",
                ...style,
            }}
            onClick={!isEnrolled ? onEnroll : undefined}
        >
            {/* Coloured header band */}
            <div style={{
                background: `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`,
                padding: "22px 22px 18px",
                position: "relative",
                overflow: "hidden",
            }}>
                {/* background circle decoration */}
                <div style={{
                    position: "absolute", bottom: -18, right: -18,
                    width: 80, height: 80, borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)",
                }} />
                <div style={{
                    position: "absolute", top: -10, right: 30,
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                }} />

                {/* Icon letter */}
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "rgba(255,255,255,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: "1.2rem", color: "#fff",
                    backdropFilter: "blur(4px)",
                    marginBottom: 12,
                }}>
                    {subject.title.charAt(0).toUpperCase()}
                </div>

                <h3 style={{
                    color: "#fff", fontSize: "0.95rem", fontWeight: 800,
                    lineHeight: 1.3, marginBottom: 4,
                }}>
                    {subject.title}
                </h3>
                <span style={{
                    fontSize: "0.7rem", color: "rgba(255,255,255,0.75)",
                    fontWeight: 600, letterSpacing: "0.04em",
                    textTransform: "uppercase",
                }}>
                    📅 {new Date(subject.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
            </div>

            {/* Footer */}
            <div style={{
                padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
                <span style={{
                    fontSize: "0.72rem", fontWeight: 700,
                    color: "var(--color-success)",
                    background: "#dcfce7", padding: "2px 9px", borderRadius: 99,
                }}>
                    Public
                </span>

                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: "0.8rem", fontWeight: 700,
                    color: isEnrolled ? "var(--text-muted)" : `${pair[0]}`,
                    transition: "gap 200ms",
                }}>
                    {isEnrolled ? (
                        <>
                            <span style={{ color: "var(--color-success)" }}>✓</span>
                            <span style={{ color: "var(--text-muted)", marginRight: 6 }}>Enrolled</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onUnenroll(subject.id); }}
                                style={{
                                    background: "none", border: "1px solid #fca5a5", color: "#ef4444",
                                    borderRadius: 6, padding: "2px 8px", fontSize: "0.7rem", cursor: "pointer",
                                    fontWeight: "bold", marginLeft: "auto"
                                }}
                            >
                                Unenroll
                            </button>
                        </>
                    ) : (
                        <>
                            <span>Enroll</span>
                            <span style={{ transform: hovered ? "translateX(3px)" : "translateX(0)", display: "inline-block", transition: "transform 200ms" }}>→</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
function EnrollPage() {
    const toast = useToast();
    const [subjects, setSubjects] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalSubject, setModalSubject] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [enrolled, setEnrolled] = useState(new Set());
    const [search, setSearch] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [subRes, profRes, enrollRes] = await Promise.all([
                    getPublicSubjects(),
                    getMyProfile(),
                    getMyEnrollments(),
                ]);
                setSubjects(subRes.data || []);
                setProfile(profRes.data);
                // Pre-populate enrolled set from server data
                const myEnrollmentIds = new Set(
                    (enrollRes.data || []).map(e => e.subject_id)
                );
                setEnrolled(myEnrollmentIds);
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    // Build prefill from profile
    const profilePrefill = profile ? {
        student_name: profile.name || "",
        institution: profile.institution || "",
        admission_number: profile.admission_number || "",
    } : null;

    const profileComplete = !!(profile?.institution && profile?.admission_number);

    const handleModalSubmit = async (details) => {
        if (!modalSubject) return;
        setSubmitting(true);
        try {
            await requestEnrollment(modalSubject.id, details);
            setEnrolled(prev => new Set([...prev, modalSubject.id]));
            toast("🎉 Enrollment request sent! The instructor will review it shortly.", "success");
            setModalSubject(null);
        } catch (err) {
            const msg = getErrorMessage(err, "Enrollment failed");
            if (msg.toLowerCase().includes("already")) {
                setEnrolled(prev => new Set([...prev, modalSubject.id]));
                toast("Already requested", "info");
                setModalSubject(null);
            } else {
                toast(msg, "error");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnenroll = async (subjectId) => {
        if (!window.confirm("Are you sure you want to unenroll? All progress for this subject will be lost.")) return;
        try {
            await unenrollSubject(subjectId);
            setEnrolled(prev => {
                const updated = new Set(prev);
                updated.delete(subjectId);
                return updated;
            });
            toast("Successfully unenrolled from the subject.", "success");
        } catch (err) {
            toast(getErrorMessage(err, "Unenrollment failed"), "error");
        }
    };

    const filtered = subjects.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase())
    );

    const enrolledCount = enrolled.size;
    const pendingCount = filtered.filter(s => !enrolled.has(s.id)).length;

    return (
        <DashboardLayout>
            {loading && <LoadingSpinner fullPage />}

            {modalSubject && (
                <EnrollmentModal
                    subject={modalSubject}
                    onClose={() => setModalSubject(null)}
                    onSubmit={handleModalSubmit}
                    submitting={submitting}
                    prefill={profilePrefill}
                    startOnConfirm={profileComplete}
                />
            )}

            {/* ── Page Header ── */}
            <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
                    <div>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 6, lineHeight: 1.2 }}>
                            Explore Subjects
                        </h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                            Browse and enroll in subjects to start your learning journey.
                        </p>
                    </div>

                    {/* Stats chips */}
                    <div style={{ display: "flex", gap: 10 }}>
                        <div style={{
                            background: "var(--bg-surface)", border: "1px solid var(--border-color)",
                            borderRadius: 12, padding: "10px 16px", textAlign: "center",
                        }}>
                            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--color-primary)", lineHeight: 1 }}>{pendingCount}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>Available</div>
                        </div>
                        <div style={{
                            background: "var(--bg-surface)", border: "1px solid var(--border-color)",
                            borderRadius: 12, padding: "10px 16px", textAlign: "center",
                        }}>
                            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--color-success)", lineHeight: 1 }}>{enrolledCount}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>Requested</div>
                        </div>
                    </div>
                </div>

                {/* Profile completion banner */}
                {!loading && !profileComplete && (
                    <div style={{
                        background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
                        border: "1px solid #c4b5fd",
                        borderRadius: 12, padding: "11px 16px",
                        fontSize: "0.82rem", color: "#5b21b6",
                        display: "flex", gap: 10, alignItems: "center",
                        marginBottom: 16,
                    }}>
                        <span style={{ fontSize: "1rem" }}>💡</span>
                        <span style={{ flex: 1 }}>
                            Save your institution &amp; admission number in your profile to auto-fill enrollment forms.
                        </span>
                        <Link
                            to="/profile"
                            style={{
                                background: "#6366f1", color: "#fff",
                                padding: "5px 13px", borderRadius: 8,
                                fontSize: "0.78rem", fontWeight: 700,
                                textDecoration: "none", whiteSpace: "nowrap",
                            }}
                        >
                            Set up profile →
                        </Link>
                    </div>
                )}

                {/* Search bar */}
                <div style={{ position: "relative", maxWidth: 440 }}>
                    <span style={{
                        position: "absolute", left: 14, top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "1rem", pointerEvents: "none",
                        opacity: searchFocused ? 1 : 0.45,
                        transition: "opacity 150ms",
                    }}>🔍</span>
                    <input
                        placeholder="Search by subject name…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        style={{
                            paddingLeft: 40, paddingRight: 14,
                            borderRadius: 12, fontSize: "0.9rem",
                            background: "var(--bg-surface)",
                            borderColor: searchFocused ? "var(--color-primary)" : "var(--border-color)",
                            boxShadow: searchFocused ? "0 0 0 3px var(--color-primary-light)" : "none",
                            transition: "all 150ms",
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            style={{
                                position: "absolute", right: 10, top: "50%",
                                transform: "translateY(-50%)",
                                background: "var(--bg-surface-2)", border: "none",
                                width: 22, height: 22, borderRadius: "50%",
                                fontSize: "0.7rem", color: "var(--text-muted)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >✕</button>
                    )}
                </div>
            </div>

            {/* ── Content ── */}
            {!loading && filtered.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "80px 24px",
                    border: "2px dashed var(--border-color)",
                    borderRadius: 20, color: "var(--text-muted)",
                }}>
                    <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🔭</div>
                    <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>No subjects found</p>
                    <p style={{ fontSize: "0.85rem" }}>
                        {search ? `No results for "${search}"` : "No public subjects available yet."}
                    </p>
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            style={{
                                marginTop: 16, background: "var(--color-primary)",
                                color: "#fff", padding: "8px 20px",
                                borderRadius: 10, fontSize: "0.85rem", fontWeight: 700,
                            }}
                        >Clear Search</button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 20,
                }}>
                    {filtered.map((s, i) => (
                        <SubjectCard
                            key={s.id}
                            subject={s}
                            isEnrolled={enrolled.has(s.id)}
                            onEnroll={() => setModalSubject(s)}
                            onUnenroll={handleUnenroll}
                            style={{ animation: `fadeIn 300ms ${i * 50}ms both` }}
                        />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

export default EnrollPage;
