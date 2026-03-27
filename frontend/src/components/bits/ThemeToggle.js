import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
            }}
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                    <motion.div
                        key="moon"
                        initial={{ y: -30, opacity: 0, rotate: -90 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 30, opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                        style={{ position: 'absolute' }}
                    >
                        <i className="fi fi-rr-moon" style={{ fontSize: 20 }}/>
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ y: -30, opacity: 0, rotate: -90 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 30, opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                        style={{ position: 'absolute' }}
                    >
                        <i className="fi fi-rr-brightness" style={{fontSize: 20}}/>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
