import { useState, useRef, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Paperclip, X, Calendar } from 'lucide-react';

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const R = {
  accent:    '#e03535',
  accentDim: 'rgba(224,53,53,0.1)',
  accentBrd: 'rgba(224,53,53,0.25)',
  text:      '#c8d4e0',
  textDim:   'rgba(200,212,224,0.65)',
  panelBg:   'rgba(6,3,5,0.98)',
  inputBg:   'rgba(255,255,255,0.02)',
};

function FieldLabel({ children }) {
  return (
    <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:600, fontSize:'10px',
                  letterSpacing:'0.2em', color:'rgba(224,53,53,0.55)', textTransform:'uppercase',
                  marginBottom:'6px' }}>
      {children}
    </div>
  );
}

function CyberTextarea({ value, onChange, onPaste, placeholder, disabled, rightSlot, minHeight = '130px' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:'relative' }}>
      <textarea
        value={value} onChange={onChange} onPaste={onPaste} disabled={disabled}
        placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ background:R.inputBg,
                 border:'1px solid rgba(255,255,255,0.06)',
                 borderBottom:`1px solid ${focused ? 'rgba(224,53,53,0.7)' : 'rgba(224,53,53,0.25)'}`,
                 borderRadius:0, color:R.text,
                 fontFamily:"'Share Tech Mono',monospace", fontSize:'13px',
                 padding:'10px 40px 10px 12px', width:'100%',
                 minHeight, resize:'none', outline:'none',
                 transition:'border-color 0.2s' }}
      />
      {rightSlot && (
        <div style={{ position:'absolute', top:'8px', right:'8px' }}>{rightSlot}</div>
      )}
    </div>
  );
}

function CyberInput({ value, onChange, type='text', min, max, step, placeholder, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} min={min} max={max} step={step}
      placeholder={placeholder} disabled={disabled}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      style={{ background:R.inputBg,
               border:'1px solid rgba(255,255,255,0.06)',
               borderBottom:`1px solid ${focused ? 'rgba(224,53,53,0.65)' : 'rgba(224,53,53,0.2)'}`,
               borderRadius:0, color:R.text,
               fontFamily:"'Share Tech Mono',monospace", fontSize:'13px',
               padding:'9px 12px', width:'100%', outline:'none',
               transition:'border-color 0.2s' }}
    />
  );
}

const GoalForm = forwardRef(function GoalForm({ onSubmit, isLoading, loadingMsg, onMouseEnter, onMouseLeave }, ref) {
  const [goal, setGoal]                   = useState('');
  const [days, setDays]                   = useState('');
  const [dailyMinutes, setDailyMinutes]   = useState('30');
  const [calImages, setCalImages]         = useState([]);
  const [calIcs, setCalIcs]               = useState(null);
  const [calTab, setCalTab]               = useState('images');
  const [isDragging, setIsDragging]       = useState(false);

  const imageInputRef = useRef(null);
  const icsInputRef   = useRef(null);

  const ingestFile = useCallback(async (file) => {
    if (!file) return;
    const isImage = file.type?.startsWith('image/');
    const isICS   = /\.ics$/i.test(file.name) || file.type === 'text/calendar';
    if (isImage) {
      if (calImages.length >= 5) return;
      const dataURL = await fileToDataURL(file);
      setCalImages(prev => [...prev, { name:file.name||'image.png', mime:file.type||'image/png', dataURL }]);
      setCalTab('images');
    } else if (isICS) {
      const text = await file.text();
      setCalIcs({ name:file.name||'calendar.ics', text, size:file.size||text.length });
      setCalTab('ics');
    }
  }, [calImages.length]);

  const handleImageInput = async (e) => {
    for (const f of Array.from(e.target.files||[])) await ingestFile(f);
    e.target.value = '';
  };
  const handleICSInput = async (e) => {
    const f = (e.target.files||[])[0];
    if (f) await ingestFile(f);
    e.target.value = '';
  };
  const handlePaste = async (e) => {
    let used = false;
    for (const item of Array.from((e.clipboardData?.items)||[])) {
      if (item.kind==='file') { const f=item.getAsFile(); if (f) { used=true; await ingestFile(f); } }
    }
    if (used) e.preventDefault();
  };
  const handleDrop = async (e) => {
    e.preventDefault(); setIsDragging(false);
    for (const f of Array.from((e.dataTransfer?.files)||[])) await ingestFile(f);
  };

  const buildCalendarPayload = () => {
    if (calTab==='images' && calImages.length>0)
      return { type:'images', images:calImages.map(i=>({ name:i.name, mime:i.mime, base64:i.dataURL.split(',')[1]||'' })) };
    if (calTab==='ics' && calIcs)
      return { type:'ics', name:calIcs.name, text:calIcs.text };
    return { type:'none' };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!goal.trim()||!days) return;
    const dm = parseInt(dailyMinutes,10);
    onSubmit({ goal:goal.trim(), days:parseInt(days,10), dailyMinutes:Number.isFinite(dm)?dm:30, calendar:buildCalendarPayload() });
  };

  const hasAttachments = calImages.length>0 || calIcs!==null;
  const canSubmit = goal.trim() && days && parseInt(days,10)>=7 &&
                    parseInt(dailyMinutes,10)>=5 && parseInt(dailyMinutes,10)<=60 && !isLoading;

  const tabStyle = (active) => ({
    padding:'5px 12px',
    fontFamily:"'Rajdhani',monospace", fontWeight:600, fontSize:'10px', letterSpacing:'0.16em',
    textTransform:'uppercase', background:'none', border:'none', cursor:'pointer',
    color: active ? R.accent : 'rgba(200,212,224,0.55)',
    borderBottom: active ? `1px solid ${R.accent}` : '1px solid transparent',
    marginBottom:'-1px', transition:'color 0.15s',
  });

  return (
    <motion.div ref={ref} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.6, delay:0.15 }}
      style={{ width:'100%', maxWidth:'900px', margin:'0 auto' }}>

      {/* Outer border layer (clip-path + accent bg = 1px border effect) */}
      <div className="cyber-card-red">
        {/* Inner panel */}
        <div style={{ background:R.panelBg }}>

          {/* Header strip */}
          <div style={{ padding:'10px 24px', borderBottom:'1px solid rgba(224,53,53,0.1)',
                        background:'rgba(224,53,53,0.04)', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:4, height:4, background:R.accent, boxShadow:`0 0 6px ${R.accent}` }}/>
            <span style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                           letterSpacing:'0.25em', color:'rgba(224,53,53,0.7)', textTransform:'uppercase' }}>
              PROTOCOL INITIALIZATION
            </span>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:3, height:3, borderRadius:'50%', background:R.accent, opacity:0.6 }}/>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px',
                             color:'rgba(224,53,53,0.3)', letterSpacing:'0.1em' }}>SYS READY</span>
            </div>
          </div>

          {/* 2-column body */}
          <form onSubmit={handleSubmit}
            onDragEnter={()=>setIsDragging(true)}
            onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
            onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setIsDragging(false);}}
            onDrop={handleDrop}>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 280px' }}>

              {/* ── Left column: mission + calendar ── */}
              <div style={{ padding:'28px 28px 24px',
                            borderRight:'1px solid rgba(224,53,53,0.08)',
                            display:'flex', flexDirection:'column', gap:'22px' }}>

                <div>
                  <h2 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'26px',
                               color:R.text, letterSpacing:'0.06em', margin:'0 0 4px', textTransform:'uppercase' }}>
                    WHAT IS YOUR MISSION?
                  </h2>
                  <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:R.textDim,
                              lineHeight:1.5, margin:0 }}>
                    State your objective. STOIX builds a sequenced daily protocol toward it.
                  </p>
                </div>

                <div>
                  <FieldLabel>TARGET OBJECTIVE</FieldLabel>
                  <CyberTextarea
                    value={goal} onChange={e=>setGoal(e.target.value)} onPaste={handlePaste}
                    placeholder="e.g. Learn to play guitar fluently, get fit for a marathon, master Python..."
                    disabled={isLoading} minHeight="150px"
                    rightSlot={
                      <button type="button" onClick={()=>imageInputRef.current?.click()} disabled={isLoading}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'4px',
                                 color:'rgba(224,53,53,0.35)', transition:'color 0.2s' }}
                        onMouseEnter={e=>e.currentTarget.style.color=R.accent}
                        onMouseLeave={e=>e.currentTarget.style.color='rgba(224,53,53,0.35)'}>
                        <Paperclip size={13}/>
                      </button>
                    }
                  />
                  <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px', color:R.textDim,
                              lineHeight:1.5, marginTop:'4px' }}>
                    Paste or drop a calendar screenshot to schedule around real availability.
                  </p>
                </div>

                {/* Calendar */}
                <div>
                  <FieldLabel><Calendar size={9} style={{ display:'inline', marginRight:4 }}/>CALENDAR (OPTIONAL)</FieldLabel>
                  <div style={{ display:'flex', gap:'1px', borderBottom:`1px solid rgba(224,53,53,0.12)`,
                                marginBottom:'10px' }}>
                    {[{key:'images',label:'IMAGES'},{key:'ics',label:'.ICS'},{key:'none',label:'SKIP'}]
                      .map(({key,label})=>(
                        <button key={key} type="button" onClick={()=>setCalTab(key)} disabled={isLoading}
                          style={tabStyle(calTab===key)}>
                          {label}
                        </button>
                    ))}
                  </div>

                  {calTab==='images' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      <button type="button" onClick={()=>imageInputRef.current?.click()}
                        disabled={isLoading||calImages.length>=5}
                        style={{ border:`1px dashed ${isDragging?R.accent:'rgba(224,53,53,0.18)'}`,
                                 background:'none', padding:'12px', textAlign:'center', cursor:'pointer',
                                 fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim,
                                 transition:'border-color 0.2s', width:'100%' }}>
                        <Paperclip size={12} style={{ display:'inline', marginBottom:3, opacity:0.5 }}/><br/>
                        Click or paste (Cmd+V) · PNG/JPG · max 5
                      </button>
                      {calImages.length>0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {calImages.map((img,idx)=>(
                            <div key={idx} style={{ position:'relative', width:52, height:52,
                                                    border:'1px solid rgba(224,53,53,0.2)', overflow:'hidden' }}>
                              <img src={img.dataURL} alt={img.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                              <button type="button" onClick={()=>setCalImages(p=>p.filter((_,i)=>i!==idx))}
                                style={{ position:'absolute', top:2, right:2, width:15, height:15,
                                         background:'rgba(0,0,0,0.85)', border:'none', cursor:'pointer',
                                         color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <X size={9}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {calTab==='ics' && !calIcs && (
                    <button type="button" onClick={()=>icsInputRef.current?.click()} disabled={isLoading}
                      style={{ border:`1px dashed rgba(224,53,53,0.18)`, background:'none', padding:'12px',
                               textAlign:'center', cursor:'pointer', width:'100%',
                               fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim }}>
                      <Calendar size={12} style={{ display:'inline', marginBottom:3, opacity:0.5 }}/><br/>
                      Upload .ics · Apple / Google / Outlook Calendar
                    </button>
                  )}
                  {calTab==='ics' && calIcs && (
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px',
                                  border:`1px solid rgba(224,53,53,0.2)`, background:'rgba(224,53,53,0.04)' }}>
                      <Calendar size={12} style={{ color:R.accent, flexShrink:0 }}/>
                      <span style={{ flex:1, fontFamily:"'Share Tech Mono',monospace", fontSize:'11px',
                                     color:R.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {calIcs.name}
                      </span>
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim }}>
                        {Math.max(1,Math.round(calIcs.size/1024))} KB
                      </span>
                      <button type="button" onClick={()=>setCalIcs(null)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:R.textDim,
                                 transition:'color 0.2s' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#e03535'}
                        onMouseLeave={e=>e.currentTarget.style.color=R.textDim}>
                        <X size={11}/>
                      </button>
                    </div>
                  )}
                  {calTab==='none' && (
                    <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim,
                                border:`1px solid rgba(255,255,255,0.04)`, padding:'9px 12px', lineHeight:1.5 }}>
                      No calendar — all tasks scheduled at 09:00 by default.
                    </p>
                  )}
                </div>

                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageInput}/>
                <input ref={icsInputRef}   type="file" accept=".ics,text/calendar" hidden onChange={handleICSInput}/>
              </div>

              {/* ── Right column: settings + submit ── */}
              <div style={{ padding:'28px 24px 24px', display:'flex', flexDirection:'column', gap:'24px' }}>

                <div>
                  <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                letterSpacing:'0.22em', color:'rgba(224,53,53,0.7)', textTransform:'uppercase',
                                marginBottom:'18px' }}>
                    TIMELINE CONFIG
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                    <div>
                      <FieldLabel>TIME LIMIT (DAYS)</FieldLabel>
                      <CyberInput type="number" min="7" value={days}
                        onChange={e=>setDays(e.target.value)} placeholder="e.g. 90" disabled={isLoading}/>
                      <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px', color:R.textDim,
                                  marginTop:'4px' }}>7+ days (any length)</p>
                    </div>
                    <div>
                      <FieldLabel>DAILY BUDGET (MIN)</FieldLabel>
                      <CyberInput type="number" min="5" max="60" value={dailyMinutes}
                        onChange={e=>setDailyMinutes(e.target.value)} placeholder="e.g. 30" disabled={isLoading}/>
                      <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px', color:R.textDim,
                                  marginTop:'4px' }}>5–60 minutes/day</p>
                    </div>
                  </div>
                </div>

                {/* System stats */}
                <div style={{ borderTop:'1px solid rgba(224,53,53,0.08)', paddingTop:'18px' }}>
                  <div style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                letterSpacing:'0.22em', color:'rgba(224,53,53,0.4)', textTransform:'uppercase',
                                marginBottom:'14px' }}>
                    PROTOCOL STATS
                  </div>
                  {[
                    { label:'ENGINE', val:'Red Pill v2' },
                    { label:'METHOD', val:'Evidence-based' },
                    { label:'OUTPUT', val:'Daily micro-tasks' },
                    { label:'RESEARCH', val:'AI + structured' },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
                                             marginBottom:'10px' }}>
                      <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'9px', letterSpacing:'0.15em',
                                     color:'rgba(224,53,53,0.65)', fontWeight:600, textTransform:'uppercase' }}>{label}</span>
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px',
                                     color:'rgba(200,212,224,0.75)' }}>{val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ flex:1 }}/>

                <button type="submit" disabled={!canSubmit} className="cyber-btn cyber-btn-red"
                  style={{ width:'100%', height:'46px' }}>
                  {isLoading
                    ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> {loadingMsg || 'CONSTRUCTING...'}</>
                    : `[ INITIATE${hasAttachments?' WITH CALENDAR':''} ]`}
                </button>

                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'8px',
                              color:'rgba(224,53,53,0.4)', lineHeight:1.7, textAlign:'center' }}>
                  STOIX PROTOCOL ENGINE<br/>RED PILL MODULE v2.0
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
});

export default GoalForm;
