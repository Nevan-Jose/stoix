// STOIX // Matrix digital rain — water-smooth motion
//
// Technique: instead of fading the previous frame (which makes motion
// snap per-row), we fully clear and redraw every frame. Each column
// renders its head plus a trail of glyphs at continuous fractional Y,
// so movement is perfectly fluid — no row snapping anywhere.
(function () {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const fontSize = 17;
  const lineStep = 18;          // vertical distance between glyphs (px)

  // Classic Matrix-style charset
  const KATAKANA =
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
  const SYMBOLS  = "0123456789:・.=*+-<>¦|";
  const CHARSET  = (KATAKANA + SYMBOLS).split("");

  // Tuning
  const COLUMN_DENSITY   = 0.9;
  const BASE_SPEED_PX    = 34;      // pixels/second, slow and calm
  const SPEED_JITTER_PX  = 22;      // per-column variance
  const FAST_COLUMN_PCT  = 0.06;
  const FAST_SPEED_MULT  = 2.0;
  const TRAIL_LENGTH     = 22;      // glyphs drawn behind the head
  const HEAD_GLYPH_SWAP_HZ = 8;     // times/sec the head glyph changes
  const TRAIL_GLYPH_SWAP_HZ = 0.5;  // times/sec a random trail glyph swaps

  let width, height, columns, dpr;
  let cols = [];
  let lastTs = 0;

  function randGlyph() {
    return CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }

  function makeColumn(i) {
    const base = BASE_SPEED_PX + Math.random() * SPEED_JITTER_PX;
    const fast = Math.random() < FAST_COLUMN_PCT;
    // Pre-fill a trail so columns don't start with a long "head only" streak
    const trail = [];
    for (let k = 0; k < TRAIL_LENGTH; k++) trail.push(randGlyph());
    return {
      x: i * fontSize,
      y: -Math.random() * height * 1.2,    // stagger entry from above
      speed: fast ? base * FAST_SPEED_MULT : base,
      headGlyph: randGlyph(),
      trail,
      headSwapT: 0,
      trailSwapT: 0,
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    columns = Math.floor((width / fontSize) * COLUMN_DENSITY);
    cols = new Array(columns);
    for (let i = 0; i < columns; i++) cols[i] = makeColumn(i);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = "top";
  }

  function draw(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
    lastTs = ts;

    // Full clear every frame — no per-row fade artifacts, no snapping.
    ctx.clearRect(0, 0, width, height);

    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = "top";

    for (let i = 0; i < columns; i++) {
      const c = cols[i];

      // Advance head position in real pixels — continuous, not row-step
      c.y += c.speed * dt;

      // Swap head glyph occasionally for flickering head
      c.headSwapT += dt * HEAD_GLYPH_SWAP_HZ;
      if (c.headSwapT >= 1) {
        c.headSwapT = 0;
        c.headGlyph = randGlyph();
      }

      // Occasionally mutate a single random trail glyph
      c.trailSwapT += dt * TRAIL_GLYPH_SWAP_HZ * TRAIL_LENGTH;
      while (c.trailSwapT >= 1) {
        c.trailSwapT -= 1;
        c.trail[Math.floor(Math.random() * c.trail.length)] = randGlyph();
      }

      // Draw trail — each glyph placed at a fractional Y behind the head
      const headY = c.y;
      for (let k = 0; k < c.trail.length; k++) {
        const y = headY - (k + 1) * lineStep;
        if (y < -lineStep || y > height + lineStep) continue;

        const fade = 1 - k / c.trail.length;
        if (k === 0) {
          // brightest trail glyph right under the head
          ctx.fillStyle = `rgba(175, 245, 200, ${0.72 * fade + 0.12})`;
        } else {
          const a = 0.14 + fade * 0.48;
          ctx.fillStyle = `rgba(45, 220, 125, ${a})`;
        }
        ctx.fillText(c.trail[k], c.x, y);
      }

      // Head — pale green with gentle glow
      if (headY > -lineStep && headY < height + lineStep) {
        ctx.shadowColor = "rgba(80, 230, 145, 0.7)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "rgba(215, 250, 225, 0.95)";
        ctx.fillText(c.headGlyph, c.x, headY);
        ctx.shadowBlur = 0;
      }

      // When head falls far enough below screen, rotate the column:
      // push head glyph into trail and reset head to top.
      const fullHeight = height + TRAIL_LENGTH * lineStep;
      if (headY > fullHeight) {
        cols[i] = makeColumn(i);
        cols[i].y = -Math.random() * 200;      // start just above screen
      } else {
        // Continuously cycle trail glyphs as head moves a full lineStep
        // so trail content feels alive without snapping positions.
        const desiredCycles = Math.floor(headY / lineStep);
        if (c._lastCycle === undefined) c._lastCycle = desiredCycles;
        while (c._lastCycle < desiredCycles) {
          // shift trail down (oldest gets dropped, newest at index 0 = just behind head)
          c.trail.pop();
          c.trail.unshift(randGlyph());
          c._lastCycle++;
        }
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
