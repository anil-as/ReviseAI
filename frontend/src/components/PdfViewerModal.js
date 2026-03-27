import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
function PdfViewerModal({ isOpen, onClose, fileUrl, title, chatSubjectId, isEnrolledSubject }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen || !fileUrl) return null;

    let cleanUrl = fileUrl.replace(/\\/g, '/');
    if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;

    const backendUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
    const fullUrl = `${backendUrl}${cleanUrl}`;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.9)", zIndex: 99999,
            display: "flex", flexDirection: "column",
            animation: "fadeIn 200ms ease"
        }}>
            {/* Header Toolbar */}
            <div style={{
                background: "linear-gradient(135deg, #1c1c2e, #2d2d44)",
                color: "white", padding: "14px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "rgba(99,102,241,0.2)",
                        border: "1px solid rgba(99,102,241,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem"
                    }}>📄</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "white", letterSpacing: "0.01em" }}>
                            {title}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 1 }}>
                            Revision Material
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.3)",
                        padding: "8px 16px", borderRadius: "10px",
                        fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                        display: "flex", alignItems: "center", gap: 6,
                        transition: "all 150ms",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#ef4444"; }}
                >
                    <i className="fi fi-rr-cross" style={{ fontSize: 14 }}/>
                    Close
                </button>
            </div>

            {/* PDF iframe Container */}
            <div style={{ flex: 1, width: "100%", position: "relative", background: "#222", display: "flex", justifyContent: "center" }}>
                <iframe
                    src={`${fullUrl}#toolbar=0`}
                    style={{
                        width: "100%", maxWidth: "1200px", height: "100%",
                        border: 'none', background: "white",
                    }}
                    title={`PDF Viewer for ${title}`}
                />

                {/* ── Floating Chat Bubble ── only for enrolled instructor subjects */}
                {isEnrolledSubject && chatSubjectId && (
                    <button
                        onClick={() => { onClose(); navigate(`/chat/${chatSubjectId}`); }}
                        title="Chat with your instructor"
                        style={{
                            position: "absolute",
                            bottom: 28, right: 28,
                            width: 58, height: 58,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            border: "3px solid rgba(255,255,255,0.25)",
                            boxShadow: "0 8px 32px rgba(99,102,241,0.6), 0 0 0 0 rgba(99,102,241,0.4)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1.5rem",
                            animation: "chatPulse 2s infinite",
                            zIndex: 10,
                        }}
                    >
                        <i className="fi fi-rr-comment" style={{fontSize: 26}}/>
                        {/* Badge */}
                        <span style={{
                            position: "absolute", top: -4, right: -4,
                            width: 18, height: 18, borderRadius: "50%",
                            background: "#10b981", border: "2px solid white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", fontWeight: 800, color: "white",
                        }}>💬</span>
                    </button>
                )}
            </div>

            <style>{`
                @keyframes chatPulse {
                    0%, 100% { box-shadow: 0 8px 32px rgba(99,102,241,0.6), 0 0 0 0 rgba(99,102,241,0.4); }
                    50% { box-shadow: 0 8px 32px rgba(99,102,241,0.6), 0 0 0 12px rgba(99,102,241,0); }
                }
            `}</style>
        </div>
    );
}

export default PdfViewerModal;
