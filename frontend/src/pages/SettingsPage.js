import DashboardLayout from "../components/DashboardLayout";
import { useEffect, useState } from "react";

const THEMES = [
    {
        id: "light",
        label: "Light",
        description: "Clean white, great for daylight",
        preview: { bg: "#F8FAFC", surface: "#ffffff", text: "#3c315b", accent: "#2961FF", border: "#e2e8f0" },
    },
    {
        id: "dark",
        label: "Dark",
        description: "Deep purple, easy on the eyes",
        preview: { bg: "#0f0e1a", surface: "#1a1830", text: "#e2e8f0", accent: "#6ea0ff", border: "#2d2a4a" },
    },
    {
        id: "black",
        label: "Black",
        description: "Pure black monochrome — like the pros",
        preview: { bg: "#0a0a0a", surface: "#111111", text: "#ffffff", accent: "#a3e635", border: "#222222" },
    },
];

function ThemePreview({ t, active, onSelect }) {
    const p = t.preview;
    return (
        <button
            onClick={() => onSelect(t.id)}
            style={{
                background: "var(--bg-surface)",
                border: active ? "2px solid var(--color-primary)" : "2px solid var(--border-color)",
                borderRadius: 16, padding: "4px",
                cursor: "pointer", textAlign: "left",
                transition: "all 200ms",
                boxShadow: active ? "0 0 0 3px rgba(41,97,255,0.12)" : "none",
            }}
        >
            {/* Mini UI preview */}
            <div style={{ background: p.bg, borderRadius: 12, padding: 10, overflow: "hidden" }}>
                {/* Fake navbar */}
                <div style={{ height: 10, background: p.surface, borderRadius: 6, marginBottom: 6, border: `1px solid ${p.border}` }} />
                {/* Fake cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{
                            background: p.surface, borderRadius: 8, padding: "6px 7px",
                            border: `1px solid ${p.border}`,
                        }}>
                            <div style={{ height: 5, background: p.accent, borderRadius: 3, width: "60%", marginBottom: 4 }} />
                            <div style={{ height: 4, background: p.text, opacity: 0.2, borderRadius: 3, width: "80%" }} />
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ padding: "10px 12px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <div style={{
                        fontWeight: 800, fontSize: "0.88rem",
                        color: "var(--text-primary)",
                    }}>{t.label}</div>
                    {active && (
                        <span style={{
                            fontSize: "0.65rem", fontWeight: 700,
                            background: "var(--color-primary)", color: "#fff",
                            padding: "2px 7px", borderRadius: 99,
                        }}>Active</span>
                    )}
                </div>
                <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>{t.description}</div>
            </div>
        </button>
    );
}

function SettingsPage() {
    const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem("theme") || "light");

    useEffect(() => { document.title = "Settings — ReviseAI"; }, []);

    const applyTheme = (id) => {
        setCurrentTheme(id);
        localStorage.setItem("theme", id);
        document.documentElement.setAttribute("data-theme", id);
    };

    return (
        <DashboardLayout>
            <div className="page-hero">
                <h1>⚙ Settings</h1>
                <p>Personalize your ReviseAI experience</p>
            </div>

            {/* Theme Section */}
            <section style={{ marginBottom: 40 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2>Appearance</h2>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Choose your theme</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                    {THEMES.map(t => (
                        <ThemePreview
                            key={t.id}
                            t={t}
                            active={currentTheme === t.id}
                            onSelect={applyTheme}
                        />
                    ))}
                </div>

                <p style={{ marginTop: 12, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Theme is also togglable from the 🌙 button in the navbar.
                </p>
            </section>

            {/* About */}
            <section>
                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2>About</h2>
                </div>
                <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                        ["🧠 App", "ReviseAI — AI-powered spaced repetition"],
                        ["🔖 Version", "1.0.0"],
                        ["📚 Engine", "Ebbinghaus forgetting curve model"],
                        ["💬 Chat", "5-second polling (in-app)"],
                    ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", gap: 16, fontSize: "0.88rem" }}>
                            <span style={{ fontWeight: 700, color: "var(--text-secondary)", width: 100, flexShrink: 0 }}>{k}</span>
                            <span style={{ color: "var(--text-muted)" }}>{v}</span>
                        </div>
                    ))}
                </div>
            </section>
        </DashboardLayout>
    );
}

export default SettingsPage;
