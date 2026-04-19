import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import { getIntroInitialPhase } from '@/lib/stoix-nav';
import { STOIX_MATRIX_INTENSITY, STOIX_MATRIX_SPEED } from '@/lib/matrix-rain-presets';

// Phases:
// 'hello'       — type "Hello.", hold 3s → question
// 'question'    — type second sentence, hold 5s → transition
// 'transition'  — digital rain ramps to same intensity/speed as Protocol / Blue pill
// 'choice'      — pill UI (rain matches other STOIX pages)

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function useTypewriter(text, charDelay, startTyping) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!startTyping) {
      setDisplayed('');
      setDone(false);
      return;
    }
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

function PillButton({ tone, title, strong, children, onClick }) {
  const isRed = tone === 'red';
  const shell = isRed
    ? {
        gradient: 'linear-gradient(155deg, #fee2e2 0%, #f87171 22%, #ef4444 52%, #dc2626 82%, #b91c1c 100%)',
        border: '1px solid #fecaca',
        inner:
          'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -8px 14px rgba(90, 0, 0, 0.42), inset 0 -16px 18px rgba(60, 0, 0, 0.35)',
        outer:
          '0 0 44px rgba(248, 113, 113, 0.72), 0 0 28px rgba(252, 165, 165, 0.55), 0 16px 24px rgba(0,0,0,0.42), 0 5px 11px rgba(185, 28, 28, 0.65)',
        filter: 'drop-shadow(0 0 20px rgba(248, 113, 113, 0.85))',
        baseShadow: 'rgba(127, 29, 29, 0.8)',
        sheen: 'rgba(255, 225, 225, 0.3)',
      }
    : {
        gradient: 'linear-gradient(155deg, #93c5fd 0%, #3b82f6 36%, #1d4ed8 68%, #1e3a8a 100%)',
        border: '1px solid #93c5fd',
        inner:
          'inset 0 2px 0 rgba(255,255,255,0.42), inset 0 -8px 14px rgba(15, 40, 100, 0.45), inset 0 -16px 18px rgba(8, 22, 70, 0.35)',
        outer:
          '0 0 38px rgba(59, 130, 246, 0.58), 0 0 20px rgba(147, 197, 253, 0.5), 0 16px 24px rgba(0,0,0,0.44), 0 5px 11px rgba(30, 64, 175, 0.68)',
        filter: 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.7))',
        baseShadow: 'rgba(30, 58, 138, 0.78)',
        sheen: 'rgba(220, 236, 255, 0.32)',
      };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border-0 bg-transparent p-0 transition-all duration-200 hover:-translate-y-1 hover:brightness-110 active:translate-y-0.5 active:brightness-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={{ filter: shell.filter, perspective: '980px' }}
      aria-label={title}
    >
      <div className="relative w-[min(100%,196px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 -bottom-3 h-5 rounded-full blur-md transition-all duration-200 group-hover:-bottom-3.5"
          style={{ background: `linear-gradient(180deg, ${shell.baseShadow}, rgba(0,0,0,0))` }}
        />
        <div
          className="relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-2xl overflow-hidden transition-transform duration-200 group-hover:[transform:rotateX(11deg)_translateY(-2px)] group-active:[transform:rotateX(4deg)_translateY(1px)]"
          style={{
            background: shell.gradient,
            border: shell.border,
            boxShadow: `${shell.inner}, ${shell.outer}`,
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-[8%] right-[8%] top-[6%] h-[42%] rounded-[14px] blur-[1px]"
            style={{
              background: `linear-gradient(180deg, ${shell.sheen}, rgba(255,255,255,0))`,
              transform: 'translateZ(14px)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.26) 100%)',
              mixBlendMode: 'soft-light',
            }}
          />
          <span
            className="relative font-mono tracking-[0.18em] text-[11px] sm:text-xs font-bold text-white"
            style={{
              textShadow: '0 0 12px rgba(255,255,255,0.45), 0 2px 3px rgba(0,0,0,0.42)',
              transform: 'translateZ(20px)',
            }}
          >
            {title}
          </span>
          <span
            className="relative text-center text-white text-[10px] sm:text-[11px] leading-snug px-0.5"
            style={{ transform: 'translateZ(12px)' }}
          >
            <strong className="font-semibold block mb-1">{strong}</strong>
            <span className="font-mono opacity-95 leading-relaxed">{children}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

/** Greek letters + digits for one-shot “decrypt” effect on the choice screen */
const CIPHER_POOL =
  'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0123456789';

function cipherRandomChar() {
  return CIPHER_POOL[Math.floor(Math.random() * CIPHER_POOL.length)];
}

function isCipherableChar(ch) {
  return /[A-Za-z0-9]/.test(ch);
}

function textToCipher(text) {
  return [...text]
    .map((ch) => {
      if (ch === '\n') return '\n';
      if (!isCipherableChar(ch)) return ch;
      return cipherRandomChar();
    })
    .join('');
}

/**
 * After `delayMs` (once Framer has finished fading copy in), shows Greek/digit
 * cipher briefly, then resolves left-to-order through cipherable characters to `children`.
 */
function CipherRevealText({ as: Comp = 'span', children, delayMs, className, style }) {
  const finalText = String(children);
  const [shown, setShown] = useState(finalText);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return undefined;

    let tCipher;
    let tDecode;
    let decodeInterval;
    let cancelled = false;

    const indices = [];
    for (let i = 0; i < finalText.length; i++) {
      if (isCipherableChar(finalText[i])) indices.push(i);
    }
    const n = indices.length;
    const holdMs = CHOICE_CIPHER_HOLD_MS;
    const decodeMs = 820;
    const perStep = n > 0 ? Math.max(22, Math.min(40, Math.floor(decodeMs / n))) : 40;

    tCipher = setTimeout(() => {
      if (cancelled) return;
      setShown(textToCipher(finalText));

      tDecode = setTimeout(() => {
        if (cancelled) return;
        let revealed = 0;
        decodeInterval = setInterval(() => {
          if (cancelled) return;
          revealed += 1;
          const unlocked = new Set(indices.slice(0, revealed));
          setShown(
            [...finalText]
              .map((ch, i) => {
                if (!isCipherableChar(ch)) return ch;
                if (unlocked.has(i)) return finalText[i];
                return cipherRandomChar();
              })
              .join('')
          );
          if (revealed >= n) {
            clearInterval(decodeInterval);
            setShown(finalText);
          }
        }, perStep);
      }, holdMs);
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(tCipher);
      clearTimeout(tDecode);
      clearInterval(decodeInterval);
    };
  }, [finalText, delayMs, reduceMotion]);

  return (
    <Comp className={className} style={style} aria-label={finalText}>
      {shown}
    </Comp>
  );
}

const TRANSITION_MS = 8200;
const PILL_LOADING_MS = 4000;
/** Choice screen: hold cipher glyphs before decoding back to English */
const CHOICE_CIPHER_HOLD_MS = 560;
/** Stagger each block so the user catches every line (after intro motion ~1s) */
const CHOICE_CIPHER_DELAY_STOIX = 1650;
const CHOICE_CIPHER_DELAY_HEADING = 1780;
const CHOICE_CIPHER_DELAY_BODY = 1910;
const CHOICE_CIPHER_DELAY_FOOTER = 2040;
const RED_PILL_LOADING_TEXT =
  "I'll show you how deep the rabbit hole goes";
const BLUE_PILL_LOADING_TEXT =
  "The story begins. You'll wake up in your bed and believe whatever you want to be";

const RAIN_PEAK_INTENSITY = STOIX_MATRIX_INTENSITY;
const RAIN_PEAK_SPEED = STOIX_MATRIX_SPEED;
const RAIN_START_INTENSITY = 0.04;
const RAIN_START_SPEED = 0.116;

export default function IntroScreen() {
  const [phase, setPhase] = useState(() => getIntroInitialPhase());
  const [rainIntensity, setRainIntensity] = useState(() =>
    getIntroInitialPhase() === 'choice' ? STOIX_MATRIX_INTENSITY : RAIN_START_INTENSITY
  );
  const [rainSpeed, setRainSpeed] = useState(() =>
    getIntroInitialPhase() === 'choice' ? STOIX_MATRIX_SPEED : RAIN_START_SPEED
  );
  const [rainOverlayOpacity, setRainOverlayOpacity] = useState(() =>
    getIntroInitialPhase() === 'choice' ? 1 : 0
  );
  /** Set when a pill is clicked; 4s gate before route change */
  const [pillLoading, setPillLoading] = useState(null);
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
      const elapsed = now - t0;
      const u = Math.min(1, elapsed / TRANSITION_MS);
      const e = easeInOutCubic(u);

      setRainIntensity(
        RAIN_START_INTENSITY + (RAIN_PEAK_INTENSITY - RAIN_START_INTENSITY) * e
      );
      setRainSpeed(RAIN_START_SPEED + (RAIN_PEAK_SPEED - RAIN_START_SPEED) * e);

      const visE = easeInOutCubic(Math.min(1, elapsed / 420));
      setRainOverlayOpacity(0.07 + 0.93 * visE);

      if (u >= 1) {
        setRainIntensity(RAIN_PEAK_INTENSITY);
        setRainSpeed(RAIN_PEAK_SPEED);
        setRainOverlayOpacity(1);
        setPhase('choice');
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (!pillLoading) return;
    const path = pillLoading === 'red' ? '/protocol' : '/blue';
    const t = setTimeout(() => navigate(path), PILL_LOADING_MS);
    return () => clearTimeout(t);
  }, [pillLoading, navigate]);

  const handleRedPill = () => {
    setPillLoading('red');
  };

  const handleBluePill = () => {
    setPillLoading('blue');
  };

  const showRain =
    phase === 'transition' || phase === 'choice' || pillLoading != null;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {showRain && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            opacity: rainOverlayOpacity,
            transition: phase === 'choice' ? 'opacity 0.85s ease-out' : undefined,
          }}
        >
          <MatrixRainBg intensity={rainIntensity} speed={rainSpeed} />
        </div>
      )}

      {/* Full-viewport stack so AnimatePresence phases never sit side-by-side (flex-row flash). */}
      <div className="fixed inset-0" style={{ zIndex: 20 }}>
        <div className="relative h-full w-full">
        <AnimatePresence>
          {phase === 'hello' && (
            <motion.div
              key="hello"
              className="absolute inset-0 flex items-center justify-center text-center"
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
              className="absolute inset-0 flex items-center justify-center px-4 sm:px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-full max-w-[100vw] flex justify-center overflow-x-auto [scrollbar-width:thin]">
              <p
                className="font-mono leading-relaxed whitespace-nowrap text-center"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'choice' && !pillLoading && (
            <motion.div
              key="choice"
              className="absolute inset-0 flex items-center justify-center overflow-y-auto py-8 px-6 sm:px-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative text-center max-w-4xl w-full">
              <div
                className="absolute inset-0 -z-10 rounded-3xl opacity-40 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,20,0,0.75) 0%, rgba(0,0,0,0.5) 55%, transparent 75%)',
                }}
                aria-hidden
              />

              <p className="font-mono text-xs sm:text-sm text-primary/90 tracking-widest mb-4 mt-6 drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]">
                <CipherRevealText as="span" delayMs={CHOICE_CIPHER_DELAY_STOIX}>
                  [ STOIX // PROTOCOL SELECTION ]
                </CipherRevealText>
              </p>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.75 }}
                className="font-mono text-xl sm:text-3xl text-glow mb-4 leading-snug drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]"
              >
                <CipherRevealText as="span" delayMs={CHOICE_CIPHER_DELAY_HEADING}>
                  Which side are you on?
                </CipherRevealText>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.75 }}
                className="font-mono text-sm mb-10 max-w-xl mx-auto leading-relaxed whitespace-pre-line drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)]"
                style={{ color: 'rgba(200,255,210,0.88)' }}
              >
                <CipherRevealText
                  as="span"
                  delayMs={CHOICE_CIPHER_DELAY_BODY}
                >{`Two paths diverge. One demands discipline. The other offers exploration.
Choose with care — the path shapes the protocol.`}</CipherRevealText>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.75 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-20 mb-10"
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
                <CipherRevealText as="span" delayMs={CHOICE_CIPHER_DELAY_FOOTER}>
                  Your decision is not final. You can return and choose again at any time.
                </CipherRevealText>
              </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pillLoading && (
            <motion.div
              key="pill-loading"
              role="status"
              aria-live="polite"
              aria-busy="true"
              className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 px-6 sm:px-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div
                className="absolute inset-0 bg-black/78 backdrop-blur-[2px] pointer-events-none"
                aria-hidden
              />
              <p
                className="relative font-mono text-center max-w-[min(100%,52rem)] leading-relaxed px-2 uppercase tracking-[0.08em]"
                style={{
                  color: '#00ff41',
                  textShadow: '0 0 14px #00ff4199, 0 0 36px #00ff4144',
                  fontSize: 'clamp(1.5rem, 4.6vw, 1.875rem)',
                }}
              >
                {pillLoading === 'red' ? RED_PILL_LOADING_TEXT : BLUE_PILL_LOADING_TEXT}
              </p>
              <div
                className="relative flex flex-col items-center gap-3"
                aria-hidden
              >
                <div className="h-0.5 w-40 sm:w-52 overflow-hidden rounded-full bg-primary/25">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    style={{ boxShadow: '0 0 12px rgba(0,255,65,0.6)' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{
                      duration: PILL_LOADING_MS / 1000,
                      ease: 'linear',
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[10px] sm:text-xs tracking-[0.35em] uppercase"
                  style={{ color: 'rgba(160,255,180,0.72)' }}
                >
                  Loading
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
