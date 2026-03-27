import React, { useRef, useState, useEffect } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

/**
 * Spotlight component.
 * Renders a radial gradient that follows the mouse within its parent.
 */
export default function Spotlight({ children, className = "", spotlightColor = "rgba(255, 255, 255, 0.05)" }) {
    const divRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e) => {
        if (!divRef.current) return;
        const { left, top } = divRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            className={`group ${className}`}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            <motion.div
                style={{
                    position: 'absolute',
                    inset: -1,
                    zIndex: 0,
                    pointerEvents: 'none',
                    borderRadius: 'inherit',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 40%)`,
                }}
                className="spotlight-overlay"
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </div>
            <style>{`
                .group:hover .spotlight-overlay {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}
