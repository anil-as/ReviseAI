import { useState, useEffect } from "react";
import API from "../services/api";
import { saveToken } from "../services/auth";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getErrorMessage } from "../services/errorUtils";

function Login() {
  const navigate = useNavigate();
  const [data, setData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.title = "Sign In — ReviseAI";
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", data);
      const token = res.data.access_token;
      saveToken(token);
      const decoded = jwtDecode(token);
      if (decoded.role === "student") navigate("/student");
      else navigate("/instructor");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid credentials. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--bg-base)",
    }}>

      {/* ── Left brand panel ── */}
      <div style={{
        flex: "0 0 42%",
        background: "linear-gradient(145deg, #2961FF 0%, #6366f1 60%, #8b5cf6 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 48px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background orbs */}
        <div style={{
          position: "absolute", top: "10%", left: "15%",
          width: 220, height: 220, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", right: "10%",
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "#fff" }}>
          {/* Logo */}
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", fontWeight: 900, margin: "0 auto 24px",
            border: "2px solid rgba(255,255,255,0.35)",
          }}>R</div>

          <h1 style={{
            fontSize: "2.2rem", fontWeight: 800,
            letterSpacing: "-0.03em", color: "#fff",
            marginBottom: 14, lineHeight: 1.2,
          }}>
            Remember More,<br />Forget Less
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.65 }}>
            AI-generated questions + spaced repetition<br />
            scheduling to keep your knowledge sharp.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
            {[
              { icon: "🧠", text: "Adaptive spaced repetition" },
              { icon: "✨", text: "AI question generation (Gemini)" },
              { icon: "📈", text: "Track memory strength per topic" },
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
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
        position: "relative",
      }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            position: "absolute", top: 20, right: 20,
            background: "var(--bg-surface)", color: "var(--text-secondary)",
            border: "1.5px solid var(--border-color)",
            width: 38, height: 38, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem",
          }}
        >{theme === "dark" ? "☀️" : "🌙"}</button>

        <main style={{ width: "100%", maxWidth: 400 }} className="animate-scaleIn">
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Welcome back 👋
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Don't have an account?{" "}
              <Link to="/" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                Sign up free
              </Link>
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email" name="email" type="email"
                placeholder="you@example.com"
                value={data.email} onChange={handleChange} required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={data.password} onChange={handleChange} required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert-error animate-fadeIn" role="alert">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%", padding: "14px",
                fontSize: "1rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <><span className="spinner" />Signing in…</>
              ) : "Sign in →"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default Login;
