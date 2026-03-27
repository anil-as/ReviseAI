import { motion } from "framer-motion";

/**
 * ShimmerButton — Primary CTA button with an animated shimmer sweep.
 * Inspired by the React Bits shiny button pattern.
 */
export default function ShimmerButton({
    children,
    onClick,
    type = "button",
    disabled = false,
    style = {},
    className = "",
    shimmerColor = "rgba(255,255,255,0.4)",
    ...rest
}) {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={className}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
                position: "relative",
                overflow: "hidden",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.65 : 1,
                ...style,
            }}
            {...rest}
        >
            {/* Shimmer sweep animation */}
            {!disabled && (
                <motion.span
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(
                            105deg,
                            transparent 30%,
                            ${shimmerColor} 50%,
                            transparent 70%
                        )`,
                        backgroundSize: "200% 100%",
                        pointerEvents: "none",
                    }}
                    initial={{ backgroundPosition: "200% 50%" }}
                    whileHover={{
                        backgroundPosition: ["-50% 50%", "200% 50%"],
                        transition: { duration: 0.7, repeat: Infinity, ease: "linear" },
                    }}
                />
            )}
            <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {children}
            </span>
        </motion.button>
    );
}
