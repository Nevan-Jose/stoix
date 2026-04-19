import { useEffect, useRef } from 'react';

// Smooth ambient digital rain. Intensity/speed update every render via refs so the
// canvas loop is not torn down when props change (e.g. intro ramp → full background).
export default function MatrixRainBg({ intensity = 1, speed = 1 }) {
  const canvasRef = useRef(null);
  const intensityRef = useRef(intensity);
  const speedRef = useRef(speed);
  intensityRef.current = intensity;
  speedRef.current = speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const fontSize = 14;

    const rebuildColumns = () => {
      const columns = Math.floor(canvas.width / fontSize);
      return {
        columns,
        drops: Array(columns)
          .fill(0)
          .map(() => Math.random() * -(canvas.height / fontSize)),
        columnBases: Array(columns)
          .fill(0)
          .map(() => 0.2 + Math.random() * 0.4),
        columnOpacity: Array(columns)
          .fill(0)
          .map(() => 0.32 + Math.random() * 0.58),
      };
    };

    resize();
    let { columns, drops, columnBases, columnOpacity } = rebuildColumns();

    const onResize = () => {
      resize();
      const next = rebuildColumns();
      columns = next.columns;
      drops = next.drops;
      columnBases = next.columnBases;
      columnOpacity = next.columnOpacity;
    };

    window.addEventListener('resize', onResize);

    let animId;

    const draw = () => {
      const raw = Math.max(0.02, intensityRef.current);
      const intensity = Math.min(1.85, raw * 1.38);
      const speedMul = Math.max(0.05, speedRef.current);

      // Strong green wash — brighter, denser field
      ctx.fillStyle = `rgba(0, 5, 0, ${0.09 + 0.16 * intensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'VT323', monospace`;

      for (let i = 0; i < columns; i++) {
        const char = Math.random() > 0.5 ? '1' : '0';
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const rand = Math.random();
        const op = Math.min(1, columnOpacity[i] * (0.55 + 0.58 * intensity));
        if (rand > 0.98) {
          ctx.fillStyle = `rgba(220, 255, 220, ${Math.min(1, (0.92 + Math.random() * 0.08) * intensity)})`;
        } else if (rand > 0.92) {
          ctx.fillStyle = `rgba(0, 255, 95, ${op})`;
        } else {
          ctx.fillStyle = `rgba(0, ${130 + Math.floor(80 * columnOpacity[i])}, ${42 + Math.floor(30 * columnOpacity[i])}, ${Math.min(1, op * 0.96)})`;
        }

        if (y > 0 && y < canvas.height) {
          ctx.fillText(char, x, y);
        }

        drops[i] += columnBases[i] * speedMul;

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
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
