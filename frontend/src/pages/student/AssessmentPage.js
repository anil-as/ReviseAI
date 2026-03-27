import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/Toast';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import MemoryBar from '../../components/MemoryBar';
import AnimatedCounter from '../../components/bits/AnimatedCounter';
import Editor from '@monaco-editor/react';
import { getErrorMessage } from '../../services/errorUtils';
import { getAssessmentInfo, evaluateAnswer, createAttempt, finalizeAssessment } from '../../services/assessmentService';
import { generateQuestions } from '../../services/questionService';

const SESSION_ID = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── Question type metadata ─────────────────────────────────────────────────
const Q_TYPE_META = {
    mcq: { label: "Multiple Choice", icon: "fi fi-rr-list-check", color: "#2961FF", bg: "#EBE9FE" },
    true_false: { label: "True / False", icon: "fi fi-rr-scale", color: "#0ea5e9", bg: "#e0f2fe" },
    fill_blank: { label: "Fill in the Blank", icon: "fi fi-rr-edit", color: "#8b5cf6", bg: "#ede9fe" },
    short_answer: { label: "Short Answer", icon: "fi fi-rr-comment-alt", color: "#10b981", bg: "#d1fae5" },
    long_answer: { label: "Long Answer", icon: "fi fi-rr-document", color: "#0d9488", bg: "#ccfbf1" },
    diagram_question: { label: "Diagram / Flowchart", icon: "fi fi-rr-picture", color: "#f59e0b", bg: "#fef3c7" },
    figure_explain: { label: "Figure Explanation", icon: "fi fi-rr-picture", color: "#f59e0b", bg: "#fef3c7" },
    code_question: { label: "Code Challenge", icon: "fi fi-rr-code-simple", color: "#1d4ed8", bg: "#dbeafe" },
    application: { label: "Apply the Concept", icon: "fi fi-rr-flask", color: "#6366f1", bg: "#e0e7ff" },
    cunning: { label: "Think Carefully!", icon: "fi fi-rr-thought-bubble", color: "#ef4444", bg: "#fee2e2" },
};

const getTypeMeta = (type) => Q_TYPE_META[type] || { label: "Question", icon: "fi fi-rr-interrogation", color: "#64748b", bg: "#f1f5f9" };
const isOpenQuestion = (q) => !q.options || q.options.length === 0;

const IDK_PATTERNS = [
    /^\s*i\s*(don'?t|do\s*not|dunno|dun)\s*know/i,
    /^\s*(don'?t|no\s*idea|idk|no\s*clue|not\s*sure|unsure|blank|nothing|none|n\/a|no\s*answer|i\s*have\s*no\s*idea)/i,
    new RegExp("^\\s*[-./\\\\?~*…]{0,3}\\s*$"),
];
const isIDKAnswer = (text) => {
    if (!text || !text.trim()) return true;
    return IDK_PATTERNS.some(p => p.test(text.trim()));
};

// ── Confirm Submit Modal ──────────────────────────────────────────────────
function ConfirmSubmitModal({ answeredCount, totalCount, onConfirm, onCancel }) {
    const unanswered = totalCount - answeredCount;
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
            <div className="card animate-scaleIn" style={{
                maxWidth: 420, width: "100%", padding: "36px 32px", textAlign: "center",
            }}>
                <div style={{ fontSize: "2.8rem", marginBottom: 12 }}>
                    {unanswered === 0 ? "✅" : "⚠️"}
                </div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>
                    Submit Assessment?
                </h2>
                {unanswered > 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: 20 }}>
                        You have answered <strong style={{ color: "var(--color-primary)" }}>{answeredCount}</strong> of{" "}
                        <strong>{totalCount}</strong> questions.<br />
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>
                            {unanswered} unanswered question{unanswered > 1 ? "s" : ""} will be marked incorrect.
                        </span>
                    </p>
                ) : (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: 20 }}>
                        All <strong>{totalCount}</strong> questions are answered. Ready to submit!
                    </p>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={onCancel} className="btn-ghost" style={{ flex: 1, padding: "12px" }}>
                        Continue Review
                    </button>
                    <button onClick={onConfirm} className="btn-primary" style={{ flex: 1, padding: "12px", background: unanswered > 0 ? "#ef4444" : undefined, borderColor: unanswered > 0 ? "#ef4444" : undefined }}>
                        Submit Now →
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Instruction Screen ────────────────────────────────────────────────────
function InstructionScreen({ info, onStart, topicTitle }) {
    const typeIcons = {
        "Multiple Choice": "fi fi-rr-list-check",
        "True / False": "fi fi-rr-scale",
        "Fill in the Blank": "fi fi-rr-edit",
        "Short Answer": "fi fi-rr-comment-alt",
        "Long Answer": "fi fi-rr-document",
        "Diagram / Flowchart": "fi fi-rr-picture",
        "Figure Explanation": "fi fi-rr-picture",
        "Code Challenge": "fi fi-rr-code-simple",
        "Apply the Concept": "fi fi-rr-flask",
        "Think Carefully!": "fi fi-rr-thought-bubble",
    };

    return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div className="card animate-scaleIn" style={{ padding: "44px 48px", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 6 }}>
                    Ready to Start?
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: 32 }}>
                    {topicTitle && <strong>{topicTitle}</strong>}
                </p>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                    {[
                        { label: "Total Questions", value: info.total_questions, icon: "fi fi-rr-interrogation", color: "#2961FF" },
                        { label: "Estimated Time", value: `~${info.estimated_minutes} min`, icon: "fi fi-rr-clock", color: "#10b981" },
                    ].map(s => (
                        <div key={s.label} style={{
                            padding: "18px 16px",
                            background: "var(--bg-surface-2)",
                            borderRadius: 14,
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                        }}>
                            <i className={s.icon} style={{ fontSize: "1.4rem", color: s.color }} />
                            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Question types */}
                {info.question_types && info.question_types.length > 0 && (
                    <div style={{ marginBottom: 28, textAlign: "left" }}>
                        <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                            Question Types
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {info.question_types.map(qt => {
                                const meta = getTypeMeta(qt.type);
                                return (
                                    <div key={qt.type} style={{
                                        display: "flex", alignItems: "center", gap: 12,
                                        padding: "10px 14px", borderRadius: 10,
                                        background: meta.bg,
                                    }}>
                                        <i className={meta.icon} style={{ color: meta.color, fontSize: "1rem", flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600, color: meta.color, fontSize: "0.87rem", flex: 1 }}>{qt.label}</span>
                                        <span style={{
                                            background: meta.color, color: "#fff",
                                            fontSize: "0.72rem", fontWeight: 800,
                                            padding: "2px 9px", borderRadius: 99,
                                        }}>{qt.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Rules */}
                <div style={{
                    padding: "14px 18px", borderRadius: 12,
                    background: "rgba(99,102,241,0.07)", border: "1.5px solid rgba(99,102,241,0.2)",
                    textAlign: "left", marginBottom: 28,
                }}>
                    <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                        📌 How it works
                    </div>
                    <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
                        <li>You can navigate between questions freely</li>
                        <li>Answered questions turn <strong style={{ color: "#10b981" }}>green</strong> in the navigator</li>
                        <li>Submit any time — unanswered questions score 0</li>
                        <li>Rate your confidence after each answer for better scheduling</li>
                    </ul>
                </div>

                <button onClick={onStart} className="btn-primary" style={{ width: "100%", padding: "15px", fontSize: "1rem", fontWeight: 700 }}>
                    Start Assessment →
                </button>
            </div>
        </div>
    );
}

// ── Question Navigator ────────────────────────────────────────────────────
function QuestionNavigator({ questions, answers, currentIndex, onNavigate }) {
    return (
        <div style={{
            display: "flex", flexWrap: "wrap", gap: 6,
            padding: "14px 18px",
            background: "var(--bg-surface-2)",
            borderRadius: 14, marginBottom: 20,
            border: "1px solid var(--border-color)",
            alignItems: "center",
        }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 8 }}>
                Navigate:
            </span>
            {questions.map((_, i) => {
                const answered = answers[i] != null && answers[i] !== "";
                const isCurrent = i === currentIndex;
                return (
                    <button
                        key={i}
                        onClick={() => onNavigate(i)}
                        title={`Question ${i + 1}${answered ? " (answered)" : " (unanswered)"}`}
                        style={{
                            width: 36, height: 36,
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            border: isCurrent ? "2.5px solid var(--color-primary)" : "2px solid transparent",
                            background: answered
                                ? "rgba(34,197,94,0.85)"
                                : "rgba(239,68,68,0.75)",
                            color: "#fff",
                            cursor: "pointer",
                            boxShadow: isCurrent ? "0 0 0 3px rgba(99,102,241,0.25)" : "none",
                            transform: isCurrent ? "scale(1.15)" : "scale(1)",
                            transition: "all 150ms",
                        }}
                    >
                        {i + 1}
                    </button>
                );
            })}
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(34,197,94,0.85)", display: "inline-block" }} /> Answered
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(239,68,68,0.75)", display: "inline-block" }} /> Unanswered
                </span>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────
function AssessmentPage() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const sessionRef = useRef(SESSION_ID());

    // Phases: loading | locked | instructions | question | revealed | submitting_all | result
    const [phase, setPhase] = useState("loading");
    const [questions, setQuestions] = useState([]);
    const [info, setInfo] = useState(null);
    const [topicTitle, setTopicTitle] = useState("");
    const [qIndex, setQIndex] = useState(0);

    // Per-question answer state
    const [answers, setAnswers] = useState([]); // answers[i] = selected string
    const [confidences, setConfidences] = useState([]); // confidences[i] = string
    const [openEvals, setOpenEvals] = useState([]); // openEvals[i] = { is_correct, feedback }
    const [revealedSet, setRevealedSet] = useState(new Set()); // which indices have been "revealed"

    const [results, setResults] = useState(null);
    const [submittingAll, setSubmittingAll] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [questionStartTimes, setQuestionStartTimes] = useState([]);
    const [evaluatingIdx, setEvaluatingIdx] = useState(null);

    const loadQuestions = useCallback(async () => {
        setPhase("loading");
        try {
            // First check if assessment is available today
            const infoRes = await getAssessmentInfo(topicId).catch(() => ({ data: { total_questions: 10, estimated_minutes: 10, question_types: [], can_take_today: true } }));
            setInfo(infoRes.data);

            // Lock screen if not scheduled for today
            if (infoRes.data?.can_take_today === false) {
                setPhase("locked");
                return;
            }

            const questRes = await generateQuestions(topicId);
            const qs = questRes.data;
            setQuestions(qs);
            setAnswers(new Array(qs.length).fill(null));
            setConfidences(new Array(qs.length).fill(null));
            setOpenEvals(new Array(qs.length).fill(null));
            setRevealedSet(new Set());
            setQIndex(0);
            setQuestionStartTimes(new Array(qs.length).fill(Date.now()));
            setPhase("instructions");
        } catch (err) {
            toast(getErrorMessage(err, "Could not generate questions"), "error");
            navigate(-1);
        }
    }, [topicId, navigate, toast]);

    useEffect(() => {
        document.title = "Assessment — ReviseAI";
        loadQuestions();
    }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

    const startAssessment = () => {
        setPhase("question");
        const now = Date.now();
        setQuestionStartTimes(prev => prev.map((_, i) => i === 0 ? now : prev[i]));
    };

    const current = questions[qIndex];
    const open = current ? isOpenQuestion(current) : false;
    const isRevealed = revealedSet.has(qIndex);
    const currentAnswer = answers[qIndex];
    const currentConfidence = confidences[qIndex];
    const currentOpenEval = openEvals[qIndex];

    const setCurrentAnswer = (val) => {
        setAnswers(prev => { const a = [...prev]; a[qIndex] = val; return a; });
    };
    const setCurrentConfidence = (val) => {
        setConfidences(prev => { const c = [...prev]; c[qIndex] = val; return c; });
    };

    const navigateTo = (idx) => {
        if (idx < 0 || idx >= questions.length) return;
        // Start the timer for the new question if not already started
        setQuestionStartTimes(prev => {
            const t = [...prev];
            if (!t[idx]) t[idx] = Date.now();
            return t;
        });
        setQIndex(idx);
    };

    // Reveal current question answer (submit individual answer check)
    const handleRevealAnswer = async () => {
        if (!open && !currentAnswer) { toast("Please choose an answer", "warning"); return; }
        if (open && (!currentAnswer || !currentAnswer.trim())) { toast("Please write your answer", "warning"); return; }

        if (open && !currentOpenEval) {
            setEvaluatingIdx(qIndex);
            try {
                const res = await evaluateAnswer({
                    question: current.question,
                    correct_answer: current.answer,
                    student_answer: currentAnswer,
                });
                setOpenEvals(prev => { const e = [...prev]; e[qIndex] = res.data; return e; });
            } catch {
                setOpenEvals(prev => {
                    const e = [...prev];
                    e[qIndex] = { is_correct: !isIDKAnswer(currentAnswer), feedback: "Evaluation unavailable." };
                    return e;
                });
            } finally {
                setEvaluatingIdx(null);
            }
        }
        setRevealedSet(prev => { const s = new Set(prev); s.add(qIndex); return s; });
    };

    // Move to next question after reflection
    const handleContinue = () => {
        if (!currentConfidence) { toast("Please reflect on how well you knew this", "warning"); return; }
        const nextIdx = qIndex + 1;
        if (nextIdx < questions.length) {
            navigateTo(nextIdx);
        }
    };

    // ── Final Submit All ─────────────────────────────────────────────────
    const handleFinalSubmit = async () => {
        setShowConfirmModal(false);
        setSubmittingAll(true);
        setPhase("submitting_all");

        try {
            const sid = sessionRef.current;
            // Submit all answered questions (null answers → mark as incorrect, empty string)
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const ans = answers[i];
                const conf = confidences[i] || "guessing";
                const isOpen = isOpenQuestion(q);
                const elapsed = parseFloat(
                    ((Date.now() - (questionStartTimes[i] || Date.now())) / 1000).toFixed(2)
                );

                let isCorrect;
                if (ans == null || ans === "") {
                    isCorrect = false;
                } else if (isOpen) {
                    isCorrect = openEvals[i] ? openEvals[i].is_correct : !isIDKAnswer(ans);
                } else {
                    isCorrect = ans === q.answer;
                }

                await createAttempt({
                    topic_id: parseInt(topicId),
                    session_id: sid,
                    question_text: q.question,
                    question_type: q.type || "mcq",
                    correct_answer: q.answer,
                    selected_answer: ans ?? "",
                    is_correct: isCorrect,
                    response_time: Math.max(1, elapsed),
                    confidence_level: conf,
                });
            }
            const res = await finalizeAssessment(topicId, sid);
            setResults(res.data);
            setPhase("result");
        } catch (err) {
            toast("Failed to submit assessment", "error");
            setPhase("question");
        } finally {
            setSubmittingAll(false);
        }
    };

    const answeredCount = answers.filter(a => a != null && a !== "").length;

    const restart = () => {
        sessionRef.current = SESSION_ID();
        setQIndex(0);
        setResults(null);
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

    /* ════════════════════ SUBMITTING ════════════════════ */
    if (phase === "submitting_all") return (
        <DashboardLayout>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center" }}>
                <LoadingSpinner size={52} />
                <div>
                    <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Submitting your assessment…</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Calculating your score and scheduling next revision.</p>
                </div>
            </div>
        </DashboardLayout>
    );

    /* ════════════════════ LOCKED ════════════════════ */
    if (phase === "locked") {
        const scheduledDate = info?.next_revision_date
            ? new Date(info.next_revision_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            : "your scheduled date";
        const daysUntil = info?.days_until ?? null;

        return (
            <DashboardLayout>
                <div style={{ maxWidth: 520, margin: "60px auto 0", textAlign: "center" }}>
                    <div className="card animate-scaleIn" style={{ padding: "48px 40px" }}>
                        {/* Lock Icon */}
                        <div style={{
                            width: 80, height: 80, borderRadius: "50%",
                            background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))",
                            border: "2px solid rgba(99,102,241,0.3)",
                            margin: "0 auto 24px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <i className="fi fi-rr-lock" style={{ color: "#6366f1", fontSize: 36 }}/>
                        </div>

                        <h1 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: 10, color: "var(--text-primary)" }}>
                            Assessment Not Available Yet
                        </h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 28 }}>
                            This assessment is scheduled for a future date. Complete your revision first, then come back on the scheduled date to take your assessment.
                        </p>

                        {/* Scheduled date card */}
                        <div style={{
                            padding: "18px 22px", borderRadius: 14, marginBottom: 28,
                            background: "rgba(99,102,241,0.07)",
                            border: "1.5px solid rgba(99,102,241,0.2)",
                            display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                        }}>
                            <i className="fi fi-rr-calendar" style={{color: "#6366f1", flexShrink: 0, fontSize: 22}}/>
                            <div>
                                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>
                                    Scheduled Assessment Date
                                </div>
                                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#6366f1" }}>
                                    {scheduledDate}
                                </div>
                                {daysUntil !== null && daysUntil > 0 && (
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 3 }}>
                                        {daysUntil} day{daysUntil > 1 ? "s" : ""} from now
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => navigate("/student")}
                                style={{
                                    flex: 1, padding: "12px", borderRadius: 10,
                                    border: "1.5px solid var(--border-color)", background: "transparent",
                                    color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.88rem",
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                }}
                            >
                                <i className="fi fi-rr-arrow-left" style={{fontSize: 14}}/> Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    /* ════════════════════ INSTRUCTIONS ════════════════════ */
    if (phase === "instructions" && info) return (
        <DashboardLayout>
            <InstructionScreen
                info={info}
                topicTitle={topicTitle}
                onStart={startAssessment}
            />
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
                                { label: "Accuracy", value: accuracy, color: accuracy >= 60 ? "#10b981" : "#ef4444" },
                                { label: "Confidence", value: Math.round(results.avg_confidence * 100), color: "#2961FF" },
                                { label: "Speed", value: Math.round(results.speed_score * 100), color: "#f59e0b" },
                            ].map(s => (
                                <div key={s.label} style={{ padding: "20px 12px", background: "var(--bg-surface-2)", borderRadius: 16 }}>
                                    <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color, lineHeight: 1, display: "flex", justifyContent: "center", alignItems: "baseline" }}>
                                        <AnimatedCounter to={s.value} duration={1.2} />%
                                    </div>
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
    const isCorrectMCQ = !open && currentAnswer === current.answer;
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

    const CONFIDENCE_OPTIONS = [
        { val: "confident", label: "I knew it", icon: "fi fi-sr-thumbs-up" },
        { val: "unsure", label: "Partly", icon: "fi fi-rr-face-thinking" },
        { val: "guessing", label: "Guessed", icon: "fi fi-rr-dice-d6" },
    ];

    const isLast = qIndex === questions.length - 1;

    return (
        <DashboardLayout>
            {showConfirmModal && (
                <ConfirmSubmitModal
                    answeredCount={answeredCount}
                    totalCount={questions.length}
                    onConfirm={handleFinalSubmit}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}

            <div style={{ maxWidth: hasLeftMedia ? 1300 : 920, transition: "max-width 0.3s ease", margin: "0 auto" }}>

                {/* ── Question Navigator ── */}
                <QuestionNavigator
                    questions={questions}
                    answers={answers}
                    currentIndex={qIndex}
                    onNavigate={navigateTo}
                />

                {/* ── Progress bar + Submit button row ── */}
                <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                                Question {qIndex + 1} / {questions.length}
                            </span>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                                {answeredCount}/{questions.length} answered
                            </span>
                        </div>
                        <div style={{ height: 6, background: "var(--border-color)", borderRadius: 99 }}>
                            <div style={{
                                height: "100%", borderRadius: 99,
                                width: `${(answeredCount / questions.length) * 100}%`,
                                background: "linear-gradient(90deg, var(--color-primary), #6366f1)",
                                transition: "width 0.6s ease",
                            }} />
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfirmModal(true)}
                        style={{
                            padding: "9px 18px",
                            borderRadius: 10,
                            border: "2px solid #ef4444",
                            background: "rgba(239,68,68,0.08)",
                            color: "#ef4444",
                            fontWeight: 700,
                            fontSize: "0.83rem",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 7,
                            whiteSpace: "nowrap",
                            transition: "all 150ms",
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                    >
                        <i className="fi fi-rr-paper-plane" />
                        Submit Assessment
                    </button>
                </div>

                {/* ── Dynamic Layout ── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: hasLeftMedia
                        ? (isRevealed ? "1fr 1.2fr 280px" : "1fr 1.2fr")
                        : (isRevealed ? "1fr 280px" : "1fr"),
                    gap: 24,
                    alignItems: "start",
                }}>

                    {/* ══ LEFT MEDIA PANE ══ */}
                    {hasLeftMedia && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {current.figure_svg && (
                                <div className="card animate-scaleIn" style={{
                                    padding: "24px",
                                    display: "flex", justifyContent: "center", alignItems: "center",
                                    overflow: "hidden",
                                    background: "var(--bg-surface-2)"
                                }}>
                                    {current.figure_svg.trim().startsWith("http") ? (
                                        <img src={current.figure_svg.trim()} alt="Question diagram" style={{
                                            maxWidth: "100%", maxHeight: 350, objectFit: "contain", borderRadius: 8
                                        }} />
                                    ) : (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: current.figure_svg }}
                                            style={{
                                                width: "100%", maxHeight: 350,
                                                display: "flex", justifyContent: "center", alignItems: "center"
                                            }}
                                            className="figure-svg-container"
                                        />
                                    )}
                                </div>
                            )}

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

                            {codeBlocks.map((code, i) => (
                                <div key={i} className="card animate-scaleIn" style={{
                                    background: "#1e1e1e",
                                    padding: "20px", fontSize: "0.9rem",
                                    overflow: "hidden", margin: 0,
                                    border: "1px solid var(--border-color)",
                                }}>
                                    <Editor
                                        height="380px"
                                        defaultLanguage="javascript"
                                        theme="vs-dark"
                                        value={code}
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            fontSize: 14,
                                            fontFamily: "'Fira Code', 'Courier New', monospace"
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ══ QUESTION CARD ══ */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={qIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="card"
                            style={{ padding: "36px 40px" }}
                        >

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

                        {/* MCQ / True-False options */}
                        {!open && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                                {(current.options || []).map((opt, i) => {
                                    let bg = "var(--bg-surface)";
                                    let border = "var(--border-color)";
                                    let color = "var(--text-primary)";
                                    let weight = 500;

                                    if (isRevealed) {
                                        if (opt === current.answer) { bg = "rgba(34,197,94,0.12)"; border = "#22c55e"; color = "#15803d"; weight = 700; }
                                        else if (opt === currentAnswer && opt !== current.answer) { bg = "rgba(239,68,68,0.10)"; border = "#ef4444"; color = "#b91c1c"; weight = 700; }
                                    } else if (currentAnswer === opt) {
                                        bg = "var(--color-primary-light)"; border = "var(--color-primary)";
                                        color = "var(--color-primary)"; weight = 700;
                                    }

                                    return (
                                        <button key={i} disabled={isRevealed} onClick={() => setCurrentAnswer(opt)}
                                            style={{
                                                textAlign: "left", padding: "14px 18px",
                                                borderRadius: 12, border: `2px solid ${border}`,
                                                background: bg, color, fontWeight: weight,
                                                fontSize: "0.95rem", lineHeight: 1.5,
                                                transition: "all 150ms", cursor: isRevealed ? "default" : "pointer",
                                            }}>
                                            <span style={{ fontWeight: 800, opacity: 0.5, marginRight: 12, fontSize: "0.88rem" }}>
                                                {String.fromCharCode(65 + i)}.
                                            </span>
                                            {opt}
                                            {isRevealed && opt === current.answer && <span style={{ float: "right" }}>✓</span>}
                                            {isRevealed && opt === currentAnswer && opt !== current.answer && <span style={{ float: "right" }}>✕</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Open answer textarea */}
                        {open && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Your Answer
                                </label>
                                {current.type === "code_question" ? (
                                    <div style={{
                                        borderRadius: 12, overflow: "hidden",
                                        border: `2px solid ${isRevealed ? "var(--border-color)" : "var(--color-primary)"}`
                                    }}>
                                        <Editor
                                            height="380px"
                                            defaultLanguage="javascript"
                                            theme="vs-dark"
                                            value={currentAnswer || ""}
                                            onChange={val => setCurrentAnswer(val)}
                                            options={{
                                                readOnly: isRevealed,
                                                minimap: { enabled: false },
                                                scrollBeyondLastLine: false,
                                                fontSize: 15,
                                                fontFamily: "'Fira Code', 'Courier New', monospace",
                                                padding: { top: 16 }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <textarea
                                        disabled={isRevealed}
                                        value={currentAnswer || ""}
                                        onChange={e => setCurrentAnswer(e.target.value)}
                                        placeholder="Write your answer here…"
                                        rows={5}
                                        style={{
                                            width: "100%", padding: "14px 16px", borderRadius: 12,
                                            border: `2px solid ${isRevealed ? "var(--border-color)" : "var(--color-primary)"}`,
                                            background: "var(--bg-surface-2)",
                                            fontSize: "0.97rem", lineHeight: 1.65,
                                            color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {/* Model answer (revealed, open) */}
                        {isRevealed && open && (
                            <div style={{ marginBottom: 20 }}>
                                {currentOpenEval && (
                                    <div style={{
                                        padding: "16px 20px", borderRadius: 12, marginBottom: 16,
                                        background: currentOpenEval.is_correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                                        border: `1.5px solid ${currentOpenEval.is_correct ? "#22c55e" : "#ef4444"}`,
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                            <i className={currentOpenEval.is_correct ? "fi fi-sr-check-circle" : "fi fi-sr-cross-circle"}
                                                style={{ fontSize: "1.2rem", color: currentOpenEval.is_correct ? "#22c55e" : "#ef4444" }} />
                                            <span style={{ fontWeight: 800, color: currentOpenEval.is_correct ? "#15803d" : "#b91c1c", fontSize: "0.95rem" }}>
                                                {currentOpenEval.is_correct ? "Good Understanding!" : "Not Quite Precise"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                                            {currentOpenEval.feedback}
                                        </div>
                                    </div>
                                )}
                                <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1.5px solid #22c55e" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        ✓ Model Answer
                                    </div>
                                    {current.type === "code_question" ? (
                                        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(34,197,94,0.3)" }}>
                                            <Editor
                                                height="200px"
                                                defaultLanguage="javascript"
                                                theme="vs-dark"
                                                value={current.answer || ""}
                                                options={{
                                                    readOnly: true,
                                                    minimap: { enabled: false },
                                                    scrollBeyondLastLine: false,
                                                    fontSize: 14,
                                                    fontFamily: "'Fira Code', 'Courier New', monospace",
                                                    padding: { top: 12 }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.65 }}>
                                            {current.answer}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* MCQ result banner */}
                        {isRevealed && !open && (
                            <div style={{
                                padding: "14px 20px", borderRadius: 12, marginBottom: 20,
                                background: isCorrectMCQ ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                                border: `1.5px solid ${isCorrectMCQ ? "#22c55e" : "#ef4444"}`,
                                display: "flex", alignItems: "center", gap: 12,
                            }}>
                                <i className={isCorrectMCQ ? "fi fi-sr-check-circle" : "fi fi-sr-cross-circle"}
                                    style={{ fontSize: "1.4rem", color: isCorrectMCQ ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 800, color: isCorrectMCQ ? "#15803d" : "#b91c1c", fontSize: "1rem" }}>
                                        {isCorrectMCQ ? "Correct!" : "Not quite"}
                                    </div>
                                    {!isCorrectMCQ && (
                                        <div style={{ fontSize: "0.87rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                            Correct answer: <strong style={{ color: "#15803d" }}>{current.answer}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            {/* Back button */}
                            {qIndex > 0 && (
                                <button
                                    onClick={() => navigateTo(qIndex - 1)}
                                    className="btn-ghost"
                                    style={{ padding: "12px 16px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}
                                >
                                    ← Back
                                </button>
                            )}

                            {/* Check Answer (not yet revealed) */}
                            {!isRevealed && (
                                <button
                                    onClick={handleRevealAnswer}
                                    disabled={evaluatingIdx === qIndex}
                                    className="btn-primary"
                                    style={{ flex: 1, padding: "14px", fontSize: "1rem", fontWeight: 700 }}
                                >
                                    {evaluatingIdx === qIndex
                                        ? <><span className="spinner" /> Analyzing…</>
                                        : open ? "Check Answer →" : currentAnswer ? "Check Answer →" : "Choose an answer above"
                                    }
                                </button>
                            )}

                            {/* Continue / Next (after revealed) */}
                            {isRevealed && (
                                <button
                                    onClick={isLast ? () => setShowConfirmModal(true) : handleContinue}
                                    disabled={!currentConfidence && !isLast}
                                    className="btn-primary"
                                    style={{
                                        flex: 1, padding: "14px", fontSize: "1rem", fontWeight: 700,
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                        opacity: (!currentConfidence && !isLast) ? 0.6 : 1,
                                    }}
                                >
                                    {isLast ? "Finish & Submit →" : "Next Question →"}
                                </button>
                            )}
                        </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* ══ RIGHT COLUMN: Confidence panel ══ */}
                    {isRevealed && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div className="card" style={{ padding: "24px 20px" }}>
                                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    <i className="fi fi-rr-thought-bubble" style={{ marginRight: 6 }} />
                                    How well did you know this?
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {CONFIDENCE_OPTIONS.map(({ val, label, icon }) => {
                                        const isChosen = currentConfidence === val;
                                        const colors = {
                                            confident: { active: "#10b981", bg: "rgba(16,185,129,0.1)", border: "#10b981" },
                                            unsure: { active: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "#f59e0b" },
                                            guessing: { active: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "#ef4444" },
                                        }[val];
                                        return (
                                            <button key={val} onClick={() => setCurrentConfidence(val)}
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
