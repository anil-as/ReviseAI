import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

/**
 * GlowCard — Card with mouse-tracking gradient glow border effect.
 * Inspired by React Bits glow card pattern.
 */
export default function GlowCard({
    children,
    className,
    style,
    glowColor = "99, 102, 241",
    glowOpacity = 0.4,
    borderRadius = 16,
}) {
    const cardRef = useRef(null);
    const glowRef = useRef(null);

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current || !glowRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        glowRef.current.style.background = `
            radial-gradient(
                300px circle at ${x}px ${y}px,
                rgba(${glowColor}, ${glowOpacity}),
                transparent 60%
            )
        `;
    }, [glowColor, glowOpacity]);

    const handleMouseLeave = useCallback(() => {
        if (!glowRef.current) return;
        glowRef.current.style.background = "transparent";
    }, []);

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.2 }}
            className={className}
            style={{
                position: "relative",
                borderRadius,
                overflow: "hidden",
                ...style,
            }}
        >
            {/* Glow overlay — tracks mouse */}
            <div
                ref={glowRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius,
                    pointerEvents: "none",
                    zIndex: 0,
                    transition: "background 0.1s ease",
                }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
                {children}
            </div>
        </motion.div>
    );
}
