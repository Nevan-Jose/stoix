import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';
import CyberGridBg from '../components/matrix/CyberGridBg';
import { ArrowLeft, Loader2, MapPin, Clock, DollarSign, Compass, Target, LocateFixed, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const B = {
  accent:    '#00b8d9',
  accentDim: 'rgba(0,184,217,0.1)',
  accentBrd: 'rgba(0,184,217,0.3)',
  accentGlow:'rgba(0,184,217,0.5)',
  bg:        '#020408',
  panelBg:   'rgba(2,4,12,0.97)',
  text:      '#c8d4e0',
  textDim:   'rgba(200,212,224,0.65)',
};

const CATEGORY_IMAGE = {
  'food & beverage':    '/images/quest-food.png',
  'parks & nature':     '/images/quest-nature.png',
  'culture & art':      '/images/quest-culture.png',
  'learning & discovery': '/images/quest-learning.png',
};

function getCategoryImage(type) {
  const key = (type || '').toLowerCase().trim();
  return CATEGORY_IMAGE[key] || '/images/quest-food.png';
}

/* ── Claude API helper ─── */
async function callClaude(prompt) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Add VITE_ANTHROPIC_API_KEY to your .env file.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: 'Respond with valid JSON only. No markdown, no code blocks, no extra text.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  const raw = data.content[0].text.replace(/^```[a-z]*\n?/i, '').replace(/```$/,'').trim();
  return JSON.parse(raw);
}

/* ── Shared input style ─── */
const inputStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderBottom: '1px solid rgba(0,184,217,0.25)',
  borderRadius: 0,
  color: '#c8d4e0',
  fontFamily: "'Share Tech Mono',monospace",
  fontSize: '13px',
  padding: '9px 11px',
  width: '100%',
  outline: 'none',
};

function CyberInput({ label, icon, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:600, fontSize:'10px',
                    letterSpacing:'0.2em', color:'rgba(0,184,217,0.5)', textTransform:'uppercase',
                    marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
        {icon && <span style={{ opacity:0.7 }}>{icon}</span>}{label}
      </div>
      <input
        {...props}
        onFocus={e => { setFocused(true); if (props.onFocus) props.onFocus(e); }}
        onBlur={e  => { setFocused(false); if (props.onBlur)  props.onBlur(e);  }}
        style={{ ...inputStyle,
                 borderBottomColor: focused ? 'rgba(0,184,217,0.7)' : 'rgba(0,184,217,0.25)',
                 boxShadow: focused ? 'inset 0 -1px 0 rgba(0,184,217,0.4)' : 'none' }}
      />
    </div>
  );
}

/* ── Quest photo card ─── */
function QuestCard({ quest, index }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl = getCategoryImage(quest.type);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quest.mapsQuery || quest.place || quest.title)}`;

  const handleCardClick = () => window.open(mapsUrl, '_blank', 'noopener,noreferrer');

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'rgba(2,6,16,0.97)',
        border: '1px solid rgba(0,184,217,0.15)',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.18s, box-shadow 0.18s',
        display: 'flex', flexDirection: 'column', height: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(0,184,217,0.5)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,184,217,0.14)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(0,184,217,0.15)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* ── Photo ── */}
      <div style={{ position:'relative', width:'100%', aspectRatio:'16/9', overflow:'hidden',
                    background:`hsl(${190 + index * 25},25%,10%)`, flexShrink:0 }}>
        <img
          src={imageUrl}
          alt={quest.title}
          onLoad={() => setImgLoaded(true)}
          style={{
            width:'100%', height:'100%', objectFit:'cover', display:'block',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />
        {/* subtle gradient only at bottom */}
        <div style={{ position:'absolute', inset:0,
                      background:'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 35%, rgba(2,6,16,0.72) 100%)',
                      pointerEvents:'none' }} />
        {/* type badge */}
        <div style={{
          position:'absolute', top:12, left:12,
          background:'rgba(0,184,217,0.92)', backdropFilter:'blur(8px)',
          padding:'4px 11px',
          fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'9px',
          letterSpacing:'0.22em', textTransform:'uppercase', color:'#020408',
        }}>
          {quest.type}
        </div>
        {/* cost badge */}
        {quest.estimatedCost != null && (
          <div style={{
            position:'absolute', top:12, right:12,
            background:'rgba(2,6,16,0.78)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(0,184,217,0.35)',
            padding:'4px 11px',
            fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:B.accent,
          }}>
            {quest.estimatedCost === 0 ? 'FREE' : `$${quest.estimatedCost}`}
          </div>
        )}
        <div style={{ position:'absolute', bottom:10, right:12, fontSize:'24px', lineHeight:1,
                      filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>
          {quest.vibe}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding:'18px 20px 20px', display:'flex', flexDirection:'column', gap:'10px', flex:1 }}>
        <div>
          <h3 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'22px',
                       color:'#e8f2fa', letterSpacing:'0.02em', margin:'0 0 4px', lineHeight:1.15 }}>
            {quest.title}
          </h3>
          <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'12px',
                      color:B.accent, margin:0 }}>
            {quest.place}
          </p>
        </div>

        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap',
                      fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.textDim }}>
          <span>{quest.activityDurationMinutes ?? quest.totalTimeMinutes} min activity</span>
          {quest.travelTimeMinutes != null && <span>{quest.travelTimeMinutes} min travel</span>}
          {quest.distanceMiles != null && <span>{Number(quest.distanceMiles).toFixed(1)} mi away</span>}
        </div>

        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'12px', color:B.textDim,
                    lineHeight:1.6, margin:0 }}>
          {quest.whyThisFits}
        </p>

        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px',
                    color:'rgba(200,212,224,0.45)', lineHeight:1.55, margin:0 }}>
          {quest.description}
        </p>

        {(quest.tags||[]).length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
            {quest.tags.map(tag => (
              <span key={tag} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px',
                                       padding:'3px 8px', background:'rgba(0,184,217,0.06)',
                                       border:'1px solid rgba(0,184,217,0.2)', color:'rgba(0,184,217,0.75)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop:'auto', paddingTop:'10px', borderTop:'1px solid rgba(0,184,217,0.08)',
                      display:'flex', alignItems:'center', gap:'6px',
                      fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:'rgba(0,184,217,0.5)' }}>
          <ExternalLink size={11}/>
          <span>open in google maps</span>
        </div>
      </div>
    </div>
  );
}

/* ── Quest carousel ─── */
function QuestCarousel({ quests }) {
  const [current, setCurrent] = useState(0);
  const dragX = useMotionValue(0);
  const total = quests.length;

  const goTo = (i) => setCurrent(Math.max(0, Math.min(i, total - 1)));

  const onDragEnd = () => {
    const x = dragX.get();
    if (x < -60 && current < total - 1) goTo(current + 1);
    else if (x > 60 && current > 0) goTo(current - 1);
    dragX.set(0);
  };

  const navBtn = (dir) => ({
    position:'absolute', [dir === 'prev' ? 'left' : 'right']: -16, top:'38%',
    transform:'translateY(-50%)', zIndex:10,
    background:'rgba(2,6,16,0.9)', border:'1px solid rgba(0,184,217,0.35)',
    color:B.accent, cursor:'pointer', padding:'10px 8px',
    display:'flex', alignItems:'center', transition:'all 0.15s',
  });

  return (
    <div style={{ position:'relative', paddingBottom:'20px' }}>
      {/* Slide track */}
      <div style={{ overflow:'hidden' }}>
        <motion.div
          drag="x"
          dragConstraints={{ left:0, right:0 }}
          dragMomentum={false}
          style={{ display:'flex', x: dragX }}
          animate={{ translateX: `-${current * 100}%` }}
          onDragEnd={onDragEnd}
          transition={{ type:'spring', damping:22, stiffness:100 }}
        >
          {quests.map((q, i) => (
            <div key={i} style={{ width:'100%', flexShrink:0, padding:'0 2px' }}>
              <QuestCard quest={q} index={i} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Prev */}
      {current > 0 && (
        <button type="button" onClick={() => goTo(current - 1)} style={navBtn('prev')}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,184,217,0.12)';e.currentTarget.style.borderColor=B.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(2,6,16,0.9)';e.currentTarget.style.borderColor='rgba(0,184,217,0.35)';}}>
          <ChevronLeft size={18}/>
        </button>
      )}
      {/* Next */}
      {current < total - 1 && (
        <button type="button" onClick={() => goTo(current + 1)} style={navBtn('next')}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,184,217,0.12)';e.currentTarget.style.borderColor=B.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(2,6,16,0.9)';e.currentTarget.style.borderColor='rgba(0,184,217,0.35)';}}>
          <ChevronRight size={18}/>
        </button>
      )}

      {/* Dot indicators */}
      <div style={{ display:'flex', justifyContent:'center', gap:'10px', marginTop:'16px' }}>
        {quests.map((_, i) => (
          <button key={i} type="button" onClick={() => goTo(i)}
            style={{
              height:'3px', border:'none', cursor:'pointer', padding:0,
              width: i === current ? '28px' : '8px',
              background: i === current ? B.accent : 'rgba(0,184,217,0.22)',
              transition:'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Skill path card ─── */
function SkillPathCard({ skill, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:index*0.09, duration:0.4 }}
      style={{ border:`1px solid rgba(255,255,255,0.06)`, background:'rgba(2,6,16,0.95)',
               padding:'14px 16px', position:'relative', overflow:'hidden' }}
    >
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'2px',
                    background:'rgba(0,184,217,0.3)' }} />
      <div style={{ paddingLeft:'12px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
          <span style={{ fontSize:'20px', flexShrink:0, lineHeight:1.2 }}>{skill.emoji}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.2em',
                        color:'rgba(0,184,217,0.55)', fontWeight:600, textTransform:'uppercase', margin:'0 0 3px' }}>
              {skill.category}
            </p>
            <h3 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'16px',
                         color:'#dde8f0', letterSpacing:'0.04em', margin:'0 0 4px' }}>
              {skill.title}
            </h3>
            <div style={{ display:'flex', gap:'8px', fontFamily:"'Share Tech Mono',monospace",
                          fontSize:'10px', color:B.textDim, marginBottom:'6px' }}>
              <span>{skill.timeRequired}</span><span>·</span><span>{skill.cost}</span>
            </div>
            <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.textDim,
                        lineHeight:1.5, margin:0 }}>
              {skill.whyThisFits}
            </p>

            <button type="button" onClick={() => setExpanded(v=>!v)}
              style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px',
                       color:'rgba(0,184,217,0.4)', background:'none', border:'none',
                       cursor:'pointer', padding:0, marginTop:'8px', transition:'color 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.color=B.accent}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(0,184,217,0.4)'}>
              {expanded ? '[ hide plan ]' : '[ view session plan + milestones ]'}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                  exit={{ opacity:0, height:0 }} transition={{ duration:0.22 }}
                  style={{ overflow:'hidden' }}>
                  <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.2em',
                                color:'rgba(0,184,217,0.55)', fontWeight:600, textTransform:'uppercase',
                                marginBottom:'8px' }}>
                      TODAY&apos;S SESSION
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {(skill.sessionPlan||[]).map(s => (
                        <div key={s.step} style={{ display:'flex', gap:'8px' }}>
                          <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'11px', fontWeight:700,
                                         color:'rgba(0,184,217,0.4)', flexShrink:0, minWidth:'16px' }}>
                            {s.step}.
                          </span>
                          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.text, lineHeight:1.4 }}>
                            {s.action}
                            <span style={{ color:B.textDim }}> — {s.duration}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.2em',
                                color:'rgba(0,184,217,0.55)', fontWeight:600, textTransform:'uppercase',
                                marginBottom:'8px' }}>
                      LEVEL-UP PATH
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {(skill.levelUpPath||[]).map(m => (
                        <div key={m.milestone} style={{ display:'flex', gap:'8px' }}>
                          <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'11px', fontWeight:700,
                                         color:'rgba(0,184,217,0.4)', flexShrink:0, minWidth:'22px' }}>
                            M{m.milestone}
                          </span>
                          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.text, lineHeight:1.4 }}>
                            {m.goal}
                            <span style={{ color:B.textDim }}> — {m.timeframe}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Skill roadmap (after quest search) ─── */
function SkillRoadmapCard({ skill }) {
  if (!skill?.skill) return null;
  return (
    <div style={{ border:'1px solid rgba(0,184,217,0.2)', background:B.accentDim,
                  padding:'14px 16px', marginTop:'16px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'2px', background:B.accent }} />
      <div style={{ paddingLeft:'12px' }}>
        <p style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.2em',
                    color:'rgba(0,184,217,0.6)', fontWeight:600, textTransform:'uppercase', marginBottom:'4px' }}>
          SKILL SUGGESTION
        </p>
        <h3 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'15px',
                     color:'#dde8f0', margin:'0 0 4px' }}>
          {skill.skill}
        </h3>
        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.textDim,
                    lineHeight:1.5, marginBottom:'10px' }}>
          {skill.tagline}
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
          {(skill.steps||[]).map(s => (
            <div key={s.step} style={{ display:'flex', gap:'8px' }}>
              <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'11px', fontWeight:700,
                             color:'rgba(0,184,217,0.4)', flexShrink:0, minWidth:'16px' }}>
                {s.step}.
              </span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.text, lineHeight:1.4 }}>
                {s.action}
                <span style={{ color:B.textDim }}> — {s.time}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Side quests form ─── */
function SideQuestsForm({ onSubmit, isLoading }) {
  const [location, setLocation] = useState('');
  const [time, setTime]         = useState('60');
  const [budget, setBudget]     = useState('20');
  const [maxDist, setMaxDist]   = useState('2');
  const [interest, setInterest] = useState('');
  const [mode, setMode]         = useState('solo');
  const [locating, setLocating] = useState(false);

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.village || '';
          const city = addr.city || addr.town || addr.county || '';
          const parts = [neighbourhood, city].filter(Boolean);
          setLocation(parts.length ? parts.join(', ') : (data.display_name || '').split(',').slice(0,2).join(',').trim());
        } catch { /* silent */ } finally { setLocating(false); }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim()) return;
    onSubmit({ location:location.trim(), availableTimeMinutes:parseInt(time,10)||60,
               budget:parseInt(budget,10)||0, maxDistanceMiles:parseFloat(maxDist)||2,
               interest:interest.trim(), mode });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
      <div>
        <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:600, fontSize:'10px',
                      letterSpacing:'0.2em', color:'rgba(0,184,217,0.5)', textTransform:'uppercase',
                      marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
          <span style={{ opacity:0.7 }}><MapPin size={10}/></span>Location
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'stretch' }}>
          <input value={location} onChange={e=>setLocation(e.target.value)}
            placeholder="e.g. Manhattan, NYC" disabled={isLoading || locating}
            style={{ ...inputStyle, flex:1,
                     borderBottomColor: 'rgba(0,184,217,0.25)' }} />
          <button type="button" onClick={handleUseLocation}
            disabled={isLoading || locating}
            title="Use my current location"
            style={{ background:'rgba(0,184,217,0.07)', border:'1px solid rgba(0,184,217,0.2)',
                     borderBottom:'1px solid rgba(0,184,217,0.4)', borderRadius:0,
                     color: locating ? 'rgba(0,184,217,0.4)' : B.accent, cursor:'pointer',
                     padding:'0 11px', display:'flex', alignItems:'center', transition:'all 0.2s',
                     minWidth:'38px', justifyContent:'center' }}
            onMouseEnter={e=>{ if (!locating) e.currentTarget.style.background='rgba(0,184,217,0.13)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,184,217,0.07)'; }}>
            {locating
              ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>
              : <LocateFixed size={13}/>}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
        <CyberInput label="Time (min)" icon={<Clock size={10}/>} type="number" min="15" max="240"
          value={time} onChange={e=>setTime(e.target.value)} placeholder="60" disabled={isLoading} />
        <CyberInput label="Budget ($)" icon={<DollarSign size={10}/>} type="number" min="0" max="500"
          value={budget} onChange={e=>setBudget(e.target.value)} placeholder="20" disabled={isLoading} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
        <CyberInput label="Max Dist (mi)" icon={<Compass size={10}/>} type="number" min="0.1" max="20" step="0.1"
          value={maxDist} onChange={e=>setMaxDist(e.target.value)} placeholder="2" disabled={isLoading} />
        <div>
          <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:600, fontSize:'10px',
                        letterSpacing:'0.2em', color:'rgba(0,184,217,0.5)', textTransform:'uppercase',
                        marginBottom:'6px' }}>MODE</div>
          <div style={{ display:'flex', gap:'1px', height:'38px' }}>
            {['solo','social'].map(m => (
              <button key={m} type="button" onClick={()=>setMode(m)} disabled={isLoading}
                style={{ flex:1, fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'11px',
                         letterSpacing:'0.12em', textTransform:'uppercase', border:'none', cursor:'pointer',
                         background: mode===m ? 'rgba(0,184,217,0.15)' : 'rgba(255,255,255,0.03)',
                         color: mode===m ? B.accent : 'rgba(200,212,224,0.3)',
                         borderBottom: mode===m ? `1px solid ${B.accent}` : '1px solid rgba(255,255,255,0.07)',
                         transition:'all 0.15s' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CyberInput label="Interest / Vibe (optional)" icon={<Target size={10}/>} value={interest}
        onChange={e=>setInterest(e.target.value)} placeholder="e.g. coffee, art, music, fitness..."
        disabled={isLoading} />

      <button type="submit" disabled={!location.trim()||isLoading}
        className="cyber-btn cyber-btn-blue" style={{ width:'100%', marginTop:'4px' }}>
        {isLoading
          ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> SCANNING CITY...</>
          : '[ FIND QUESTS ]'}
      </button>
    </form>
  );
}

/* ── Skill form ─── */
function SkillForm({ onSubmit, isLoading }) {
  const [interest, setInterest] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!interest.trim()) return;
    onSubmit({ interest: interest.trim() });
  };
  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
      <div>
        <CyberInput label="What do you want to learn?" icon={<Target size={10}/>} value={interest}
          onChange={e=>setInterest(e.target.value)} placeholder="e.g. music, fitness, coding, cooking..."
          disabled={isLoading} />
        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:B.textDim,
                    lineHeight:1.5, marginTop:'6px' }}>
          Get 3 skills you can start today — each with a session plan and a level-up path.
        </p>
      </div>
      <button type="submit" disabled={!interest.trim()||isLoading}
        className="cyber-btn cyber-btn-blue" style={{ width:'100%' }}>
        {isLoading
          ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> BUILDING PATH...</>
          : '[ GENERATE SKILL PATH ]'}
      </button>
    </form>
  );
}

/* ── Main page ─── */
export default function BluePill() {
  const { toast } = useToast();
  const [activeTab, setActiveTab]   = useState('quests');
  const [isLoading, setIsLoading]   = useState(false);
  const [quests, setQuests]         = useState(null);
  const [questSkill, setQuestSkill] = useState(null);
  const [skills, setSkills]         = useState(null);

  const handleQuestSubmit = async (params) => {
    setIsLoading(true);
    try {
      const interestLine = params.interest ? `, interested in: ${params.interest}` : '';
      const data = await callClaude(
        `Find exactly 4 real side quest activities for someone in ${params.location} with ${params.availableTimeMinutes} total minutes, $${params.budget} budget, within ${params.maxDistanceMiles} miles, mode: ${params.mode}${interestLine}.

CRITICAL: Return EXACTLY 4 quests, one per category in this exact order:
1. type must be "Food & Beverage"
2. type must be "Parks & Nature"
3. type must be "Culture & Art"
4. type must be "Learning & Discovery"
Each quest must be a DIFFERENT category. No repeats.

CRITICAL TIME RULE: travelTimeMinutes + activityDurationMinutes MUST be <= ${params.availableTimeMinutes}. Only include activities that fully fit including travel. totalTimeMinutes = travelTimeMinutes + activityDurationMinutes.

For mapsQuery: full venue name and city for Google Maps.

Return JSON exactly:
{"quests":[{"vibe":"emoji","type":"Food & Beverage","estimatedCost":0,"totalTimeMinutes":0,"title":"...","place":"venue name, neighborhood","whyThisFits":"one sentence","description":"2-3 sentences","tags":["tag"],"distanceMiles":0.5,"travelTimeMinutes":10,"activityDurationMinutes":45,"mapsQuery":"venue name city"},{"type":"Parks & Nature",...},{"type":"Culture & Art",...},{"type":"Learning & Discovery",...}],"skill":{"skill":"skill name","tagline":"one liner","steps":[{"step":1,"action":"...","time":"X min"}]}}`
      );
      setQuests(data.quests || []);
      setQuestSkill(data.skill || null);
    } catch(e) {
      toast({ variant:'destructive', title:'Quest engine error', description: e?.message || 'Failed to generate quests.' });
    } finally { setIsLoading(false); }
  };

  const handleSkillSubmit = async ({ interest }) => {
    setIsLoading(true);
    try {
      const data = await callClaude(
        `Generate 3 skills someone can start learning today about: ${interest}. Return JSON exactly:
{"skills":[{"emoji":"emoji","category":"CATEGORY","title":"skill name","timeRequired":"X hrs/week","cost":"Free","whyThisFits":"one sentence","sessionPlan":[{"step":1,"action":"...","duration":"15 min"}],"levelUpPath":[{"milestone":1,"goal":"...","timeframe":"1 week"}]}]}`
      );
      setSkills(data.skills || []);
    } catch(e) {
      toast({ variant:'destructive', title:'Skill path error', description: e?.message || 'Failed to generate skill path.' });
    } finally { setIsLoading(false); }
  };

  const showForms = !quests && !skills;

  const cardRef    = useRef(null);
  const [orbitRect, setOrbitRect] = useState(null);
  const handleCardEnter = useCallback(() => {
    if (cardRef.current) setOrbitRect(cardRef.current.getBoundingClientRect());
  }, []);
  const handleCardLeave = useCallback(() => setOrbitRect(null), []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="cyber-bg-blue" style={{ minHeight:'100vh', paddingBottom:'48px', position:'relative', isolation:'isolate' }}>
      <CyberGridBg accent="#00b8d9" downOnly orbitRect={orbitRect} />
      {/* Top bar */}
      <div style={{ borderBottom:`1px solid ${B.accentBrd}`, padding:'5px 24px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    background:B.panelBg }}>
        <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'10px', letterSpacing:'0.22em',
                       color:'rgba(0,184,217,0.45)', fontWeight:600 }}>
          STOIX EXPLORATION ENGINE · BLUE PILL MODULE
        </span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:B.textDim, letterSpacing:'0.06em' }}>
          {new Date().toLocaleString('sv').replace('T','  ')}
        </span>
      </div>

      {/* Header */}
      <motion.header initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
        style={{ padding:'18px 28px', borderBottom:`1px solid ${B.accentBrd}`,
                 display:'flex', alignItems:'center', gap:'16px', background:'rgba(2,4,12,0.75)' }}>
        <Link to="/" state={{ skipIntro: true }} style={{ color:'rgba(0,184,217,0.4)', display:'flex', transition:'color 0.2s', textDecoration:'none' }}
              onMouseEnter={e=>e.currentTarget.style.color=B.accent}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(0,184,217,0.4)'}>
          <ArrowLeft size={15}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:"'Rajdhani',monospace", fontSize:'21px', fontWeight:700,
                       color:B.accent, letterSpacing:'0.12em', textShadow:`0 0 22px ${B.accentGlow}`, margin:0 }}>
            STOIX <span style={{ color:'rgba(0,184,217,0.3)', fontWeight:400 }}>//</span> BLUE PILL
          </h1>
          <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:B.textDim,
                      letterSpacing:'0.07em', marginTop:'3px' }}>
            Side quests &amp; skill learning — curated for your time and place
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:B.accent,
                        boxShadow:`0 0 8px ${B.accent}` }} />
          <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'10px', letterSpacing:'0.18em',
                         color:'rgba(0,184,217,0.55)', fontWeight:600 }}>ACTIVE</span>
        </div>
      </motion.header>

      {/* Content */}
      <main style={{ padding:'28px 16px 32px', display:'flex', justifyContent:'center' }}>
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.5, delay:0.1 }} style={{ width:'100%', maxWidth:'820px' }}>

          {/* Tabs */}
          {showForms && (
            <div style={{ display:'flex', gap:'1px', marginBottom:'20px', borderBottom:`1px solid ${B.accentBrd}` }}>
              {[{ key:'quests', label:'SIDE QUESTS' }, { key:'skills', label:'SKILL PATH' }].map(({key,label}) => (
                <button key={key} type="button" onClick={()=>setActiveTab(key)}
                  style={{ padding:'8px 20px', fontFamily:"'Rajdhani',monospace", fontWeight:700,
                           fontSize:'11px', letterSpacing:'0.2em', textTransform:'uppercase',
                           background:'none', border:'none', cursor:'pointer', position:'relative',
                           color: activeTab===key ? B.accent : 'rgba(200,212,224,0.3)',
                           borderBottom: activeTab===key ? `2px solid ${B.accent}` : '2px solid transparent',
                           marginBottom:'-1px', transition:'color 0.2s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Quest form */}
          {activeTab==='quests' && !quests && (
            <div ref={cardRef} className="cyber-card-blue"
                 onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}>
              <div style={{ background:'rgba(2,4,12,0.98)' }}>
                {/* Header strip */}
                <div style={{ padding:'10px 24px', borderBottom:'1px solid rgba(0,184,217,0.1)',
                              background:'rgba(0,184,217,0.04)', display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:4, height:4, background:B.accent, boxShadow:`0 0 6px ${B.accent}` }}/>
                  <span style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                 letterSpacing:'0.25em', color:'rgba(0,184,217,0.65)', textTransform:'uppercase' }}>
                    SIDE QUEST FINDER
                  </span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 260px' }}>
                  {/* Left: heading + form */}
                  <div style={{ padding:'24px 28px', borderRight:'1px solid rgba(0,184,217,0.08)' }}>
                    <h2 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'26px',
                                 color:'#dde8f0', letterSpacing:'0.05em', margin:'0 0 4px' }}>
                      WHERE ARE YOU?
                    </h2>
                    <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.textDim,
                                lineHeight:1.5, marginBottom:'22px' }}>
                      Tell us your time, budget, and vibe. We&apos;ll find 4 real things to do near you.
                    </p>
                    <SideQuestsForm onSubmit={handleQuestSubmit} isLoading={isLoading} />
                  </div>

                  {/* Right: mission brief */}
                  <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:'18px' }}>
                    <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                  letterSpacing:'0.22em', color:'rgba(0,184,217,0.4)', textTransform:'uppercase' }}>
                      MISSION BRIEF
                    </div>
                    {[
                      { label:'SCAN RADIUS', val:'Local area' },
                      { label:'QUEST TYPE', val:'Side objectives' },
                      { label:'RESULTS', val:'4 quests' },
                      { label:'MODE', val:'Real-time' },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ borderBottom:'1px solid rgba(0,184,217,0.07)', paddingBottom:'14px' }}>
                        <div style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.18em',
                                      color:'rgba(0,184,217,0.4)', fontWeight:600, textTransform:'uppercase',
                                      marginBottom:'3px' }}>{label}</div>
                        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'12px',
                                      color:'rgba(200,220,240,0.55)' }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ flex:1 }}/>
                    <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px',
                                  color:'rgba(0,184,217,0.2)', lineHeight:1.6 }}>
                      STOIX EXPLORATION ENGINE<br/>BLUE PILL MODULE v1.0
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quest results */}
          {activeTab==='quests' && quests && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'10px', letterSpacing:'0.2em',
                               color:'rgba(0,184,217,0.55)', fontWeight:600 }}>
                  [ {quests.length} QUESTS FOUND ]
                </span>
                <button type="button" onClick={()=>{ setQuests(null); setQuestSkill(null); }}
                  style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:B.textDim,
                           background:'none', border:'none', cursor:'pointer', transition:'color 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.color=B.accent}
                  onMouseLeave={e=>e.currentTarget.style.color=B.textDim}>
                  [ new search ]
                </button>
              </div>
              <QuestCarousel quests={quests} />
              <SkillRoadmapCard skill={questSkill}/>
            </div>
          )}

          {/* Skill form */}
          {activeTab==='skills' && !skills && (
            <div ref={cardRef} className="cyber-card-blue"
                 onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}>
              <div style={{ background:'rgba(2,4,12,0.98)' }}>
                {/* Header strip */}
                <div style={{ padding:'10px 24px', borderBottom:'1px solid rgba(0,184,217,0.1)',
                              background:'rgba(0,184,217,0.04)', display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:4, height:4, background:B.accent, boxShadow:`0 0 6px ${B.accent}` }}/>
                  <span style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                 letterSpacing:'0.25em', color:'rgba(0,184,217,0.65)', textTransform:'uppercase' }}>
                    SKILL PATH GENERATOR
                  </span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 260px' }}>
                  {/* Left: heading + form */}
                  <div style={{ padding:'24px 28px', borderRight:'1px solid rgba(0,184,217,0.08)' }}>
                    <h2 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'26px',
                                 color:'#dde8f0', letterSpacing:'0.05em', margin:'0 0 4px' }}>
                      WHAT DO YOU WANT TO LEARN?
                    </h2>
                    <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:B.textDim,
                                lineHeight:1.5, marginBottom:'22px' }}>
                      Pick any interest. Get 3 skills you can start today with a session plan and level-up path.
                    </p>
                    <SkillForm onSubmit={handleSkillSubmit} isLoading={isLoading} />
                  </div>

                  {/* Right: system info */}
                  <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:'18px' }}>
                    <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                  letterSpacing:'0.22em', color:'rgba(0,184,217,0.4)', textTransform:'uppercase' }}>
                      PATH PARAMETERS
                    </div>
                    {[
                      { label:'SKILLS RETURNED', val:'3 options' },
                      { label:'SESSION PLAN', val:'Included' },
                      { label:'LEVEL-UP PATH', val:'Mapped' },
                      { label:'DIFFICULTY', val:'Adaptive' },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ borderBottom:'1px solid rgba(0,184,217,0.07)', paddingBottom:'14px' }}>
                        <div style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.18em',
                                      color:'rgba(0,184,217,0.4)', fontWeight:600, textTransform:'uppercase',
                                      marginBottom:'3px' }}>{label}</div>
                        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'12px',
                                      color:'rgba(200,220,240,0.55)' }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ flex:1 }}/>
                    <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px',
                                  color:'rgba(0,184,217,0.2)', lineHeight:1.6 }}>
                      STOIX EXPLORATION ENGINE<br/>SKILL MODULE v1.0
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Skill results */}
          {activeTab==='skills' && skills && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'10px', letterSpacing:'0.2em',
                               color:'rgba(0,184,217,0.55)', fontWeight:600 }}>
                  [ {skills.length} SKILLS UNLOCKED ]
                </span>
                <button type="button" onClick={()=>setSkills(null)}
                  style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:B.textDim,
                           background:'none', border:'none', cursor:'pointer', transition:'color 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.color=B.accent}
                  onMouseLeave={e=>e.currentTarget.style.color=B.textDim}>
                  [ new search ]
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                {skills.map((s,i) => <SkillPathCard key={i} skill={s} index={i}/>)}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </motion.div>
  );
}
