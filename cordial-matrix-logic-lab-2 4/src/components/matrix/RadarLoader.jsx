import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SCAN_MESSAGES = {
  red:   ['ANALYZING OBJECTIVE', 'MAPPING PROTOCOL', 'SEQUENCING TASKS', 'CALIBRATING TIMELINE', 'COMPILING SCHEDULE'],
  quest: ['SCANNING VICINITY', 'LOCATING TARGETS', 'PROCESSING SIGNAL', 'RESOLVING COORDINATES', 'ACQUIRING QUESTS'],
  skill: ['MAPPING SKILL TREE', 'ANALYZING REQUIREMENTS', 'BUILDING PATHWAY', 'CALIBRATING SEQUENCE', 'COMPILING MODULES'],
};

export default function RadarLoader({ accent = '#e03535', mode = 'red' }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const msgs = SCAN_MESSAGES[mode] ?? SCAN_MESSAGES.red;

  useEffect(() => {
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % msgs.length), 1900);
    return () => clearInterval(iv);
  }, [msgs.length]);

  // Parse hex to rgb for rgba() usage
  const r = parseInt(accent.slice(1, 3), 16) || 0;
  const g = parseInt(accent.slice(3, 5), 16) || 0;
  const b = parseInt(accent.slice(5, 7), 16) || 0;
  const rgb = `${r},${g},${b}`;

  const SIZE   = 280;
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const RADIUS = SIZE / 2 - 16;

  // Degree ticks around ring
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const deg   = i * 10;
    const rad   = (deg * Math.PI) / 180;
    const inner = deg % 30 === 0 ? RADIUS - 7 : RADIUS - 4;
    return {
      x1: CX + Math.cos(rad) * inner,
      y1: CY + Math.sin(rad) * inner,
      x2: CX + Math.cos(rad) * RADIUS,
      y2: CY + Math.sin(rad) * RADIUS,
      opacity: deg % 30 === 0 ? 0.3 : 0.12,
    };
  });

  // Sweep sector path (120° trailing tail)
  const sweepPath = (() => {
    const endAngle   = 0;
    const startAngle = -(120 * Math.PI) / 180;
    const x1 = CX + Math.cos(startAngle) * RADIUS;
    const y1 = CY + Math.sin(startAngle) * RADIUS;
    const x2 = CX + Math.cos(endAngle) * RADIUS;
    const y2 = CY + Math.sin(endAngle) * RADIUS;
    return `M ${CX} ${CY} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
  })();

  // Fake blip positions (static, gives sense of contacts)
  const staticBlips = [
    { cx: CX + 55, cy: CY - 30 },
    { cx: CX - 70, cy: CY + 20 },
    { cx: CX + 20, cy: CY + 80 },
    { cx: CX - 35, cy: CY - 65 },
    { cx: CX + 85, cy: CY + 55 },
  ];

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(2,3,10,0.93)',
    }}>
      {/* HUD frame */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Corner brackets */}
        {[
          { top: -3, left: -3,  borderTop:`2px solid ${accent}`, borderLeft:`2px solid ${accent}` },
          { top: -3, right: -3, borderTop:`2px solid ${accent}`, borderRight:`2px solid ${accent}` },
          { bottom: -3, left: -3,  borderBottom:`2px solid ${accent}`, borderLeft:`2px solid ${accent}` },
          { bottom: -3, right: -3, borderBottom:`2px solid ${accent}`, borderRight:`2px solid ${accent}` },
        ].map((s, i) => (
          <div key={i} style={{ position:'absolute', width:12, height:12, ...s }} />
        ))}

        {/* Top label */}
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Rajdhani',monospace", fontSize: '9px', fontWeight: 700,
          letterSpacing: '0.25em', color: accent, whiteSpace: 'nowrap',
          backgroundColor: 'rgba(2,3,10,0.93)', padding: '0 8px',
        }}>
          STOIX RADAR v2.4
        </div>

        {/* Radar SVG — pure declarative, no canvas */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ display: 'block', overflow: 'visible' }}>

          {/* Background circle */}
          <circle cx={CX} cy={CY} r={RADIUS} fill="rgba(3,4,12,0.96)" />

          {/* Outer ring */}
          <circle cx={CX} cy={CY} r={RADIUS}
            fill="none" stroke={`rgba(${rgb},0.35)`} strokeWidth="1.5" />

          {/* Concentric rings */}
          {[1,2,3,4].map(i => (
            <circle key={i} cx={CX} cy={CY} r={(RADIUS / 4) * i}
              fill="none" stroke={`rgba(${rgb},0.1)`} strokeWidth="1" />
          ))}

          {/* Crosshairs */}
          <line x1={CX - RADIUS} y1={CY} x2={CX + RADIUS} y2={CY}
            stroke={`rgba(${rgb},0.08)`} strokeWidth="1" strokeDasharray="3 5" />
          <line x1={CX} y1={CY - RADIUS} x2={CX} y2={CY + RADIUS}
            stroke={`rgba(${rgb},0.08)`} strokeWidth="1" strokeDasharray="3 5" />

          {/* Degree ticks */}
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={`rgba(${rgb},${t.opacity})`} strokeWidth="1" />
          ))}

          {/* Static blips (pulsing) */}
          {staticBlips.map((bp, i) => (
            <g key={i}>
              <circle cx={bp.cx} cy={bp.cy} r="2.2" fill={`rgba(${rgb},0.7)`}>
                <animate attributeName="opacity" values="0.7;0.1;0.7"
                  dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={bp.cx} cy={bp.cy} r="5" fill="none"
                stroke={`rgba(${rgb},0.25)`} strokeWidth="1">
                <animate attributeName="opacity" values="0.25;0.05;0.25"
                  dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {/* Rotating sweep group */}
          <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'radarSweep 2.8s linear infinite' }}>
            {/* Fading tail sector */}
            <path d={sweepPath} fill={`rgba(${rgb},0.12)`} />
            {/* Bright sweep line */}
            <line x1={CX} y1={CY} x2={CX + RADIUS} y2={CY}
              stroke={`rgba(${rgb},0.9)`} strokeWidth="1.5" />
          </g>

          {/* Center dot */}
          <circle cx={CX} cy={CY} r="2.5" fill={`rgba(${rgb},0.9)`} />
          <circle cx={CX} cy={CY} r="5" fill="none"
            stroke={`rgba(${rgb},0.3)`} strokeWidth="1" />
        </svg>

        {/* Bottom coord */}
        <div style={{
          position: 'absolute', bottom: -10, right: 0,
          fontFamily: "'Share Tech Mono',monospace", fontSize: '8px',
          color: `rgba(${rgb},0.4)`, backgroundColor: 'rgba(2,3,10,0.93)', padding: '0 6px',
        }}>
          {`47.6062°N  122.3321°W`}
        </div>
      </div>

      {/* Status text */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p key={msgIdx} style={{
          fontFamily: "'Share Tech Mono',monospace", fontSize: '11px',
          color: accent, letterSpacing: '0.22em', margin: 0,
          animation: 'radarMsgFade 0.3s ease',
        }}>
          {msgs[msgIdx]}<span style={{ animation: 'radarBlink 1s step-end infinite' }}>_</span>
        </p>
        <p style={{
          fontFamily: "'Share Tech Mono',monospace", fontSize: '9px',
          color: `rgba(${rgb},0.3)`, letterSpacing: '0.15em', marginTop: 8,
        }}>
          SIGNAL PROCESSING — PLEASE STAND BY
        </p>
      </div>
    </div>,
    document.body
  );
}
