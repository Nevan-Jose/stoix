import { useEffect, useRef } from 'react';

export default function MatrixRainBg({ intensity = 1, speed = 1, slowFactor = 1 }) {
  const canvasRef = useRef(null);
  const slowRef   = useRef(slowFactor);

  useEffect(() => { slowRef.current = slowFactor; }, [slowFactor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    const columns  = Math.floor(canvas.width / fontSize);

    // Each column gets a direction: 1 = falls from top, -1 = rises from bottom
    // Roughly 55% down, 45% up for an organic look
    const directions = Array(columns).fill(0).map(() => Math.random() > 0.45 ? 1 : -1);

    // Starting positions — downward cols start above screen, upward cols start below
    const drops = Array(columns).fill(0).map((_, i) =>
      directions[i] === 1
        ? Math.random() * -(canvas.height / fontSize)   // above
        : (canvas.height / fontSize) + Math.random() * 20 // below
    );

    // Slower base speed range
    const columnSpeeds  = Array(columns).fill(0).map(() => (0.04 + Math.random() * 0.07) * speed);
    const columnOpacity = Array(columns).fill(0).map(() => 0.2 + Math.random() * 0.5);

    let animId;

    const draw = () => {
      ctx.fillStyle = `rgba(0, 2, 0, ${0.04 + 0.04 * intensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'VT323', monospace`;

      for (let i = 0; i < columns; i++) {
        const char = Math.random() > 0.5 ? '1' : '0';
        const x    = i * fontSize;
        const y    = drops[i] * fontSize;

        const rand = Math.random();
        if (rand > 0.98) {
          ctx.fillStyle = '#ffffff';
        } else if (rand > 0.92) {
          ctx.fillStyle = `rgba(0, 255, 65, ${columnOpacity[i]})`;
        } else {
          ctx.fillStyle = `rgba(0, ${120 + Math.floor(90 * columnOpacity[i])}, ${30 + Math.floor(20 * columnOpacity[i])}, ${columnOpacity[i] * 0.8})`;
        }

        if (y > 0 && y < canvas.height) {
          ctx.fillText(char, x, y);
        }

        drops[i] += columnSpeeds[i] * directions[i] * slowRef.current;

        // Reset when column exits the opposite edge
        if (directions[i] === 1 && drops[i] * fontSize > canvas.height) {
          drops[i]         = Math.random() * -20;
          columnOpacity[i] = 0.15 + Math.random() * 0.5;
        } else if (directions[i] === -1 && drops[i] * fontSize < 0) {
          drops[i]         = (canvas.height / fontSize) + Math.random() * 20;
          columnOpacity[i] = 0.15 + Math.random() * 0.5;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
