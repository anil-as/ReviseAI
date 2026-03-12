import React, { useEffect } from 'react';

function PdfViewerModal({ isOpen, onClose, fileUrl, title }) {

    // Prevent scrolling on the body when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        }
    }, [isOpen]);

    if (!isOpen || !fileUrl) return null;

    let cleanUrl = fileUrl.replace(/\\/g, '/');
    if (!cleanUrl.startsWith('/')) {
        cleanUrl = '/' + cleanUrl;
    }

    const backendUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
    const fullUrl = `${backendUrl}${cleanUrl}`;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.85)", zIndex: 99999,
            display: "flex", flexDirection: "column",
            animation: "fadeIn 200ms ease"
        }}>
            {/* Header Toolbar */}
            <div style={{
                background: "#1c1c1e", color: "white", padding: "12px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
            }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.02em", color: "white" }}>
                    📄 {title}
                </h3>
                <button
                    onClick={onClose}
                    style={{
                        background: "#ef4444", color: "white", border: "none",
                        padding: "8px 20px", borderRadius: "8px", fontWeight: "bold",
                        cursor: "pointer", fontSize: "0.9rem"
                    }}
                >
                    Close PDF
                </button>
            </div>

            {/* PDF iframe Container */}
            <div style={{ flex: 1, width: "100%", height: "100%", background: "#333", display: "flex", justifyContent: "center" }}>
                <iframe
                    src={`${fullUrl}#toolbar=0`}
                    style={{
                        width: "100%", maxWidth: "1200px", height: "100%",
                        border: 'none', background: "white",
                        boxShadow: "0 0 30px rgba(0,0,0,0.8)"
                    }}
                    title={`PDF Viewer for ${title}`}
                />
            </div>
        </div>
    );
}

export default PdfViewerModal;
