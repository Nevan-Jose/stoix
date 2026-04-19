import { useEffect, useRef } from 'react';

// Full-screen intense binary rain transition
export default function IntenseRainTransition({ onComplete, duration = 3500 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);

    // All columns active, multiple streams per column
    const streams = [];
    for (let i = 0; i < columns; i++) {
      const streamCount = 1 + Math.floor(Math.random() * 3);
      for (let s = 0; s < streamCount; s++) {
        streams.push({
          col: i,
          y: Math.random() * -(canvas.height / fontSize) * 2,
          speed: 0.8 + Math.random() * 2.5,
          length: 5 + Math.floor(Math.random() * 20),
        });
      }
    }

    let animId;
    const startTime = Date.now();

    const draw = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.fillStyle = 'rgba(0, 1, 0, 0.07)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'VT323', monospace`;

      for (const stream of streams) {
        const x = stream.col * fontSize;
        const headY = stream.y * fontSize;

        for (let j = 0; j < stream.length; j++) {
          const charY = headY - j * fontSize;
          if (charY < 0 || charY > canvas.height) continue;

          const char = Math.random() > 0.5 ? '1' : '0';
          const fade = 1 - j / stream.length;

          if (j === 0) {
            // Bright white head
            ctx.fillStyle = `rgba(200, 255, 200, ${0.9 + Math.random() * 0.1})`;
          } else if (j < 3) {
            ctx.fillStyle = `rgba(0, 255, 65, ${fade * 0.9})`;
          } else {
            ctx.fillStyle = `rgba(0, ${Math.floor(180 * fade)}, ${Math.floor(40 * fade)}, ${fade * 0.7})`;
          }

          ctx.fillText(char, x, charY);
        }

        stream.y += stream.speed;

        if (stream.y * fontSize > canvas.height + stream.length * fontSize) {
          stream.y = Math.random() * -30;
          stream.speed = 0.8 + Math.random() * 2.5;
        }
      }

      if (progress < 1) {
        animId = requestAnimationFrame(draw);
      } else {
        onComplete?.();
      }
    };

    draw();

    return () => cancelAnimationFrame(animId);
  }, [onComplete, duration]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 10 }}
    />
  );
}