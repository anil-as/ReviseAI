import { motion } from "framer-motion";

/**
 * FadeIn — fades content in with a subtle upward slide.
 * Replaces .animate-fadeIn CSS class with physics-based motion.
 */
export default function FadeIn({
    children,
    delay = 0,
    duration = 0.4,
    y = 16,
    className,
    style,
    as = "div",
}) {
    const Tag = motion[as] || motion.div;
    return (
        <Tag
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
            style={style}
        >
            {children}
        </Tag>
    );
}
