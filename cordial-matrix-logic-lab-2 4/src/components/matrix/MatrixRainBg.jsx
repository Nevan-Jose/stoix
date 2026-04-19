import { useEffect, useRef } from 'react';

// Half-width katakana + digits + binary — “Matrix code” style (not uniform 0/1 only).
const MATRIX_CODE_POOL =
  '01ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾜﾝﾞﾟ23456789';

function pickMatrixGlyph() {
  return MATRIX_CODE_POOL[
    Math.floor(Math.random() * MATRIX_CODE_POOL.length)
  ];
}

// Smooth ambient digital rain. Intensity/speed update every render via refs so the
// canvas loop is not torn down when props change (e.g. intro ramp → full background).
/**
 * @param {object} props
 * @param {number} [props.intensity]
 * @param {number} [props.speed]
 * @param {number} [props.coverage]
 * @param {boolean} [props.thinBinary]
 */
export default function MatrixRainBg(props) {
  const {
    intensity = 1,
    speed = 1,
    coverage,
    thinBinary = false,
  } = props;
  const canvasRef = useRef(null);
  const intensityRef = useRef(intensity);
  const speedRef = useRef(speed);
  const coverageRef = useRef(coverage);
  intensityRef.current = intensity;
  speedRef.current = speed;
  coverageRef.current = coverage;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const fontSize = thinBinary ? 13 : 15;
    const fontCss = `300 ${fontSize}px "Share Tech Mono", "VT323", monospace`;
    // Tighter horizontal step than glyph width → more columns / more drops (slight overlap).
    const colStep = fontSize * 0.56;

    const rebuildColumns = () => {
      const columns = Math.floor(canvas.width / colStep);
      const columnDir = Array.from({ length: columns }, (_, i) => (i % 2 === 0 ? 1 : -1));
      const rowSpan = canvas.height / fontSize;
      return {
        columns,
        columnDir,
        drops: Array.from({ length: columns }, (_, i) =>
          columnDir[i] > 0
            ? Math.random() * -rowSpan
            : rowSpan + Math.random() * rowSpan * 0.55
        ),
        columnBases: Array(columns)
          .fill(0)
          .map(() => 0.28 + Math.random() * 0.48),
        columnOpacity: Array(columns)
          .fill(0)
          .map(() => 0.32 + Math.random() * 0.58),
      };
    };

    resize();
    let { columns, columnDir, drops, columnBases, columnOpacity } = rebuildColumns();

    const onResize = () => {
      resize();
      const next = rebuildColumns();
      columns = next.columns;
      columnDir = next.columnDir;
      drops = next.drops;
      columnBases = next.columnBases;
      columnOpacity = next.columnOpacity;
    };

    window.addEventListener('resize', onResize);

    let animId;

    const draw = () => {
      const raw = Math.max(0.02, intensityRef.current);
      const intensity = Math.min(4.45, raw * 1.38);
      const speedMul = Math.max(0.05, Math.min(4.6, speedRef.current));
      const covRaw = coverageRef.current;
      const hasCoverage = covRaw != null && Number.isFinite(covRaw);
      const cov = hasCoverage ? Math.min(1, Math.max(0, covRaw)) : null;

      let fadeAlpha;
      if (cov == null) {
        fadeAlpha = 0.085 + 0.2 * Math.min(2.85, intensity);
      } else {
        const fillRatio = Math.min(1, cov / 0.8);
        // ~80% fill at fillRatio 1; keep a tiny wash so the field stays soft, not muddy
        fadeAlpha = 0.048 + 0.42 * (1 - fillRatio) ** 2.1;
      }

      ctx.fillStyle = `rgba(0, 8, 2, ${fadeAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontCss;

      const fillRatio = cov == null ? 0 : Math.min(1, cov / 0.8);
      const tailSteps =
        cov == null
          ? Math.max(
              1,
              Math.min(5, Math.round(1 + Math.max(0, intensity - 1.2) * 0.82))
            )
          : Math.max(1, Math.floor(1 + fillRatio * 15 + intensity * 0.3));
      const softField = cov != null && fillRatio > 0.2;

      for (let i = 0; i < columns; i++) {
        const x = i * colStep;
        const dir = columnDir[i];

        for (let t = 0; t < tailSteps; t++) {
          // dir 1: rain falls (tail above head). dir -1: rain rises (tail below head).
          const row = drops[i] - t * 0.94 * dir;
          const y = row * fontSize;
          if (y <= 0 || y >= canvas.height) continue;

          const tailFalloff = tailSteps > 1 ? Math.pow(0.84, t) : 1;
          const rand = Math.random();
          const char = pickMatrixGlyph();
          const op = Math.min(
            1,
            columnOpacity[i] * (0.48 + 0.58 * intensity) * tailFalloff
          );

          if (softField) {
            if (rand > 0.993) {
              ctx.fillStyle = `rgba(210, 255, 225, ${Math.min(0.92, (0.42 + rand * 0.2) * intensity * tailFalloff)})`;
            } else if (rand > 0.94) {
              ctx.fillStyle = `rgba(52, 210, 130, ${op * 0.92})`;
            } else {
              const g = 118 + Math.floor(55 * columnOpacity[i]);
              const b = 68 + Math.floor(35 * columnOpacity[i]);
              ctx.fillStyle = `rgba(12, ${g}, ${b}, ${Math.min(1, op * 0.94)})`;
            }
          } else if (rand > 0.965) {
            ctx.fillStyle = `rgba(220, 255, 220, ${Math.min(1, (0.92 + Math.random() * 0.08) * intensity * tailFalloff)})`;
          } else if (rand > 0.898) {
            ctx.fillStyle = `rgba(0, 255, 95, ${op})`;
          } else {
            ctx.fillStyle = `rgba(0, ${130 + Math.floor(80 * columnOpacity[i])}, ${42 + Math.floor(30 * columnOpacity[i])}, ${Math.min(1, op * 0.96)})`;
          }

          ctx.fillText(char, x, y);
        }

        drops[i] += columnBases[i] * speedMul * dir;

        if (dir > 0) {
          if (drops[i] * fontSize > canvas.height) {
            drops[i] = Math.random() * -20;
            columnOpacity[i] = 0.15 + Math.random() * 0.5;
          }
        } else if (drops[i] < 0) {
          drops[i] = canvas.height / fontSize + Math.random() * 25;
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
  }, [thinBinary]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
