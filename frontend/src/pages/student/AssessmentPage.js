import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import MemoryBar from "../../components/MemoryBar";
import { generateQuestions } from "../../services/questionService";
import { createAttempt, finalizeAssessment } from "../../services/assessmentService";
import { useToast } from "../../components/Toast";
import { getErrorMessage } from "../../services/errorUtils";

const SESSION_ID = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── Question type metadata ─────────────────────────────────────────────────
const Q_TYPE_META = {
    mcq: { label: "Multiple Choice", icon: "fi fi-rr-list-check", color: "#2961FF", bg: "#EBE9FE" },
    true_false: { label: "True / False", icon: "fi fi-rr-scale", color: "#0ea5e9", bg: "#e0f2fe" },
    fill_blank: { label: "Fill in the Blank", icon: "fi fi-rr-edit", color: "#8b5cf6", bg: "#ede9fe" },
    short_answer: { label: "Short Answer", icon: "fi fi-rr-comment-alt", color: "#10b981", bg: "#d1fae5" },
    diagram_question: { label: "Diagram / Flowchart", icon: "fi fi-rr-picture", color: "#f59e0b", bg: "#fef3c7" },
    figure_explain: { label: "Figure Explanation", icon: "fi fi-rr-picture", color: "#f59e0b", bg: "#fef3c7" },
    code_question: { label: "Code Challenge", icon: "fi fi-rr-code-simple", color: "#1d4ed8", bg: "#dbeafe" },
    application: { label: "Apply the Concept", icon: "fi fi-rr-flask", color: "#6366f1", bg: "#e0e7ff" },
    cunning: { label: "Think Carefully!", icon: "fi fi-rr-thought-bubble", color: "#ef4444", bg: "#fee2e2" },
};

const getTypeMeta = (type) => Q_TYPE_META[type] || { label: "Question", icon: "fi fi-rr-interrogation", color: "#64748b", bg: "#f1f5f9" };
const isOpenQuestion = (q) => !q.options || q.options.length === 0;

// ── Detect "I don't know" type answers ─────────────────────────────────
const IDK_PATTERNS = [
    /^\s*i\s*(don'?t|do\s*not|dunno|dun)\s*know/i,
    /^\s*(don'?t|no\s*idea|idk|no\s*clue|not\s*sure|unsure|blank|nothing|none|n\/a|no\s*answer|i\s*have\s*no\s*idea)/i,
    new RegExp("^\\s*[-./\\\\?~*…]{0,3}\\s*$"),
];
const isIDKAnswer = (text) => {
    if (!text || !text.trim()) return true;
    return IDK_PATTERNS.some(p => p.test(text.trim()));
};

function AssessmentPage() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const sessionRef = useRef(SESSION_ID());

    const [phase, setPhase] = useState("loading");
    const [questions, setQuestions] = useState([]);
    const [qIndex, setQIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [confidence, setConfidence] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(null);
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Store NLP grading result for open questions
    const [openEval, setOpenEval] = useState(null);
    const [evaluating, setEvaluating] = useState(false);

    const loadQuestions = async () => {
        setPhase("loading");
        try {
            const res = await generateQuestions(topicId);
            setQuestions(res.data);
            setPhase("question");
            setQuestionStartTime(Date.now());
        } catch (err) {
            toast(getErrorMessage(err, "Could not generate questions"), "error");
            navigate(-1);
        }
    };

    useEffect(() => {
        document.title = "Assessment — ReviseAI";
        loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topicId]);

    const current = questions[qIndex];
    const isLast = qIndex === questions.length - 1;
    const open = current ? isOpenQuestion(current) : false;

    const handleSubmitAnswer = async () => {
        if (!open && !selected) { toast("Please choose an answer", "warning"); return; }
        if (open && (!selected || !selected.trim())) { toast("Please write your answer", "warning"); return; }

        if (open) {
            setEvaluating(true);
            try {
                // Call NLP endpoint to check semantic correctness
                const { evaluateAnswer } = require("../../services/assessmentService");
                const res = await evaluateAnswer({
                    question: current.question,
                    correct_answer: current.answer,
                    student_answer: selected
                });
                setOpenEval(res.data);
            } catch (err) {
                toast("Failed to evaluate answer. Falling back to manual grading.", "error");
                setOpenEval({ is_correct: !isIDKAnswer(selected), feedback: "Evaluation API failed." });
            } finally {
                setEvaluating(false);
                setPhase("revealed");
            }
        } else {
            setPhase("revealed");
        }
    };

    const handleConfirmReflection = async () => {
        if (!confidence) { toast("Please reflect on how well you knew this", "warning"); return; }
        setSubmitting(true);
        const elapsed = parseFloat(((Date.now() - questionStartTime) / 1000).toFixed(2));

        // For open questions, use the NLP evaluation result if available
        const isCorrect = open
            ? (openEval ? openEval.is_correct : !isIDKAnswer(selected))
            : selected === current.answer;

        try {
            await createAttempt({
                topic_id: parseInt(topicId),
                session_id: sessionRef.current,
                question_text: current.question,
                question_type: current.type || "mcq",
                correct_answer: current.answer,
                selected_answer: selected ?? "",
                is_correct: isCorrect,
                response_time: elapsed,
                confidence_level: confidence,
            });

            setSelected(null);
            setConfidence(null);

            if (isLast) {
                const res = await finalizeAssessment(topicId, sessionRef.current);
                setResults(res.data);
                setPhase("result");
            } else {
                setQIndex(i => i + 1);
                setQuestionStartTime(Date.now());
                setPhase("question");
            }
        } catch (err) {
            toast("Failed to submit answer", "error");
        } finally { setSubmitting(false); }
    };

    const restart = () => {
        sessionRef.current = SESSION_ID();
        setQIndex(0); setSelected(null); setConfidence(null); setResults(null);
        setOpenEval(null);
        loadQuestions();
    };

    /* ════════════════════ LOADING ════════════════════ */
    if (phase === "loading") return (
        <DashboardLayout>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center" }}>
                <LoadingSpinner size={52} />
                <div>
                    <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Generating your questions…</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>AI is reading your PDF and crafting smart questions.</p>
                </div>
            </div>
        </DashboardLayout>
    );

    /* ════════════════════ RESULT ════════════════════ */
    if (phase === "result" && results) {
        const accuracy = Math.round(results.accuracy * 100);
        const mem = results.memory_strength;
        const review = results.question_review || [];

        return (
            <DashboardLayout>
                <div style={{ maxWidth: 720, margin: "0 auto" }}>
                    <div className="card animate-scaleIn" style={{ padding: "40px 48px", textAlign: "center", marginBottom: 28 }}>
                        <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>
                            {accuracy >= 80 ? "🎉" : accuracy >= 60 ? "👍" : "📖"}
                        </div>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 6 }}>Session Complete!</h1>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: "0.95rem" }}>Here's how you did on this topic</p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
                            {[
                                { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 60 ? "#10b981" : "#ef4444" },
                                { label: "Confidence", value: `${Math.round(results.avg_confidence * 100)}%`, color: "#2961FF" },
                                { label: "Speed", value: `${Math.round(results.speed_score * 100)}%`, color: "#f59e0b" },
                            ].map(s => (
                                <div key={s.label} style={{ padding: "20px 12px", background: "var(--bg-surface-2)", borderRadius: 16 }}>
                                    <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, marginTop: 6 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginBottom: 24 }}><MemoryBar value={mem} /></div>

                        <div style={{ padding: "18px 24px", borderRadius: 16, background: "var(--color-primary-light)", border: "1.5px solid var(--color-primary)", marginBottom: 28 }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>📅 Next revision scheduled</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--color-primary)" }}>{results.next_revision_date}</div>
                            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
                                in {results.new_interval_days} day{results.new_interval_days !== 1 ? "s" : ""}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={() => navigate("/student")} className="btn-ghost" style={{ flex: 1, padding: "13px" }}>Dashboard</button>
                            <button onClick={restart} className="btn-primary" style={{ flex: 1, padding: "13px" }}>Retry Session</button>
                        </div>
                    </div>

                    {review.length > 0 && (
                        <div>
                            <div className="section-header"><h2>📋 Question Review</h2></div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {review.map((r, i) => (
                                    <div key={i} className="card" style={{
                                        padding: "20px 24px",
                                        borderLeft: `4px solid ${r.is_correct ? "#22c55e" : "#ef4444"}`,
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                                            <p style={{ fontSize: "0.92rem", fontWeight: 600, lineHeight: 1.5, margin: 0, flex: 1 }}>
                                                <span style={{ color: "var(--text-muted)", marginRight: 8 }}>Q{i + 1}.</span>
                                                {r.question}
                                            </p>
                                            <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{r.is_correct ? "✅" : "❌"}</span>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: r.is_correct ? "1fr" : "1fr 1fr", gap: 10, fontSize: "0.84rem" }}>
                                            <div style={{ padding: "10px 14px", borderRadius: 10, background: r.is_correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)" }}>
                                                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Your answer: </span>
                                                <span style={{ color: r.is_correct ? "#10b981" : "#ef4444", fontWeight: 700 }}>{r.selected_answer || "—"}</span>
                                            </div>
                                            {!r.is_correct && (
                                                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)" }}>
                                                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Correct: </span>
                                                    <span style={{ color: "#10b981", fontWeight: 700 }}>{r.correct_answer}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
                                            <span>⏱ {r.response_time}s</span>
                                            <span>🧠 {r.confidence_level}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    /* ════════════════════ QUIZ ════════════════════ */
    if (!current) return null;
    const meta = getTypeMeta(current.type);
    const isCorrect = !open && selected === current.answer;
    const isFigure = current.type === "figure_explain" || current.type === "diagram_question";

    // Extract code blocks from question
    const codeBlocks = [];
    const textParts = [];
    if (current.question.includes("```")) {
        current.question.split(/(```[\s\S]*?```)/g).forEach(part => {
            if (part.startsWith("```")) {
                codeBlocks.push(part.replace(/^```\w*\n?/, "").replace(/```$/, ""));
            } else if (part.trim()) {
                textParts.push(part.trim());
            }
        });
    } else {
        textParts.push(current.question);
    }

    const hasFigureMedia = !!current.figure_svg || (isFigure && !current.figure_svg);
    const hasCodeMedia = codeBlocks.length > 0;
    const hasLeftMedia = hasFigureMedia || hasCodeMedia;

    // Confidence options
    const CONFIDENCE_OPTIONS = [
        { val: "confident", label: "I knew it", icon: "fi fi-sr-thumbs-up" },
        { val: "unsure", label: "Partly", icon: "fi fi-rr-face-thinking" },
        { val: "guessing", label: "Guessed", icon: "fi fi-rr-dice-d6" },
    ];

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 920, margin: "0 auto" }}>

                {/* ── Progress bar ── */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                            Question {qIndex + 1} / {questions.length}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                            {Math.round((qIndex / questions.length) * 100)}% complete
                        </span>
                    </div>
                    <div style={{ height: 6, background: "var(--border-color)", borderRadius: 99 }}>
                        <div style={{
                            height: "100%", borderRadius: 99,
                            width: `${(qIndex / questions.length) * 100}%`,
                            background: "linear-gradient(90deg, var(--color-primary), #6366f1)",
                            transition: "width 0.6s ease",
                        }} />
                    </div>
                </div>

                {/* ── Dynamic Layout (Two or Three Columns) ── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: hasLeftMedia
                        ? (phase === "revealed" ? "1.2fr 1.5fr 300px" : "1.2fr 1.5fr")
                        : (phase === "revealed" ? "1fr 300px" : "1fr"),
                    gap: 24,
                    alignItems: "start",
                }}>

                    {/* ══ LEFT MEDIA PANE (Code / Image) ══ */}
                    {hasLeftMedia && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* ── Figure SVG Rendering ── */}
                            {current.figure_svg && (
                                <div className="card animate-scaleIn" style={{
                                    padding: "24px",
                                    display: "flex", justifyContent: "center", alignItems: "center",
                                    overflow: "hidden",
                                    background: "var(--bg-surface-2)"
                                }}>
                                    <div
                                        dangerouslySetInnerHTML={{ __html: current.figure_svg }}
                                        style={{
                                            width: "100%", maxHeight: 350,
                                            display: "flex", justifyContent: "center", alignItems: "center"
                                        }}
                                        className="figure-svg-container"
                                    />
                                </div>
                            )}

                            {/* ── Figure note ── */}
                            {isFigure && !current.figure_svg && (
                                <div style={{
                                    padding: "16px",
                                    borderRadius: 12, background: "rgba(245,158,11,0.08)",
                                    border: "1.5px dashed #f59e0b",
                                    display: "flex", alignItems: "center", gap: 12,
                                }}>
                                    <i className="fi fi-rr-picture" style={{ color: "#f59e0b", fontSize: "1.2rem", flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Figure Question</div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                                            Refer to the figure/diagram in your notes while answering
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Code Blocks ── */}
                            {codeBlocks.map((code, i) => (
                                <pre key={i} className="card animate-scaleIn" style={{
                                    background: "var(--bg-surface-2)",
                                    padding: "20px", fontSize: "0.9rem",
                                    overflowX: "auto", margin: 0,
                                    fontFamily: "'Fira Code', 'Courier New', monospace",
                                    lineHeight: 1.6,
                                    color: "var(--text-primary)",
                                    border: "1px solid var(--border-color)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word"
                                }}><code>{code}</code></pre>
                            ))}
                        </div>
                    )}

                    {/* ══ CENTER/LEFT COLUMN: Question card ══ */}
                    <div className="card animate-fadeIn" style={{ padding: "36px 40px" }}>

                        {/* Type badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "5px 14px",
                                borderRadius: "var(--radius-pill)",
                                background: meta.bg, color: meta.color,
                                fontSize: "0.78rem", fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: "0.06em",
                            }}>
                                <i className={meta.icon} style={{ fontSize: "0.85rem" }} />
                                {meta.label}
                            </span>
                            {current.type === "cunning" && (
                                <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>Read carefully!</span>
                            )}
                        </div>

                        {/* Question text */}
                        <div style={{ marginBottom: 28 }}>
                            {textParts.map((part, i) => (
                                <p key={i} style={{ fontSize: "1.12rem", fontWeight: 700, lineHeight: 1.7, color: "var(--text-primary)", margin: "0 0 12px 0" }}>
                                    {part}
                                </p>
                            ))}
                        </div>

                        {/* ── MCQ / True-False / Fill-blank options ── */}
                        {!open && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                                {(current.options || []).map((opt, i) => {
                                    let bg = "var(--bg-surface)";
                                    let border = "var(--border-color)";
                                    let color = "var(--text-primary)";
                                    let weight = 500;

                                    if (phase === "revealed") {
                                        if (opt === current.answer) { bg = "rgba(34,197,94,0.12)"; border = "#22c55e"; color = "#15803d"; weight = 700; }
                                        else if (opt === selected && opt !== current.answer) { bg = "rgba(239,68,68,0.10)"; border = "#ef4444"; color = "#b91c1c"; weight = 700; }
                                    } else if (selected === opt) {
                                        bg = "var(--color-primary-light)"; border = "var(--color-primary)";
                                        color = "var(--color-primary)"; weight = 700;
                                    }

                                    return (
                                        <button key={i} disabled={phase === "revealed"} onClick={() => setSelected(opt)}
                                            style={{
                                                textAlign: "left", padding: "14px 18px",
                                                borderRadius: 12, border: `2px solid ${border}`,
                                                background: bg, color, fontWeight: weight,
                                                fontSize: "0.95rem", lineHeight: 1.5,
                                                transition: "all 150ms", cursor: phase === "revealed" ? "default" : "pointer",
                                            }}>
                                            <span style={{ fontWeight: 800, opacity: 0.5, marginRight: 12, fontSize: "0.88rem" }}>
                                                {String.fromCharCode(65 + i)}.
                                            </span>
                                            {opt}
                                            {phase === "revealed" && opt === current.answer && <span style={{ float: "right" }}>✓</span>}
                                            {phase === "revealed" && opt === selected && opt !== current.answer && <span style={{ float: "right" }}>✕</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Open answer textarea ── */}
                        {open && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Your Answer
                                </label>
                                <textarea
                                    disabled={phase === "revealed"}
                                    value={selected || ""}
                                    onChange={e => setSelected(e.target.value)}
                                    placeholder="Write your answer here…"
                                    rows={5}
                                    style={{
                                        width: "100%", padding: "14px 16px", borderRadius: 12,
                                        border: `2px solid ${phase === "revealed" ? "var(--border-color)" : "var(--color-primary)"}`,
                                        background: "var(--bg-surface-2)",
                                        fontSize: "0.97rem", lineHeight: 1.65,
                                        color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
                                    }}
                                />
                            </div>
                        )}

                        {/* ── Model answer (revealed, open only) ── */}
                        {phase === "revealed" && open && (
                            <div style={{ marginBottom: 20 }}>
                                {/* NLP Feedback Block */}
                                {openEval && (
                                    <div style={{
                                        padding: "16px 20px", borderRadius: 12, marginBottom: 16,
                                        background: openEval.is_correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                                        border: `1.5px solid ${openEval.is_correct ? "#22c55e" : "#ef4444"}`,
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                            <i className={openEval.is_correct ? "fi fi-sr-check-circle" : "fi fi-sr-cross-circle"}
                                                style={{ fontSize: "1.2rem", color: openEval.is_correct ? "#22c55e" : "#ef4444" }} />
                                            <span style={{ fontWeight: 800, color: openEval.is_correct ? "#15803d" : "#b91c1c", fontSize: "0.95rem" }}>
                                                {openEval.is_correct ? "Good Understanding!" : "Not Quite Precise"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                                            {openEval.feedback}
                                        </div>
                                    </div>
                                )}

                                {/* Standard Model Answer */}
                                <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1.5px solid #22c55e" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        ✓ Model Answer
                                    </div>
                                    <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.65 }}>{current.answer}</div>
                                </div>
                            </div>
                        )}

                        {/* ── MCQ result banner (revealed) ── */}
                        {phase === "revealed" && !open && (
                            <div style={{
                                padding: "14px 20px", borderRadius: 12, marginBottom: 20,
                                background: isCorrect ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                                border: `1.5px solid ${isCorrect ? "#22c55e" : "#ef4444"}`,
                                display: "flex", alignItems: "center", gap: 12,
                            }}>
                                <i className={isCorrect ? "fi fi-sr-check-circle" : "fi fi-sr-cross-circle"}
                                    style={{ fontSize: "1.4rem", color: isCorrect ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 800, color: isCorrect ? "#15803d" : "#b91c1c", fontSize: "1rem" }}>
                                        {isCorrect ? "Correct!" : "Not quite"}
                                    </div>
                                    {!isCorrect && (
                                        <div style={{ fontSize: "0.87rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                            Correct answer: <strong style={{ color: "#15803d" }}>{current.answer}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Question phase: Submit button ── */}
                        {phase === "question" && (
                            <button onClick={handleSubmitAnswer}
                                disabled={(!open && !selected) || evaluating}
                                className="btn-primary"
                                style={{ width: "100%", padding: "14px", fontSize: "1rem", fontWeight: 700 }}>
                                {evaluating ? <><span className="spinner" /> Analyzing answer…</> : open ? "Submit Answer →" : selected ? "Submit Answer →" : "Choose an answer above"}
                            </button>
                        )}

                        {/* ── Revealed phase: on mobile / single col, show continue button ── */}
                        {phase === "revealed" && (
                            <button onClick={handleConfirmReflection} disabled={submitting || !confidence}
                                className="btn-primary"
                                style={{
                                    width: "100%", padding: "14px", fontSize: "1rem", fontWeight: 700,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                    opacity: (!confidence || submitting) ? 0.6 : 1,
                                    marginTop: 4,
                                }}>
                                {submitting ? <><span className="spinner" /> Saving…</> : isLast ? "Finish Session →" : "Next Question →"}
                            </button>
                        )}
                    </div>

                    {/* ══ RIGHT COLUMN: Confidence panel (only after reveal) ══ */}
                    {phase === "revealed" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                            {/* Confidence panel */}
                            <div className="card" style={{ padding: "24px 20px" }}>
                                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    <i className="fi fi-rr-thought-bubble" style={{ marginRight: 6 }} />
                                    How well did you know this?
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {CONFIDENCE_OPTIONS.map(({ val, label, icon }) => {
                                        const isChosen = confidence === val;
                                        const colors = {
                                            confident: { active: "#10b981", bg: "rgba(16,185,129,0.1)", border: "#10b981" },
                                            unsure: { active: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "#f59e0b" },
                                            guessing: { active: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "#ef4444" },
                                        }[val];
                                        return (
                                            <button key={val} onClick={() => setConfidence(val)}
                                                style={{
                                                    padding: "14px 16px",
                                                    borderRadius: 12,
                                                    border: `2px solid ${isChosen ? colors.border : "var(--border-color)"}`,
                                                    background: isChosen ? colors.bg : "transparent",
                                                    color: isChosen ? colors.active : "var(--text-secondary)",
                                                    fontWeight: isChosen ? 700 : 500,
                                                    fontSize: "0.9rem",
                                                    display: "flex", alignItems: "center", gap: 10,
                                                    transition: "all 150ms", cursor: "pointer",
                                                    textAlign: "left",
                                                }}>
                                                <i className={icon} style={{ fontSize: "1.1rem", flexShrink: 0, color: isChosen ? colors.active : "var(--text-muted)" }} />
                                                <span>{label}</span>
                                                {isChosen && (
                                                    <i className="fi fi-sr-check" style={{ marginLeft: "auto", fontSize: "0.85rem", color: colors.active }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tip */}
                            <div style={{
                                padding: "12px 14px", borderRadius: 10,
                                background: "var(--bg-surface-2)", border: "1px solid var(--border-color)",
                                fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5,
                            }}>
                                <i className="fi fi-rr-info" style={{ marginRight: 5, verticalAlign: "middle" }} />
                                Your confidence rating adjusts the spaced repetition schedule. Be honest!
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default AssessmentPage;
