import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * AnimatedCounter — Smoothly counts up from 0 to a target number on mount.
 * Inspired by React Bits animated number components.
 */
export default function AnimatedCounter({
    to = 0,
    duration = 1.2,
    delay = 0,
    suffix = "",
    prefix = "",
    decimals = 0,
    style = {},
    className = "",
}) {
    const [value, setValue] = useState(0);
    const nodeRef = useRef(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const controls = animate(0, to, {
                duration,
                ease: "easeOut",
                onUpdate: (v) => setValue(parseFloat(v.toFixed(decimals))),
            });
            return () => controls.stop();
        }, delay * 1000);

        return () => clearTimeout(timeout);
    }, [to, duration, delay, decimals]);

    return (
        <span ref={nodeRef} className={className} style={style}>
            {prefix}{value}{suffix}
        </span>
    );
}
