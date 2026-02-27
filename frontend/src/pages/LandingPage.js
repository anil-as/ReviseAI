import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { saveToken } from "../services/auth";
import { jwtDecode } from "jwt-decode";
import { getErrorMessage } from "../services/errorUtils";

/* ── SVG Eye icons (minimal, professional) ─────────────────────────── */
const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

/* ── Password input with professional eye toggle ────────────────────── */
function PasswordInput({ id, name, value, onChange, placeholder = "••••••••", autoComplete }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <input
                id={id} name={name}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                value={value} onChange={onChange}
                required autoComplete={autoComplete}
                style={{ paddingRight: 44 }}
            />
            <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(s => !s)}
                style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", padding: 4,
                    display: "flex", alignItems: "center",
                    borderRadius: 6, transition: "color 150ms",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--color-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
                {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    );
}

/* ── Animated study-session illustration ────────────────────────────── */
const CARD_SEQUENCE = [
    {
        badge: "MCQ", badgeColor: "#2961FF", badgeBg: "#E8EEFF",
        question: "Which law states that force between charges is proportional to their product?",
        options: ["Ohm's Law", "Coulomb's Law", "Faraday's Law", "Newton's Law"],
        correct: 1,
    },
    {
        badge: "Fill in blank", badgeColor: "#8b5cf6", badgeBg: "#EDE9FE",
        question: "In a binary search tree, in-order traversal visits nodes in _____ order.",
        options: ["Random", "Ascending", "Descending", "Level"],
        correct: 1,
    },
    {
        badge: "True / False", badgeColor: "#0ea5e9", badgeBg: "#E0F2FE",
        question: "Mitochondria is the powerhouse of the cell.",
        options: ["True", "False"],
        correct: 0,
    },
];

function StudyAnimation() {
    const [cardIdx, setCardIdx] = useState(0);
    const [phase, setPhase] = useState("question"); // question | revealed
    const [selected, setSelected] = useState(null);
    const [mem, setMem] = useState(62);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let t1, t2, t3;
        // Auto-pick correct answer after 1.8s
        t1 = setTimeout(() => {
            setSelected(CARD_SEQUENCE[cardIdx].correct);
            setPhase("revealed");
        }, 1800);
        // Show result for 1.5s then fade out
        t2 = setTimeout(() => setVisible(false), 3500);
        // Advance to next card
        t3 = setTimeout(() => {
            setCardIdx(i => (i + 1) % CARD_SEQUENCE.length);
            setPhase("question");
            setSelected(null);
            setMem(m => Math.min(100, m + 6));
            setVisible(true);
        }, 4200);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [cardIdx]);

    const card = CARD_SEQUENCE[cardIdx];

    return (
        <div style={{ width: "100%", maxWidth: 420, marginTop: 40 }}>
            {/* Memory bar */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Memory Strength</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{mem}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${mem}%`,
                        background: "linear-gradient(90deg, #22c55e, #4ade80)",
                        transition: "width 0.8s ease",
                    }} />
                </div>
            </div>

            {/* Question card */}
            <div style={{
                background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 20, padding: "22px 24px",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
                transition: "opacity 0.45s ease, transform 0.45s ease",
            }}>
                {/* Badge */}
                <span style={{
                    display: "inline-block", padding: "3px 10px",
                    borderRadius: 99, fontSize: "0.68rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    background: card.badgeBg, color: card.badgeColor,
                    marginBottom: 12,
                }}>{card.badge}</span>

                {/* Question */}
                <p style={{
                    fontSize: "0.85rem", fontWeight: 600, color: "#fff",
                    lineHeight: 1.55, marginBottom: 16, minHeight: 48,
                }}>{card.question}</p>

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {card.options.map((opt, i) => {
                        const isCorrect = i === card.correct;
                        const isSelected = i === selected;
                        let bg = "rgba(255,255,255,0.08)";
                        let border = "rgba(255,255,255,0.15)";
                        let color = "rgba(255,255,255,0.85)";
                        if (phase === "revealed") {
                            if (isCorrect) { bg = "rgba(34,197,94,0.2)"; border = "#22c55e"; color = "#86efac"; }
                            else if (isSelected) { bg = "rgba(239,68,68,0.15)"; border = "#ef4444"; color = "#fca5a5"; }
                        } else if (isSelected) {
                            bg = "rgba(255,255,255,0.18)"; border = "rgba(255,255,255,0.5)";
                        }
                        return (
                            <div key={i} style={{
                                padding: "9px 14px", borderRadius: 10,
                                background: bg, border: `1.5px solid ${border}`,
                                color, fontSize: "0.78rem", fontWeight: 500,
                                transition: "all 0.35s ease",
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <span style={{ opacity: 0.5, fontWeight: 700, fontSize: "0.72rem" }}>
                                    {String.fromCharCode(65 + i)}.
                                </span>
                                {opt}
                                {phase === "revealed" && isCorrect && (
                                    <span style={{ marginLeft: "auto", fontSize: "0.9rem" }}>✓</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {[
                    { label: "Questions", val: "12 / session" },
                    { label: "Next review", val: "in 3 days" },
                    { label: "Accuracy", val: "84%" },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: 1, background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: 12, padding: "10px 12px", textAlign: "center",
                    }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>{s.val}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Sign-In form ───────────────────────────────────────────────────── */
function SignInForm({ navigate }) {
    const [data, setData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const change = (e) => { setData({ ...data, [e.target.name]: e.target.value }); setError(""); };
    const submit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await API.post("/auth/login", data);
            const token = res.data.access_token;
            saveToken(token);
            const decoded = jwtDecode(token);
            navigate(decoded.role === "student" ? "/student" : "/instructor");
        } catch (err) {
            setError(getErrorMessage(err, "Invalid credentials. Please try again."));
        } finally { setLoading(false); }
    };
    return (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
                <label className="form-label" htmlFor="signin-email">Email address</label>
                <input id="signin-email" name="email" type="email" placeholder="you@example.com"
                    value={data.email} onChange={change} required autoComplete="email" />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="signin-password">Password</label>
                <PasswordInput id="signin-password" name="password"
                    value={data.password} onChange={change} autoComplete="current-password" />
            </div>
            {error && <div className="alert-error animate-fadeIn" role="alert">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary"
                style={{
                    padding: "13px", fontSize: "1rem", fontWeight: 700, marginTop: 4,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}>
                {loading ? <><span className="spinner" /> Signing in…</> : "Sign in →"}
            </button>
        </form>
    );
}

/* ── Sign-Up form ───────────────────────────────────────────────────── */
function SignUpForm({ navigate, onSuccess }) {
    const [user, setUser] = useState({ name: "", email: "", password: "", role: "student" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const change = (e) => { setUser({ ...user, [e.target.name]: e.target.value }); setError(""); };
    const submit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            await API.post("/users/register", user);
            setDone(true);
        } catch (err) {
            setError(getErrorMessage(err, "Registration failed. Please try again."));
        } finally { setLoading(false); }
    };

    if (done) return (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 8 }}>Account created!</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
                You can now sign in with your credentials.
            </p>
            <button onClick={onSuccess} className="btn-primary" style={{ padding: "10px 28px" }}>
                Sign in now →
            </button>
        </div>
    );

    return (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-name">Full name</label>
                <input id="signup-name" name="name" placeholder="Your name"
                    value={user.name} onChange={change} required />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-email">Email address</label>
                <input id="signup-email" name="email" type="email" placeholder="you@example.com"
                    value={user.email} onChange={change} required />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password</label>
                <PasswordInput id="signup-password" name="password"
                    value={user.password} onChange={change} autoComplete="new-password" />
            </div>
            <div className="form-group">
                <label className="form-label">I am a…</label>
                <div style={{ display: "flex", gap: 8 }}>
                    {["student", "instructor"].map(r => (
                        <button key={r} type="button"
                            onClick={() => setUser({ ...user, role: r })}
                            aria-pressed={user.role === r}
                            style={{
                                flex: 1, padding: "10px",
                                borderRadius: "var(--radius-pill)",
                                border: `2px solid ${user.role === r ? "var(--color-primary)" : "var(--border-color)"}`,
                                background: user.role === r ? "var(--color-primary-light)" : "var(--bg-surface)",
                                color: user.role === r ? "var(--color-primary)" : "var(--text-secondary)",
                                fontWeight: user.role === r ? 700 : 500, fontSize: "0.88rem",
                                transition: "all var(--transition-fast)",
                            }}>
                            {r === "student" ? "🎓 Student" : "👨‍🏫 Instructor"}
                        </button>
                    ))}
                </div>
            </div>
            {error && <div className="alert-error animate-fadeIn" role="alert">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary"
                style={{
                    padding: "13px", fontSize: "1rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}>
                {loading ? <><span className="spinner" /> Creating account…</> : "Create account →"}
            </button>
        </form>
    );
}

/* ── Main Landing Page ──────────────────────────────────────────────── */
export default function LandingPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState("signin");
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

    useEffect(() => {
        document.title = "ReviseAI — AI-Powered Spaced Repetition Learning";
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        localStorage.setItem("theme", next);
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg-base)" }}>

            {/* ── LEFT: Brand + Animation ── */}
            <div style={{
                flex: "0 0 55%",
                background: "linear-gradient(150deg, #1a3fd4 0%, #4f46e5 50%, #7c3aed 100%)",
                display: "flex", flexDirection: "column",
                padding: "52px 52px 48px",
                position: "relative", overflow: "hidden",
            }}>
                {/* Subtle background circles */}
                <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", top: -120, left: -100, background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", bottom: 60, right: -80, background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, color: "#fff", display: "flex", flexDirection: "column", height: "100%" }}>

                    {/* Logo */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
                        <img
                            src="/logo.svg"
                            alt="ReviseAI Logo"
                            style={{
                                width: 38, height: 38, borderRadius: 11, objectFit: "cover",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.15)"
                            }}
                        />
                        <span style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: "-0.01em" }}>
                            Revise<span style={{ opacity: 0.65 }}>AI</span>
                        </span>
                    </div>

                    {/* Headline — short & punchy */}
                    <div style={{ marginBottom: 16 }}>
                        <h1 style={{
                            fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)",
                            fontWeight: 900, lineHeight: 1.15,
                            letterSpacing: "-0.04em", color: "#fff", margin: 0,
                        }}>
                            Learn Once.<br />Remember Always.
                        </h1>
                    </div>

                    <p style={{
                        fontSize: "0.97rem", color: "rgba(255,255,255,0.72)",
                        lineHeight: 1.65, maxWidth: 380, margin: 0,
                    }}>
                        ReviseAI turns your PDFs into AI-powered quizzes and schedules revision
                        at the exact moment your memory needs it — so nothing slips through.
                    </p>

                    {/* Animated illustration fills remaining space */}
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                        <StudyAnimation />
                    </div>
                </div>
            </div>

            {/* ── RIGHT: Auth card ── */}
            <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "40px 32px", position: "relative",
            }}>
                {/* Theme toggle */}
                <button onClick={toggleTheme} aria-label="Toggle theme"
                    style={{
                        position: "absolute", top: 20, right: 20,
                        background: "var(--bg-surface)", color: "var(--text-secondary)",
                        border: "1.5px solid var(--border-color)",
                        width: 36, height: 36, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem",
                    }}>{theme === "dark" ? "☀️" : "🌙"}</button>

                <main style={{ width: "100%", maxWidth: 420 }} className="animate-scaleIn">

                    {/* Tab switcher */}
                    <div style={{
                        display: "flex", gap: 6, marginBottom: 32,
                        background: "var(--bg-surface-2)",
                        padding: 5, borderRadius: "var(--radius-pill)",
                    }}>
                        {[["signin", "Sign In"], ["signup", "Sign Up"]].map(([key, label]) => (
                            <button key={key} onClick={() => setTab(key)} aria-pressed={tab === key}
                                style={{
                                    flex: 1, padding: "10px",
                                    borderRadius: "var(--radius-pill)",
                                    background: tab === key ? "var(--bg-surface)" : "transparent",
                                    color: tab === key ? "var(--color-primary)" : "var(--text-muted)",
                                    fontWeight: tab === key ? 700 : 500, fontSize: "0.92rem",
                                    boxShadow: tab === key ? "var(--shadow-sm)" : "none",
                                    transition: "all var(--transition-fast)",
                                }}>{label}</button>
                        ))}
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                            {tab === "signin" ? "Welcome back 👋" : "Create your account"}
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            {tab === "signin"
                                ? <><span>New here? </span><button onClick={() => setTab("signup")} style={{ background: "none", color: "var(--color-primary)", fontWeight: 700, padding: 0, fontSize: "inherit" }}>Create a free account</button></>
                                : <><span>Already have an account? </span><button onClick={() => setTab("signin")} style={{ background: "none", color: "var(--color-primary)", fontWeight: 700, padding: 0, fontSize: "inherit" }}>Sign in</button></>
                            }
                        </p>
                    </div>

                    {/* Forms */}
                    {tab === "signin"
                        ? <SignInForm navigate={navigate} />
                        : <SignUpForm navigate={navigate} onSuccess={() => setTab("signin")} />
                    }
                </main>
            </div>
        </div>
    );
}
