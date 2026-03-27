import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { getErrorMessage } from "../services/errorUtils";
import ThemeToggle from "../components/bits/ThemeToggle";

function Register() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "", password: "", role: "student" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Create Account — ReviseAI";
  }, []);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/users/register", user);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg-base)" }}>

      {/* ── Left brand panel ── */}
      <div style={{
        flex: "0 0 42%",
        background: "linear-gradient(145deg, var(--color-brand) 0%, var(--color-primary) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 48px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "8%", right: "12%", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", bottom: "12%", left: "8%", width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "#fff" }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", fontWeight: 900, margin: "0 auto 24px",
            border: "2px solid rgba(255,255,255,0.3)",
          }}>R</div>

          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 14, lineHeight: 1.2 }}>
            Start Learning<br />Smarter Today
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.65 }}>
            Join students and instructors powered<br />by AI-driven revision scheduling.
          </p>

          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
            {[
              { icon: "🎓", text: "For students & instructors" },
              { icon: "📄", text: "Upload PDFs, get instant questions" },
              { icon: "🔔", text: "Auto-scheduled revision reminders" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(255,255,255,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.1rem", flexShrink: 0,
                }}>{icon}</span>
                <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", position: "relative" }}>
        {/* Theme toggle */}
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <ThemeToggle />
        </div>

        <main style={{ width: "100%", maxWidth: 420 }} className="animate-scaleIn">
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Create your account
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Already have one?{" "}
              <Link to="/" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full name</label>
              <input id="name" name="name" placeholder="Your name" value={user.name} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" value={user.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" placeholder="••••••••" value={user.password} onChange={handleChange} required />
            </div>

            {/* Role selector */}
            <div className="form-group">
              <label className="form-label">I am a…</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["student", "instructor"].map(r => (
                  <button
                    key={r} type="button"
                    onClick={() => setUser({ ...user, role: r })}
                    aria-pressed={user.role === r}
                    style={{
                      flex: 1, padding: "12px 10px",
                      borderRadius: "var(--radius-pill)",
                      border: `2px solid ${user.role === r ? "var(--color-primary)" : "var(--border-color)"}`,
                      background: user.role === r ? "var(--color-primary-light)" : "var(--bg-surface)",
                      color: user.role === r ? "var(--color-primary)" : "var(--text-secondary)",
                      fontWeight: user.role === r ? 700 : 500,
                      fontSize: "0.9rem",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    {r === "student" ? "🎓 Student" : "👨‍🏫 Instructor"}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="alert-error animate-fadeIn" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary" style={{
              width: "100%", padding: "14px", fontSize: "1rem", marginTop: 10,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10
            }}>
              {loading ? "Creating Account..." : "Join ReviseAI"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default Register;
