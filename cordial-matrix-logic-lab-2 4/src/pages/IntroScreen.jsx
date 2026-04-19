import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import IntenseRainTransition from '../components/matrix/IntenseRainTransition';

// Phases:
// 'hello'       — types "Hello" slowly, then waits 5s
// 'question'    — fades in question text, waits 10s
// 'rain'        — intense full-screen binary rain for ~3.5s
// 'dashboard'   — show what the site does + blue/red pill choice

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

export default function IntroScreen() {
  const [phase, setPhase] = useState('hello');
  const [showCursor, setShowCursor] = useState(true);
  const navigate = useNavigate();

  // Phase: hello — type "Hello" then wait 5s
  const { displayed: helloText, done: helloDone } = useTypewriter('Hello.', 180, phase === 'hello');

  useEffect(() => {
    if (phase === 'hello' && helloDone) {
      const t = setTimeout(() => setPhase('question'), 5000);
      return () => clearTimeout(t);
    }
  }, [phase, helloDone]);

  // Phase: question — type question, then wait 4s after done, then go to rain
  const { displayed: questionText, done: questionDone } = useTypewriter(
    'Have you ever felt that there\'s something strange about this world?',
    55,
    phase === 'question'
  );

  useEffect(() => {
    if (phase === 'question' && questionDone) {
      const t = setTimeout(() => setPhase('rain'), 4000);
      return () => clearTimeout(t);
    }
  }, [phase, questionDone]);

  // Rain done → dashboard
  const handleRainDone = useCallback(() => {
    setPhase('dashboard');
  }, []);

  const handleExit = () => {
    window.location.href = 'about:blank';
  };

  const handleContinue = () => {
    navigate('/home');
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Ambient rain — only visible from rain phase onward */}
      {(phase === 'rain' || phase === 'dashboard') && (
        <MatrixRainBg intensity={1} speed={0.9} />
      )}

      {/* Intense rain transition layer */}
      <AnimatePresence>
        {phase === 'rain' && (
          <motion.div
            key="intense-rain"
            className="fixed inset-0"
            style={{ zIndex: 10 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <IntenseRainTransition onComplete={handleRainDone} duration={3500} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content layer */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>

        {/* PHASE: Hello */}
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

        {/* PHASE: Question */}
        <AnimatePresence>
          {phase === 'question' && (
            <motion.div
              key="question"
              className="text-center max-w-2xl px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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

        {/* PHASE: Dashboard */}
        <AnimatePresence>
          {phase === 'dashboard' && (
            <motion.div
              key="dashboard"
              className="text-center max-w-3xl px-6 sm:px-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              {/* Glitch line accent */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-px mb-8 mx-auto"
                style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)', maxWidth: '300px' }}
              />

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="font-mono mb-4"
                style={{
                  fontSize: 'clamp(1.4rem, 4vw, 2.6rem)',
                  color: '#00ff41',
                  textShadow: '0 0 16px #00ff41aa, 0 0 40px #00ff4155',
                  letterSpacing: '0.06em',
                }}
              >
                THE MATRIX PLANNER
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="font-mono mb-3"
                style={{
                  fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
                  color: 'rgba(0,255,65,0.65)',
                  letterSpacing: '0.03em',
                  lineHeight: '1.8',
                }}
              >
                You have a goal. A destination. Something you want to become.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="font-mono mb-3"
                style={{
                  fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
                  color: 'rgba(0,255,65,0.65)',
                  letterSpacing: '0.03em',
                  lineHeight: '1.8',
                }}
              >
                We use AI to break that goal into a sequence of invisible micro-tasks —<br />
                each one so small you will barely notice it.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                className="font-mono mb-12"
                style={{
                  fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
                  color: 'rgba(0,255,65,0.5)',
                  letterSpacing: '0.03em',
                  lineHeight: '1.8',
                }}
              >
                But together, they will bend reality to your will.
              </motion.p>

              <motion.div
                className="h-px mb-12 mx-auto"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 1.8 }}
                style={{ background: 'linear-gradient(90deg, transparent, #00ff4155, transparent)', maxWidth: '300px' }}
              />

              {/* Pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.2, duration: 0.8 }}
                className="flex items-center justify-center gap-8 sm:gap-16"
              >
                {/* Blue pill — Exit */}
                <button
                  onClick={handleExit}
                  className="group cursor-pointer transition-all duration-300 hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 12px #3b82f6aa)' }}
                >
                  <div
                    style={{
                      width: '130px',
                      height: '50px',
                      borderRadius: '25px',
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #93c5fd 100%)',
                      boxShadow: '0 0 20px #3b82f680, 0 4px 12px #1d4ed860, inset 0 2px 4px rgba(255,255,255,0.25)',
                      border: '1px solid #60a5fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '16px',
                        width: '36px',
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.3)',
                      }}
                    />
                    <span
                      className="font-mono tracking-widest uppercase text-sm font-bold"
                      style={{ color: '#ffffff', textShadow: '0 0 8px rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}
                    >
                      Exit
                    </span>
                  </div>
                </button>

                {/* Red pill — Continue */}
                <button
                  onClick={handleContinue}
                  className="group cursor-pointer transition-all duration-300 hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 12px #ef4444aa)' }}
                >
                  <div
                    style={{
                      width: '130px',
                      height: '50px',
                      borderRadius: '25px',
                      background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 50%, #fca5a5 100%)',
                      boxShadow: '0 0 20px #ef444480, 0 4px 12px #991b1b60, inset 0 2px 4px rgba(255,255,255,0.25)',
                      border: '1px solid #f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '16px',
                        width: '36px',
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.3)',
                      }}
                    />
                    <span
                      className="font-mono tracking-widest uppercase text-sm font-bold"
                      style={{ color: '#ffffff', textShadow: '0 0 8px rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}
                    >
                      Continue
                    </span>
                  </div>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}