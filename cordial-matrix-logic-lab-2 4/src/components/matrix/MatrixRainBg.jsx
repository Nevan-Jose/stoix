import { useEffect, useRef } from 'react';

// Smooth, slow ambient background rain
export default function MatrixRainBg({ intensity = 1, speed = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(0).map(() => Math.random() * -(canvas.height / fontSize));
    const columnSpeeds = Array(columns).fill(0).map(() => (0.2 + Math.random() * 0.4) * speed);
    const columnOpacity = Array(columns).fill(0).map(() => 0.2 + Math.random() * 0.5);

    let animId;

    const draw = () => {
      // Very slow fade for smooth trail
      ctx.fillStyle = `rgba(0, 2, 0, ${0.04 + 0.04 * intensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'VT323', monospace`;

      for (let i = 0; i < columns; i++) {
        const char = Math.random() > 0.5 ? '1' : '0';
        const x = i * fontSize;
        const y = drops[i] * fontSize;

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

        drops[i] += columnSpeeds[i];

        if (drops[i] * fontSize > canvas.height) {
          drops[i] = Math.random() * -20;
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