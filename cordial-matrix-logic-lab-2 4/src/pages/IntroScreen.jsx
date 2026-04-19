import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import MatrixRainBg from '../components/matrix/MatrixRainBg';

function useTypewriter(text, charDelay, startTyping) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!startTyping) return;
    setDisplayed(''); setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, charDelay);
    return () => clearInterval(iv);
  }, [text, charDelay, startTyping]);
  return { displayed, done };
}

/* ── Vanilla Three.js pill canvas ───────────────────────────── */
function PillCanvas3D({ isRed, isBlack = false }) {
  const canvasRef  = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef   = useRef(null);
  const cameraRef  = useRef(null);
  const uniformRef = useRef(null);

  // Build scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(420, 132, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, 420 / 132, 0.1, 100);
    camera.position.set(0, 0, 1.85);
    cameraRef.current = camera;

    const geo = new THREE.CapsuleGeometry(0.48, 1.9, 14, 40);
    geo.rotateZ(Math.PI / 2);

    const colorVec = new THREE.Color(isRed ? '#b81800' : '#004ea8');
    const uPillColor = { value: colorVec };
    uniformRef.current = uPillColor;

    const mat = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.25 });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying float vLocalX;'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvLocalX = position.x;'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>\nvarying float vLocalX;\nuniform vec3 uPillColor;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `float endFade = smoothstep(0.85, 1.43, abs(vLocalX));
vec3 col = mix(uPillColor, uPillColor * 0.06, endFade);
diffuseColor = vec4(col, opacity);`
      );
      shader.uniforms.uPillColor = uPillColor;
    };

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(0.4, 3, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(isRed ? 0xff4422 : 0x2255ff, 0.45);
    fill.position.set(-2, -1.5, 0.8);
    scene.add(fill);

    renderer.render(scene, camera);

    return () => {
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      uniformRef.current = null;
    };
  }, [isRed]);

  // Update color when isBlack changes, with a quick lerp
  useEffect(() => {
    const u = uniformRef.current;
    const r = rendererRef.current;
    const s = sceneRef.current;
    const c = cameraRef.current;
    if (!u || !r || !s || !c) return;

    const target = isBlack
      ? new THREE.Color('#060101')
      : new THREE.Color(isRed ? '#b81800' : '#004ea8');

    const start  = u.value.clone();
    const startT = performance.now();
    const dur    = 220; // ms
    let raf;

    const tick = (now) => {
      const t = Math.min((now - startT) / dur, 1);
      u.value.lerpColors(start, target, t);
      r.render(s, c);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBlack, isRed]);

  return (
    <canvas
      ref={canvasRef}
      width={420}
      height={132}
      style={{ width: 420, height: 132, display: 'block' }}
    />
  );
}

/* ── HUD label box ──────────────────────────────────────────── */
function HUDLabel({ isRed }) {
  const color    = isRed ? '#e03535' : '#00b8d9';
  const bg       = isRed ? 'rgba(10,2,2,0.9)' : 'rgba(2,6,14,0.9)';
  const title    = isRed ? 'RED PILL'  : 'BLUE PILL';
  const subtitle = isRed ? 'STRUCTURE YOUR TIME' : 'EXPLORE SPONTANEITY';
  const cs = 9;

  return (
    <div style={{ position: 'relative', border: `1px solid ${color}88`, padding: '18px 52px', background: bg,
                  textAlign: 'center', minWidth: '300px',
                  boxShadow: `0 0 24px ${color}33, inset 0 0 20px ${color}08` }}>
      {[
        { top:-2, left:-2,  borderTop:`2px solid ${color}`, borderLeft:`2px solid ${color}` },
        { top:-2, right:-2, borderTop:`2px solid ${color}`, borderRight:`2px solid ${color}` },
        { bottom:-2, left:-2,  borderBottom:`2px solid ${color}`, borderLeft:`2px solid ${color}` },
        { bottom:-2, right:-2, borderBottom:`2px solid ${color}`, borderRight:`2px solid ${color}` },
      ].map((s, i) => <div key={i} style={{ position:'absolute', width:cs, height:cs, ...s }} />)}
      <div style={{ color:'#fff', fontFamily:"'Rajdhani',monospace", fontWeight:700, letterSpacing:'0.22em',
                    fontSize:'26px', textShadow:`0 0 14px ${color}`, marginBottom:'7px' }}>
        {title}
      </div>
      <div style={{ color, fontFamily:"'Share Tech Mono',monospace", fontSize:'13px', letterSpacing:'0.2em',
                    textShadow:`0 0 8px ${color}88` }}>
        {subtitle}
      </div>
    </div>
  );
}


/* ── Pill button ────────────────────────────────────────────── */
function PillButton({ tone, onClick, onHoverChange }) {
  const isRed = tone === 'red';
  const glowColor = isRed ? '#ff1100' : '#0099ff';
  const [hovered, setHovered] = useState(false);

  const handleHoverStart = () => { setHovered(true);  onHoverChange?.(true);  };
  const handleHoverEnd   = () => { setHovered(false); onHoverChange?.(false); };

  return (
    <motion.button
      type="button" onClick={onClick}
      whileTap={{ scale: 0.97 }}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      style={{ background:'none', border:'none', cursor:'pointer',
               display:'flex', flexDirection:'column', alignItems:'center', gap:'42px', padding:'20px' }}
      aria-label={isRed ? 'Red Pill' : 'Blue Pill'}
    >
      <div style={{ position:'relative', paddingBottom:'30px' }}>
        <motion.div
          animate={{ y: -13 }}
          transition={{ duration: 2.4, repeat: Infinity, repeatType: 'mirror',
                        ease: [0.42, 0, 0.58, 1], delay: isRed ? 0 : 0.7 }}
          style={{ willChange:'transform' }}
        >
          {/* Rotation + glow wrapper */}
          <div style={{
            filter: [
              `drop-shadow(0 0 3px ${glowColor})`,
              `drop-shadow(0 0 10px ${glowColor}99)`,
              `drop-shadow(0 0 22px ${glowColor}44)`,
            ].join(' '),
            willChange: 'filter',
            transform: isRed ? 'scaleX(-1) rotate(-14deg)' : 'rotate(-14deg)',
            transformOrigin: 'center center',
            position: 'relative',
            width: 420,
            height: 132,
          }}>
            {/* Inner glow between halves on hover */}
            <motion.div
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'absolute', left: '50%', top: '8%',
                transform: 'translateX(-50%)',
                width: 28, height: '84%',
                background: `radial-gradient(ellipse at center, ${glowColor}ff 0%, ${glowColor}99 30%, transparent 75%)`,
                zIndex: 10, filter: 'blur(5px)', pointerEvents: 'none',
              }}
            />

            {/* Left half — clips left 150px, turns black on hover */}
            <motion.div
              animate={{ x: hovered ? -22 : 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', left: 0, top: 0, width: 210, height: 132, overflow: 'hidden' }}
            >
              <PillCanvas3D isRed={isRed} isBlack={true} />
            </motion.div>

            {/* Right half — clips right 150px via -150px offset, stays colored */}
            <motion.div
              animate={{ x: hovered ? 22 : 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', left: 210, top: 0, width: 210, height: 132, overflow: 'hidden' }}
            >
              <div style={{ position: 'relative', left: -210 }}>
                <PillCanvas3D isRed={isRed} isBlack={false} />
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Floor glow */}
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
                      width:'300px', height:'24px',
                      background:`radial-gradient(ellipse at center, ${glowColor}44 0%, transparent 70%)`,
                      filter:'blur(6px)' }} />
      </div>
      <HUDLabel isRed={isRed} />
    </motion.button>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function IntroScreen() {
  const location = useLocation();
  const [phase, setPhase] = useState(() => location.state?.skipIntro ? 'choice' : 'hello');
  const [pillHovered, setPillHovered] = useState(false);
  const [transitioning, setTransitioning] = useState(null);
  const navigate = useNavigate();

  const { displayed: helloText, done: helloDone } =
    useTypewriter('Hello.', 180, phase === 'hello');

  useEffect(() => {
    if (phase === 'hello' && helloDone) {
      const t = setTimeout(() => setPhase('question'), 3000);
      return () => clearTimeout(t);
    }
  }, [phase, helloDone]);

  const { displayed: questionText, done: questionDone } = useTypewriter(
    "Have you ever felt that there's something strange about this world?",
    55, phase === 'question'
  );

  useEffect(() => {
    if (phase === 'question' && questionDone) {
      const t = setTimeout(() => setPhase('choice'), 5000);
      return () => clearTimeout(t);
    }
  }, [phase, questionDone]);

  const handleRedPill  = () => setTransitioning('red');
  const handleBluePill = () => setTransitioning('blue');

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Rain fades in when question finishes typing so it's already visible by choice phase */}
      <AnimatePresence>
        {(phase === 'choice' || (phase === 'question' && questionDone)) && (
          <motion.div key="rain"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 2.2 }}
            style={{ position: 'fixed', inset: 0 }}>
            <MatrixRainBg intensity={1} speed={0.9} slowFactor={pillHovered ? 0.15 : 1} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Company wordmark — appears with choice screen */}
      <motion.div
        animate={{ opacity: phase === 'choice' ? 1 : 0, y: phase === 'choice' ? 0 : -8 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 0 0',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          fontFamily: "'Rajdhani', monospace", fontWeight: 700,
          fontSize: '28px', letterSpacing: '0.45em',
          color: '#fff', textTransform: 'uppercase',
          textShadow: '0 0 18px rgba(0,255,65,0.35)',
        }}>
          STOIX
        </div>
        <div style={{
          marginTop: '10px', width: '48px', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.4), transparent)',
        }} />
      </motion.div>

      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
        {/* Single AnimatePresence with mode="wait" — each phase fully exits before next enters */}
        <AnimatePresence mode="wait">
          {phase === 'hello' && (
            <motion.div key="hello" className="text-center"
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              exit={{ opacity:0 }} transition={{ duration:0.55 }}>
              <p className="font-mono text-glow-strong"
                 style={{ fontSize:'clamp(1.1rem,3vw,1.8rem)', color:'#00ff41',
                          letterSpacing:'0.04em', textShadow:'0 0 12px #00ff4199, 0 0 30px #00ff4144' }}>
                {helloText}
                <span style={{ display:'inline-block', width:'0.6em', height:'1em', background:'#00ff41',
                               marginLeft:'4px', verticalAlign:'middle', animation:'blink 0.8s infinite',
                               boxShadow:'0 0 10px #00ff41' }} />
              </p>
            </motion.div>
          )}

          {phase === 'question' && (
            <motion.div key="question" className="text-center max-w-2xl px-8"
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              exit={{ opacity:0 }} transition={{ duration:0.55 }}>
              <p className="font-mono leading-relaxed"
                 style={{ fontSize:'clamp(1.1rem,3vw,1.8rem)', color:'#00ff41',
                          textShadow:'0 0 12px #00ff4199, 0 0 30px #00ff4144', letterSpacing:'0.04em' }}>
                {questionText}
                {!questionDone && (
                  <span style={{ display:'inline-block', width:'0.5em', height:'1em', background:'#00ff41',
                                 marginLeft:'3px', verticalAlign:'middle', animation:'blink 0.8s infinite',
                                 boxShadow:'0 0 8px #00ff41' }} />
                )}
              </p>
            </motion.div>
          )}

          {phase === 'choice' && (
            <motion.div key="choice" className="text-center max-w-4xl px-6 sm:px-10 relative"
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.8 }}>
              <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden
                style={{ background:'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,20,0,0.7) 0%, rgba(0,0,0,0.45) 55%, transparent 75%)' }} />

              <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }}
                transition={{ duration:0.8, delay:0.15 }}
                className="h-px mb-6 mx-auto"
                style={{ background:'linear-gradient(90deg, transparent, #00ff41, transparent)', maxWidth:'320px' }} />

              <p style={{ fontFamily:"'Rajdhani',monospace", letterSpacing:'0.25em', fontSize:'11px',
                          color:'rgba(0,255,65,0.7)', marginBottom:'24px' }}>
                [ // PROTOCOL SELECTION ]
              </p>

              <motion.h1
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.25, duration:0.7 }}
                style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, letterSpacing:'0.26em',
                         color:'#39ff14', fontSize:'clamp(1.4rem,3.5vw,2.4rem)',
                         textShadow:'0 0 14px #39ff1499, 0 0 40px #39ff1444', marginBottom:'40px' }}>
                CHOOSE YOUR PATH
              </motion.h1>

              <motion.div
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.4, duration:0.7 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-20 mb-10">
                <PillButton tone="red"  onClick={handleRedPill}  onHoverChange={setPillHovered} />
                <PillButton tone="blue" onClick={handleBluePill} onHoverChange={setPillHovered} />
              </motion.div>

              <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }}
                transition={{ delay:0.65, duration:0.6 }}
                style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px',
                         color:'rgba(180,255,190,0.55)', letterSpacing:'0.1em' }}>
                Your decision is not final. You can return and choose again at any time.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {transitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          onAnimationComplete={() => navigate(transitioning === 'red' ? '/protocol' : '/blue')}
          style={{ position:'fixed', inset:0, zIndex:200, background:'#000', pointerEvents:'none' }}
        />
      )}
    </div>
  );
}
