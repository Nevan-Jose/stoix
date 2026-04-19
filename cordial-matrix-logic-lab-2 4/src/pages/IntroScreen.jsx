import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MatrixRainBg from '../components/matrix/MatrixRainBg';

// Phases:
// 'hello'       — type "Hello.", hold 3s → question
// 'question'    — type second sentence, hold 5s → transition
// 'transition'  — slow ramp: digital rain fades in and strengthens → persistent background
// 'choice'      — same live rain + pill UI

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function useTypewriter(text, charDelay, startTyping) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!startTyping) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, charDelay);
    return () => clearInterval(interval);
  }, [text, charDelay, startTyping]);

  return { displayed, done };
}

const pillShellClass =
  'group cursor-pointer transition-all duration-300 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-primary rounded-full';

function PillButton({ tone, title, strong, children, onClick }) {
  const isRed = tone === 'red';
  return (
    <button type="button" onClick={onClick} className={pillShellClass} aria-label={title}>
      <div
        className="flex flex-col items-center gap-3 px-6 py-8 sm:px-8 sm:py-10 rounded-3xl max-w-[280px] w-full"
        style={{
          filter: isRed ? 'drop-shadow(0 0 14px #ef4444aa)' : 'drop-shadow(0 0 14px #3b82f6aa)',
          background: isRed
            ? 'linear-gradient(135deg, #991b1b 0%, #ef4444 50%, #fca5a5 100%)'
            : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #93c5fd 100%)',
          boxShadow: isRed
            ? '0 0 22px #ef444480, 0 4px 14px #991b1b60, inset 0 2px 4px rgba(255,255,255,0.2)'
            : '0 0 22px #3b82f680, 0 4px 14px #1d4ed860, inset 0 2px 4px rgba(255,255,255,0.2)',
          border: isRed ? '1px solid #f87171' : '1px solid #60a5fa',
        }}
      >
        <span
          className="font-mono tracking-[0.2em] text-sm sm:text-base font-bold text-white"
          style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
        >
          {title}
        </span>
        <span className="text-center text-white/95 text-xs sm:text-sm leading-relaxed px-1">
          <strong className="font-semibold block mb-1.5">{strong}</strong>
          <span className="font-mono opacity-95">{children}</span>
        </span>
      </div>
    </button>
  );
}

const TRANSITION_MS = 7200;
const RAIN_FINAL_INTENSITY = 1.38;
const RAIN_FINAL_SPEED = 1.08;
const RAIN_START_INTENSITY = 0.04;
const RAIN_START_SPEED = 0.22;

export default function IntroScreen() {
  const [phase, setPhase] = useState('hello');
  const [rainIntensity, setRainIntensity] = useState(RAIN_FINAL_INTENSITY);
  const [rainSpeed, setRainSpeed] = useState(RAIN_FINAL_SPEED);
  const [rainOverlayOpacity, setRainOverlayOpacity] = useState(0);
  const navigate = useNavigate();

  const helloLine = 'Hello.';
  const { displayed: helloText, done: helloDone } = useTypewriter(helloLine, 180, phase === 'hello');

  useEffect(() => {
    if (phase === 'hello' && helloDone) {
      const t = setTimeout(() => setPhase('question'), 3000);
      return () => clearTimeout(t);
    }
  }, [phase, helloDone]);

  const { displayed: questionText, done: questionDone } = useTypewriter(
    "Have you ever felt that there's something strange about this world?",
    55,
    phase === 'question'
  );

  useEffect(() => {
    if (phase === 'question' && questionDone) {
      const t = setTimeout(() => {
        setRainIntensity(RAIN_START_INTENSITY);
        setRainSpeed(RAIN_START_SPEED);
        setRainOverlayOpacity(0);
        setPhase('transition');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [phase, questionDone]);

  useEffect(() => {
    if (phase !== 'transition') return;

    const t0 = performance.now();
    let raf = 0;

    const tick = (now) => {
      const u = Math.min(1, (now - t0) / TRANSITION_MS);
      const e = easeInOutCubic(u);
      setRainIntensity(RAIN_START_INTENSITY + (RAIN_FINAL_INTENSITY - RAIN_START_INTENSITY) * e);
      setRainSpeed(RAIN_START_SPEED + (RAIN_FINAL_SPEED - RAIN_START_SPEED) * e);
      setRainOverlayOpacity(e);

      if (u >= 1) {
        setRainIntensity(RAIN_FINAL_INTENSITY);
        setRainSpeed(RAIN_FINAL_SPEED);
        setRainOverlayOpacity(1);
        setPhase('choice');
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const handleRedPill = () => {
    navigate('/protocol');
  };

  const handleBluePill = () => {
    navigate('/blue');
  };

  const showRain = phase === 'transition' || phase === 'choice';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {showRain && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            opacity: phase === 'transition' ? 0.15 + 0.85 * rainOverlayOpacity : 1,
            transition: phase === 'choice' ? 'opacity 0.8s ease-out' : undefined,
          }}
        >
          <MatrixRainBg intensity={rainIntensity} speed={rainSpeed} />
        </div>
      )}

      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
        <AnimatePresence>
          {phase === 'hello' && (
            <motion.div
              key="hello"
              className="text-center"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p
                className="font-mono text-glow-strong"
                style={{
                  fontSize: 'clamp(1.1rem, 3vw, 1.8rem)',
                  color: '#00ff41',
                  letterSpacing: '0.04em',
                  textShadow: '0 0 12px #00ff4199, 0 0 30px #00ff4144',
                }}
              >
                {helloText}
                <span
                  style={{
                    display: 'inline-block',
                    width: '0.6em',
                    height: '1em',
                    background: '#00ff41',
                    marginLeft: '4px',
                    verticalAlign: 'middle',
                    animation: 'blink 0.8s infinite',
                    boxShadow: '0 0 10px #00ff41',
                  }}
                />
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'question' && (
            <motion.div
              key="question"
              className="text-center max-w-2xl px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p
                className="font-mono leading-relaxed"
                style={{
                  fontSize: 'clamp(1.1rem, 3vw, 1.8rem)',
                  color: '#00ff41',
                  textShadow: '0 0 12px #00ff4199, 0 0 30px #00ff4144',
                  letterSpacing: '0.04em',
                }}
              >
                {questionText}
                {!questionDone && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '0.5em',
                      height: '1em',
                      background: '#00ff41',
                      marginLeft: '3px',
                      verticalAlign: 'middle',
                      animation: 'blink 0.8s infinite',
                      boxShadow: '0 0 8px #00ff41',
                    }}
                  />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'choice' && (
            <motion.div
              key="choice"
              className="text-center max-w-4xl px-6 sm:px-10 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="absolute inset-0 -z-10 rounded-3xl opacity-40 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,20,0,0.75) 0%, rgba(0,0,0,0.5) 55%, transparent 75%)',
                }}
                aria-hidden
              />

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.85, delay: 0.1 }}
                className="h-px mb-6 mx-auto"
                style={{
                  background: 'linear-gradient(90deg, transparent, #00ff41, transparent)',
                  maxWidth: '320px',
                }}
              />

              <p className="font-mono text-xs sm:text-sm text-primary/90 tracking-widest mb-4 drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]">
                [ STOIX // PROTOCOL SELECTION ]
              </p>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.75 }}
                className="font-mono text-xl sm:text-3xl text-glow mb-4 leading-snug drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]"
              >
                Which side are you on?
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.75 }}
                className="font-mono text-sm text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)]"
                style={{ color: 'rgba(200,255,210,0.88)' }}
              >
                Two paths diverge. One demands discipline. The other offers exploration.
                <br />
                Choose with care — the path shapes the protocol.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.75 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-14 mb-10"
              >
                <PillButton tone="blue" title="BLUE PILL" strong="Exploration." onClick={handleBluePill}>
                  Side quests, skill learning, real-world discovery.
                </PillButton>
                <PillButton tone="red" title="RED PILL" strong="Discipline." onClick={handleRedPill}>
                  Structured protocol toward a specific goal.
                </PillButton>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.65 }}
                className="font-mono text-xs max-w-md mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]"
                style={{ color: 'rgba(180,255,190,0.75)' }}
              >
                Your decision is not final. You can return and choose again at any time.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
