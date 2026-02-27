import React, { useState, useEffect } from "react";
import Modal from "./Modal";

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName, isDeleting }) {
    const [clearData, setClearData] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setClearData(false); // Reset when opened
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm(clearData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
                    Are you sure you want to delete <strong>{itemName}</strong>?
                </p>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", background: "var(--bg-surface-2)", padding: 12, borderRadius: 8, border: "1px solid var(--border-color)" }}>
                    <input
                        type="checkbox"
                        checked={clearData}
                        onChange={(e) => setClearData(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 2, accentColor: "#ef4444" }}
                    />
                    <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        Also clear all revisions, progress, and generated questions related to this topic permanently.
                    </span>
                </label>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                    <button onClick={onClose} className="btn-ghost" disabled={isDeleting} style={{ padding: "8px 16px" }}>
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="btn-danger" disabled={isDeleting} style={{ padding: "8px 16px" }}>
                        {isDeleting ? "Deleting..." : "Delete Topic"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmDeleteModal;
