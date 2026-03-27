import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import API from "../services/api";
import { saveToken } from "../services/auth";
import { jwtDecode } from "jwt-decode";
import { getErrorMessage } from "../services/errorUtils";
import AnimatedBackground from "../components/bits/AnimatedBackground";
import SplitText from "../components/bits/SplitText";
import ShimmerButton from "../components/bits/ShimmerButton";
import FadeIn from "../components/bits/FadeIn";
import Spotlight from "../components/bits/Spotlight";

/* ── Icon replacements ───────────────────────────────────────────────── */
const EyeIcon = () => (
    <i className="fi fi-rr-eye" style={{ fontSize: "1.05rem" }} />
);
const EyeOffIcon = () => (
    <i className="fi fi-rr-eye-crossed" style={{ fontSize: "1.05rem" }} />
);

function PasswordInput({ id, name, value, onChange, placeholder = "••••••••", autoComplete }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <input id={id} name={name} type={show ? "text" : "password"}
                placeholder={placeholder} value={value} onChange={onChange}
                required autoComplete={autoComplete} style={{ paddingRight: 44 }} />
            <button type="button" aria-label={show ? "Hide password" : "Show password"}
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

/* ── Animated study card illustration ──────────────────────────────── */
const CARD_SEQUENCE = [
    { badge: "MCQ", badgeColor: "#2961FF", badgeBg: "#E8EEFF", question: "Which law states that force between charges is proportional to their product?", options: ["Ohm's Law", "Coulomb's Law", "Faraday's Law", "Newton's Law"], correct: 1 },
    { badge: "Fill in blank", badgeColor: "#8b5cf6", badgeBg: "#EDE9FE", question: "In a binary search tree, in-order traversal visits nodes in _____ order.", options: ["Random", "Ascending", "Descending", "Level"], correct: 1 },
    { badge: "True / False", badgeColor: "#0ea5e9", badgeBg: "#E0F2FE", question: "Mitochondria is the powerhouse of the cell.", options: ["True", "False"], correct: 0 },
];

function StudyAnimation() {
    const [cardIdx, setCardIdx] = useState(0);
    const [phase, setPhase] = useState("question");
    const [selected, setSelected] = useState(null);
    const [mem, setMem] = useState(62);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let t1, t2, t3;
        t1 = setTimeout(() => { setSelected(CARD_SEQUENCE[cardIdx].correct); setPhase("revealed"); }, 1800);
        t2 = setTimeout(() => setVisible(false), 3500);
        t3 = setTimeout(() => { setCardIdx(i => (i + 1) % CARD_SEQUENCE.length); setPhase("question"); setSelected(null); setMem(m => Math.min(100, m + 6)); setVisible(true); }, 4200);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [cardIdx]);

    const card = CARD_SEQUENCE[cardIdx];

    return (
        <div style={{ width: "100%", maxWidth: 420, marginTop: 40 }}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Memory Strength</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{mem}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}>
                    <motion.div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #22c55e, #4ade80)" }}
                        animate={{ width: `${mem}%` }} transition={{ duration: 0.8 }} />
                </div>
            </div>

            <motion.div
                animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8, scale: visible ? 1 : 0.98 }}
                transition={{ duration: 0.45 }}
            >
                <Spotlight spotlightColor="rgba(255,255,255,0.15)">
                    <div style={{
                        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 20, padding: "22px 24px",
                    }}>
                        <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 99,
                            fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                            background: card.badgeBg, color: card.badgeColor, marginBottom: 12,
                        }}>{card.badge}</span>

                        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", lineHeight: 1.55, marginBottom: 16, minHeight: 48 }}>
                            {card.question}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {card.options.map((opt, i) => {
                                const isCorrect = i === card.correct;
                                const isSelected = i === selected;
                                let bg = "rgba(255,255,255,0.08)", border = "rgba(255,255,255,0.15)", color = "rgba(255,255,255,0.85)";
                                if (phase === "revealed") {
                                    if (isCorrect) { bg = "rgba(34,197,94,0.2)"; border = "#22c55e"; color = "#86efac"; }
                                    else if (isSelected) { bg = "rgba(239,68,68,0.15)"; border = "#ef4444"; color = "#fca5a5"; }
                                } else if (isSelected) { bg = "rgba(255,255,255,0.18)"; border = "rgba(255,255,255,0.5)"; }
                                return (
                                    <motion.div key={i}
                                        animate={{ background: bg, borderColor: border }}
                                        transition={{ duration: 0.35 }}
                                        style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${border}`, color, fontSize: "0.78rem", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ opacity: 0.5, fontWeight: 700, fontSize: "0.72rem" }}>{String.fromCharCode(65 + i)}.</span>
                                        {opt}
                                        {phase === "revealed" && isCorrect && <span style={{ marginLeft: "auto" }}>✓</span>}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </Spotlight>
            </motion.div>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {[{ label: "Questions", val: "12 / session" }, { label: "Next review", val: "in 3 days" }, { label: "Accuracy", val: "84%" }].map(s => (
                    <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>{s.val}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Auth Forms ─────────────────────────────────────────────────────── */
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
            <ShimmerButton type="submit" disabled={loading} className="btn-primary"
                style={{ padding: "13px", fontSize: "1rem", fontWeight: 700, marginTop: 4, width: "100%", borderRadius: 12 }}>
                {loading ? <><span className="spinner" /> Signing in…</> : "Sign in →"}
            </ShimmerButton>
        </form>
    );
}

function SignUpForm({ navigate, onSuccess }) {
    const [user, setUser] = useState({ name: "", email: "", password: "", role: "student" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const change = (e) => { setUser({ ...user, [e.target.name]: e.target.value }); setError(""); };

    const submit = async (e) => {
        e.preventDefault(); setLoading(true);
        try { await API.post("/users/register", user); setDone(true); }
        catch (err) { setError(getErrorMessage(err, "Registration failed.")); }
        finally { setLoading(false); }
    };

    if (done) return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 8 }}>Account created!</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>You can now sign in with your credentials.</p>
            <ShimmerButton onClick={onSuccess} className="btn-primary" style={{ padding: "10px 28px", borderRadius: 10 }}>
                Sign in now →
            </ShimmerButton>
        </motion.div>
    );

    return (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-name">Full name</label>
                <input id="signup-name" name="name" placeholder="Your name" value={user.name} onChange={change} required />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-email">Email address</label>
                <input id="signup-email" name="email" type="email" placeholder="you@example.com" value={user.email} onChange={change} required />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password</label>
                <PasswordInput id="signup-password" name="password" value={user.password} onChange={change} autoComplete="new-password" />
            </div>
            <div className="form-group">
                <label className="form-label">I am a…</label>
                <div style={{ display: "flex", gap: 8 }}>
                    {["student", "instructor"].map(r => (
                        <motion.button key={r} type="button" onClick={() => setUser({ ...user, role: r })}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            aria-pressed={user.role === r}
                            style={{
                                flex: 1, padding: "10px", borderRadius: "var(--radius-pill)",
                                border: `2px solid ${user.role === r ? "var(--color-primary)" : "var(--border-color)"}`,
                                background: user.role === r ? "var(--color-primary-light)" : "var(--bg-surface)",
                                color: user.role === r ? "var(--color-primary)" : "var(--text-secondary)",
                                fontWeight: user.role === r ? 700 : 500, fontSize: "0.88rem",
                                transition: "all 150ms", cursor: "pointer",
                            }}>
                            {r === "student" ? "🎓 Student" : "👨‍🏫 Instructor"}
                        </motion.button>
                    ))}
                </div>
            </div>
            {error && <div className="alert-error animate-fadeIn" role="alert">{error}</div>}
            <ShimmerButton type="submit" disabled={loading} className="btn-primary"
                style={{ padding: "13px", fontSize: "1rem", fontWeight: 700, width: "100%", borderRadius: 12 }}>
                {loading ? <><span className="spinner" /> Creating account…</> : "Create account →"}
            </ShimmerButton>
        </form>
    );
}

/* ── Main Landing Page ─────────────────────────────────────────────── */
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
                {/* Animated orb background */}
                <AnimatedBackground
                    particleCount={12}
                    colors={["#818cf8", "#a78bfa", "#2563eb", "#7c3aed"]}
                    opacity={0.35}
                />

                <div style={{ position: "relative", zIndex: 1, color: "#fff", display: "flex", flexDirection: "column", height: "100%" }}>

                    {/* Logo */}
                    <FadeIn delay={0.1} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
                        <img src="/logo.svg" alt="ReviseAI Logo"
                            style={{ width: 38, height: 38, borderRadius: 11, objectFit: "cover", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }} />
                        <span style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.01em" }}>
                            Revise<span style={{ opacity: 0.65 }}>AI</span>
                        </span>
                    </FadeIn>

                    {/* Headline with SplitText animation */}
                    <div style={{ marginBottom: 16 }}>
                        <h1 style={{
                            fontSize: "clamp(1.9rem, 3.2vw, 2.7rem)",
                            fontWeight: 900, lineHeight: 1.15,
                            letterSpacing: "-0.04em", color: "#fff", margin: 0,
                        }}>
                            <SplitText text="Learn Once." splitBy="words" delay={0.3} stagger={0.08} as="span" />
                            <br />
                            <SplitText text="Remember Always." splitBy="words" delay={0.65} stagger={0.08} as="span" />
                        </h1>
                    </div>

                    <FadeIn delay={0.9} y={10}>
                        <p style={{ fontSize: "0.97rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, maxWidth: 380, margin: 0 }}>
                            ReviseAI turns your PDFs into AI-powered quizzes and schedules revision
                            at the exact moment your memory needs it — so nothing slips through.
                        </p>
                    </FadeIn>

                    {/* Animated card illustration */}
                    <FadeIn delay={1.0} style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                        <StudyAnimation />
                    </FadeIn>
                </div>
            </div>

            {/* ── RIGHT: Auth card ── */}
            <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "40px 32px", position: "relative",
                background: "radial-gradient(ellipse at top right, rgba(99,102,241,0.06), transparent 70%)"
            }}>
                {/* Theme toggle */}
                <motion.button onClick={toggleTheme} aria-label="Toggle theme"
                    whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}
                    style={{
                        position: "absolute", top: 20, right: 20,
                        background: "var(--bg-surface-2)", color: "var(--text-secondary)",
                        border: "1px solid var(--border-color)",
                        width: 38, height: 38, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.95rem", cursor: "pointer",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
                    }}>
                    {theme === "dark" 
                        ? <i className="fi fi-rr-brightness" style={{ fontSize: '1.05rem', marginTop: 1 }} /> 
                        : <i className="fi fi-rr-moon" style={{ fontSize: '1.05rem', marginTop: 1 }} />}
                </motion.button>

                <FadeIn delay={0.2} style={{ width: "100%", maxWidth: 420 }}>

                    {/* Tab switcher */}
                    <div style={{
                        display: "flex", gap: 6, marginBottom: 32,
                        background: "var(--bg-surface-2)",
                        padding: 5, borderRadius: "var(--radius-pill)",
                    }}>
                        {[["signin", "Sign In"], ["signup", "Sign Up"]].map(([key, label]) => (
                            <motion.button key={key} onClick={() => setTab(key)}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                aria-pressed={tab === key}
                                style={{
                                    flex: 1, padding: "10px", borderRadius: "var(--radius-pill)",
                                    background: tab === key ? "var(--bg-surface)" : "transparent",
                                    color: tab === key ? "var(--color-primary)" : "var(--text-muted)",
                                    fontWeight: tab === key ? 700 : 500, fontSize: "0.92rem",
                                    boxShadow: tab === key ? "var(--shadow-sm)" : "none",
                                    transition: "all 150ms", cursor: "pointer",
                                    border: "none",
                                }}>{label}</motion.button>
                        ))}
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 28 }}>
                        <AnimatePresence mode="wait">
                            <motion.h2 key={tab}
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
                                style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                                {tab === "signin" ? "Welcome back 👋" : "Create your account"}
                            </motion.h2>
                        </AnimatePresence>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            {tab === "signin"
                                ? <><span>New here? </span><button onClick={() => setTab("signup")} style={{ background: "none", color: "var(--color-primary)", fontWeight: 700, padding: 0, fontSize: "inherit", cursor: "pointer" }}>Create a free account</button></>
                                : <><span>Already have an account? </span><button onClick={() => setTab("signin")} style={{ background: "none", color: "var(--color-primary)", fontWeight: 700, padding: 0, fontSize: "inherit", cursor: "pointer" }}>Sign in</button></>
                            }
                        </p>
                    </div>

                    {/* Forms with AnimatePresence crossfade */}
                    <AnimatePresence mode="wait">
                        <motion.div key={tab}
                            initial={{ opacity: 0, x: tab === "signin" ? -16 : 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: tab === "signin" ? 16 : -16 }}
                            transition={{ duration: 0.22 }}>
                            {tab === "signin"
                                ? <SignInForm navigate={navigate} />
                                : <SignUpForm navigate={navigate} onSuccess={() => setTab("signin")} />
                            }
                        </motion.div>
                    </AnimatePresence>
                </FadeIn>
            </div>
        </div>
    );
}
