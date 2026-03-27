import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * SplitText — Animates text character-by-character or word-by-word on mount.
 * Inspired by React Bits SplitText component.
 *
 * @param {string} text - The text to animate
 * @param {"chars"|"words"} splitBy - Split by characters or words
 * @param {number} delay - Initial delay before animation starts (seconds)
 * @param {number} stagger - Delay between each unit (seconds)
 * @param {object} style - Inline styles for the container
 * @param {string} className
 */
export default function SplitText({
    text = "",
    splitBy = "words",
    delay = 0,
    stagger = 0.04,
    style = {},
    className = "",
    as: Tag = "span",
}) {
    const containerRef = useRef(null);

    const units = splitBy === "chars"
        ? text.split("")
        : text.split(" ");

    useEffect(() => {
        if (!containerRef.current) return;
        const spans = containerRef.current.querySelectorAll(".split-unit");
        gsap.fromTo(
            spans,
            { opacity: 0, y: 24, rotateX: -20 },
            {
                opacity: 1, y: 0, rotateX: 0,
                stagger,
                delay,
                duration: 0.55,
                ease: "power3.out",
            }
        );
    }, [text, delay, stagger]);

    return (
        <Tag
            ref={containerRef}
            className={className}
            style={{ display: "inline", perspective: "600px", ...style }}
            aria-label={text}
        >
            {units.map((unit, i) => (
                <span
                    key={i}
                    className="split-unit"
                    style={{
                        display: "inline-block",
                        opacity: 0,
                        willChange: "transform, opacity",
                        marginRight: splitBy === "words" ? "0.25em" : "0",
                    }}
                >
                    {unit === " " ? "\u00A0" : unit}
                </span>
            ))}
        </Tag>
    );
}
