import { motion } from "framer-motion";

/**
 * ScaleIn — pop-in scale animation. Used for modals, cards, popups.
 */
export default function ScaleIn({
    children,
    delay = 0,
    duration = 0.3,
    className,
    style,
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration, delay, ease: [0.34, 1.56, 0.64, 1] }}
            className={className}
            style={style}
        >
            {children}
        </motion.div>
    );
}
