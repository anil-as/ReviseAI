import { motion } from "framer-motion";

/**
 * ProgressRing — Animated SVG circular progress ring.
 * Replaces MemoryBar in high-visibility contexts.
 */
export default function ProgressRing({
    value = 0,      // 0-1
    size = 64,
    strokeWidth = 6,
    color = "#6366f1",
    trackColor = "rgba(99,102,241,0.12)",
    label,
    style = {},
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - Math.min(1, Math.max(0, value)));

    return (
        <div style={{ position: "relative", width: size, height: size, ...style }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                />
            </svg>
            {label && (
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: size * 0.2, fontWeight: 800, color,
                }}>
                    {label}
                </div>
            )}
        </div>
    );
}
