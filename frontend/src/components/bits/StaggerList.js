import { motion } from "framer-motion";

const containerVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
    },
};

/**
 * StaggerList — Wraps a list of children and stagger-reveals them on mount.
 * Each direct child gets a staggered fade+translate entrance.
 */
export function StaggerList({ children, className, style, delay = 0 }) {
    return (
        <motion.div
            variants={{
                ...containerVariants,
                show: {
                    ...containerVariants.show,
                    transition: {
                        ...containerVariants.show.transition,
                        delayChildren: delay,
                    },
                },
            }}
            initial="hidden"
            animate="show"
            className={className}
            style={style}
        >
            {children}
        </motion.div>
    );
}

/**
 * StaggerItem — Each item in the stagger list. Must be a child of StaggerList.
 */
export function StaggerItem({ children, className, style }) {
    return (
        <motion.div variants={itemVariants} className={className} style={style}>
            {children}
        </motion.div>
    );
}
