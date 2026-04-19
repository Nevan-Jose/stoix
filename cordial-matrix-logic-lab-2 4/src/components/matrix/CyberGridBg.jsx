import { useEffect, useRef } from 'react';

export default function CyberGridBg({ accent = '#e03535', downOnly = false, orbitRect = null }) {
  const canvasRef = useRef(null);
  const orbitRef  = useRef(orbitRect);
  useEffect(() => { orbitRef.current = orbitRect; }, [orbitRect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);

    // ── downOnly mode: strict vertical columns, one walker each ──
    if (downOnly) {
      const COL_W      = 22;   // px between columns
      const TRAIL_PX   = 110;  // visible trail length
      const BASE_SPEED = 1.6;

      let cols   = 0;
      let walkers = [];

      const buildWalkers = () => {
        cols    = Math.floor(canvas.width / COL_W);
        walkers = Array.from({ length: cols }, (_, i) => ({
          x:       i * COL_W + COL_W / 2,
          y:       -Math.random() * canvas.height * 1.2,
          speed:   BASE_SPEED * (0.7 + Math.random() * 0.6),
          opacity: 0.28 + Math.random() * 0.45,
          trail:   [],
          trailLen: Math.ceil(TRAIL_PX / (BASE_SPEED * (0.7 + Math.random() * 0.6))),
        }));
      };

      const resize = () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        buildWalkers();
      };
      resize();
      window.addEventListener('resize', resize);

      let animId;
      const frame = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const or = orbitRef.current;

        for (const w of walkers) {
          // Advance position
          w.y += w.speed;
          w.trail.push(w.y);
          if (w.trail.length > w.trailLen) w.trail.shift();

          // Reset to above screen when done
          if (w.y > canvas.height + 60) {
            w.y       = -20 - Math.random() * canvas.height * 0.5;
            w.trail   = [];
            w.speed   = BASE_SPEED * (0.7 + Math.random() * 0.6);
            w.opacity = 0.28 + Math.random() * 0.45;
          }

          // Whether this column is blocked by the card
          const blocked = or &&
            w.x >= or.x &&
            w.x <= or.x + or.width;

          // Draw trail
          for (let i = 1; i < w.trail.length; i++) {
            const py = w.trail[i];
            const ppy = w.trail[i - 1];
            // Skip segments inside card rect
            if (blocked && py >= or.y && ppy <= or.y + or.height) continue;
            const alpha = (i / w.trail.length) * w.opacity;
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth   = 1.4;
            ctx.beginPath();
            ctx.moveTo(w.x, ppy);
            ctx.lineTo(w.x, py);
            ctx.stroke();
          }

          // Draw head (skip if inside card)
          if (blocked && w.y >= or.y && w.y <= or.y + or.height) continue;
          ctx.fillStyle   = `rgba(${r},${g},${b},0.92)`;
          ctx.shadowColor = accent;
          ctx.shadowBlur  = 4;
          ctx.beginPath();
          ctx.arc(w.x, w.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        animId = requestAnimationFrame(frame);
      };
      frame();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', resize);
      };
    }

    // ── omni mode: grid-walking Tron traces (unchanged) ──────────
    const GRID         = 48;
    const SPEED        = 2;
    const NUM_WALKERS  = 7;
    const TRAIL_PX     = 96;
    const TRAIL_FRAMES = Math.ceil(TRAIL_PX / SPEED);
    const snap = v => Math.round(v / GRID) * GRID;

    class Walker {
      constructor(index) {
        const cols = Math.ceil(canvas.width / GRID);
        const rows = Math.ceil(canvas.height / GRID);
        this.x  = snap((Math.floor((index / NUM_WALKERS) * cols) + Math.random() * (cols / NUM_WALKERS)) * GRID);
        this.y  = snap(Math.random() * rows * GRID);
        const d = [[SPEED,0],[-SPEED,0],[0,SPEED],[0,-SPEED]];
        const chosen = d[Math.floor(Math.random() * 4)];
        this.dx = chosen[0]; this.dy = chosen[1];
        this.toNext = GRID; this.trail = [];
      }
      step() {
        this.x += this.dx; this.y += this.dy; this.toNext -= SPEED;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > TRAIL_FRAMES) this.trail.shift();
        if (this.toNext <= 0) {
          this.x = snap(this.x); this.y = snap(this.y); this.toNext = GRID;
          const all = [[SPEED,0],[-SPEED,0],[0,SPEED],[0,-SPEED]];
          const opts = all.filter(d => !(d[0]===-this.dx && d[1]===-this.dy));
          const weights = opts.map(d => (d[0]===this.dx && d[1]===this.dy) ? 3 : 1);
          const total = weights.reduce((a,c)=>a+c,0);
          let pick = Math.random() * total;
          for (let i = 0; i < opts.length; i++) {
            pick -= weights[i];
            if (pick <= 0) { this.dx = opts[i][0]; this.dy = opts[i][1]; break; }
          }
        }
        let wrapped = false;
        if (this.x < -GRID)               { this.x = snap(canvas.width);  wrapped = true; }
        if (this.x > canvas.width + GRID)  { this.x = snap(0);             wrapped = true; }
        if (this.y < -GRID)               { this.y = snap(canvas.height); wrapped = true; }
        if (this.y > canvas.height + GRID) { this.y = snap(0);             wrapped = true; }
        if (wrapped) this.trail = [];
      }
      draw() {
        const t = this.trail;
        if (t.length < 2) return;
        for (let i = 1; i < t.length; i++) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r},${g},${b},${(i/t.length)*0.75})`;
          ctx.lineWidth = 1.5; ctx.lineCap = 'square';
          ctx.moveTo(t[i-1].x, t[i-1].y); ctx.lineTo(t[i].x, t[i].y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.95)`; ctx.fill();
      }
    }

    const resize2 = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize2();
    window.addEventListener('resize', resize2);
    const omniWalkers = Array.from({ length: NUM_WALKERS }, (_, i) => new Walker(i));
    let animId2;
    const frame2 = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const w of omniWalkers) { w.step(); w.draw(); }
      animId2 = requestAnimationFrame(frame2);
    };
    frame2();
    return () => { cancelAnimationFrame(animId2); window.removeEventListener('resize', resize2); };

  }, [accent, downOnly]);

  return (
    <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:-1, pointerEvents:'none' }} />
  );
}
