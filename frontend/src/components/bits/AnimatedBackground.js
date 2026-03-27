import { useEffect, useRef } from "react";

/**
 * AnimatedBackground — Canvas-based floating particle mesh background.
 * Inspired by React Bits particle/mesh backgrounds.
 * Renders softly glowing orbs that drift and pulse.
 */
export default function AnimatedBackground({
    style = {},
    particleCount = 18,
    colors = ["#6366f1", "#8b5cf6", "#4f46e5", "#3b82f6"],
    opacity = 0.55,
}) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let W = canvas.offsetWidth;
        let H = canvas.offsetHeight;
        canvas.width = W;
        canvas.height = H;

        // Create particles
        const particles = Array.from({ length: particleCount }, (_, i) => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: 60 + Math.random() * 120,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            color: colors[i % colors.length],
            phase: Math.random() * Math.PI * 2,
        }));

        const resize = () => {
            W = canvas.offsetWidth;
            H = canvas.offsetHeight;
            canvas.width = W;
            canvas.height = H;
        };
        window.addEventListener("resize", resize);

        const draw = (t) => {
            ctx.clearRect(0, 0, W, H);

            particles.forEach((p) => {
                // Drift
                p.x += p.vx;
                p.y += p.vy;
                // Bounce
                if (p.x < -p.r) p.x = W + p.r;
                if (p.x > W + p.r) p.x = -p.r;
                if (p.y < -p.r) p.y = H + p.r;
                if (p.y > H + p.r) p.y = -p.r;

                // Pulsing radius
                const pulse = Math.sin(t * 0.001 + p.phase);
                const r = p.r + pulse * 20;

                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                grad.addColorStop(0, p.color + Math.round(opacity * 255).toString(16).padStart(2, "0"));
                grad.addColorStop(1, p.color + "00");

                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            });

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", resize);
        };
    }, [particleCount, colors, opacity]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                ...style,
            }}
        />
    );
}
