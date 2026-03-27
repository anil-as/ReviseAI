import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import FadeIn from '../../components/bits/FadeIn';
import AnimatedCounter from '../../components/bits/AnimatedCounter';
import { StaggerList, StaggerItem } from '../../components/bits/StaggerList';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

function StudentAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get("/dashboard/analytics");
                setAnalytics(res.data);
            } catch (error) {
                console.error("Failed to load analytics", error);
                toast("Failed to load analytics data", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [toast]);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
                    <LoadingSpinner size={40} />
                </div>
            </DashboardLayout>
        );
    }

    if (!analytics || analytics.length === 0) {
        return (
            <DashboardLayout>
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                    <i className="fi fi-rr-info" style={{ marginBottom: 16, opacity: 0.5, fontSize: 48 }}/>
                    <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>No Analytics Data Yet</h2>
                    <p>Complete some assessments to start generating your personalized insights.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ paddingBottom: 60 }}>
                <FadeIn>
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
                            Your Performance Insights
                        </h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                            Detailed analysis of your strengths and areas for improvement across enrolled subjects.
                        </p>
                    </div>
                </FadeIn>

                <StaggerList style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                    {analytics.map((subject) => {
                        const scorePct = Math.round(subject.avg_memory_strength * 100);
                        const isStrong = scorePct >= 75;
                        const isMid = scorePct >= 50 && scorePct < 75;
                        const gradient = isStrong
                            ? "var(--color-success)"
                            : isMid
                                ? "var(--color-warning)"
                                : "var(--color-danger)";

                        // Prepare chart data (top 6 topics for cleaner chart)
                        const chartData = [
                            ...subject.weakest_topics,
                            ...subject.strongest_topics.filter(st => !subject.weakest_topics.find(wt => wt.topic_id === st.topic_id))
                        ].slice(0, 7).map(t => ({
                            name: t.topic_title.length > 20 ? t.topic_title.substring(0, 20) + '...' : t.topic_title,
                            Memory: Math.round(t.memory_strength * 100),
                            fullTitle: t.topic_title,
                        }));

                        return (
                            <StaggerItem key={subject.subject_id}>
                                <div className="card">
                                    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>
                                        {/* Header Row */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
                                            <div>
                                                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                                                    {subject.subject_title}
                                                </h2>
                                                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                                    {subject.topic_count} Topics Analyzed
                                                </span>
                                            </div>
                                            
                                            <div style={{
                                                padding: "12px 24px", borderRadius: 16, background: gradient,
                                                color: "white", display: "flex", alignItems: "center", gap: 12,
                                                boxShadow: "0 8px 16px -4px rgba(0,0,0,0.2)"
                                            }}>
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, opacity: 0.9 }}>
                                                        Overall Mastery
                                                    </span>
                                                    <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1 }}>
                                                        <AnimatedCounter to={scorePct} duration={1.5} />%
                                                    </div>
                                                </div>
                                                <i className="fi fi-rr-arrow-trend-up" style={{opacity: 0.8, fontSize: 32}}/>
                                            </div>
                                        </div>

                                        {/* Two column layout: Analysis text / Chart */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 40, alignItems: "start" }}>
                                            
                                            {/* Left Col: Strengths & Weaknesses */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                                                
                                                {/* Focus Areas (Weak Types) */}
                                                {subject.focus_areas && subject.focus_areas.length > 0 && (
                                                    <div style={{ padding: "20px", borderRadius: 12, background: "var(--bg-surface-2)", border: "1px solid var(--border-color)" }}>
                                                        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-danger)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                                            <i className="fi fi-rr-bullseye" style={{fontSize: 14}}/> Attention Needed On
                                                        </h3>
                                                        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-primary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                                                            {subject.focus_areas.map((area, i) => (
                                                                <li key={i}><strong>{area}</strong> conceptual questions</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Weakest Topics */}
                                                {subject.weakest_topics.length > 0 && (
                                                    <div>
                                                        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                                                            Concepts to Review
                                                        </h3>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                            {subject.weakest_topics.slice(0, 3).map(t => (
                                                                <span key={t.topic_id} style={{
                                                                    padding: "6px 12px", background: "var(--bg-surface-2)", border: "1px solid var(--border-color)",
                                                                    borderRadius: 8, fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500
                                                                }}>
                                                                    {t.topic_title} <span style={{ color: "var(--color-danger)", fontWeight: 700, marginLeft: 6 }}>{Math.round(t.memory_strength * 100)}%</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Strongest Topics */}
                                                {subject.strongest_topics.length > 0 && scorePct > 30 && (
                                                    <div>
                                                        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                                                            Your Strengths
                                                        </h3>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                            {subject.strongest_topics.slice(0, 3).map(t => (
                                                                <span key={t.topic_id} style={{
                                                                    padding: "6px 12px", background: "var(--bg-surface-2)", border: "1px solid var(--border-color)",
                                                                    borderRadius: 8, fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600
                                                                }}>
                                                                    {t.topic_title}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Col: Topic Chart */}
                                            {chartData.length > 0 && (
                                                <div style={{ height: 280, width: "100%", padding: "24px", background: "var(--bg-surface)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                                                    <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20, textAlign: "center" }}>
                                                        Memory Strength Across Topics
                                                    </h3>
                                                    <ResponsiveContainer width="100%" height="85%">
                                                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} dy={10} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} domain={[0, 100]} />
                                                            <Tooltip 
                                                                cursor={{ fill: "var(--bg-surface-2)" }}
                                                                contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600, boxShadow: "var(--shadow-md)" }}
                                                                itemStyle={{ color: "var(--color-primary)", fontWeight: 800 }}
                                                            />
                                                            <Bar dataKey="Memory" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={36} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </StaggerItem>
                        );
                    })}
                </StaggerList>
            </div>
        </DashboardLayout>
    );
}

export default StudentAnalytics;
