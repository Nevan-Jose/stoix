import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function BinaryRainTransition({ onComplete }) {
  const canvasRef = useRef(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(0).map(() => Math.random() * -50);
    const speeds = Array(columns).fill(0).map(() => 0.5 + Math.random() * 1.5);

    let frame = 0;
    const maxFrames = 120;

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 2, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'VT323', monospace`;

      for (let i = 0; i < columns; i++) {
        const char = Math.random() > 0.5 ? '1' : '0';
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        if (Math.random() > 0.9) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.6 + Math.random() * 0.4})`;
        }

        ctx.fillText(char, x, y);
        drops[i] += speeds[i];

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) {
          drops[i] = 0;
        }
      }

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        setFading(true);
        setTimeout(() => onComplete?.(), 800);
      }
    };

    requestAnimationFrame(draw);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black"
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.8 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
}