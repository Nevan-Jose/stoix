import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Clock, Target, Calendar } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';

const PHASE_STYLE = {
  Foundation: { bg:'rgba(0,200,255,0.07)',  color:'#00c8ff', border:'rgba(0,200,255,0.3)'  },
  Build:      { bg:'rgba(0,220,120,0.07)',  color:'#00dc78', border:'rgba(0,220,120,0.3)'  },
  Push:       { bg:'rgba(255,180,0,0.07)',  color:'#ffb400', border:'rgba(255,180,0,0.3)'  },
  Mastery:    { bg:'rgba(224,53,53,0.07)',  color:'#e03535', border:'rgba(224,53,53,0.3)'  },
};

function getPhaseStyle(phase) {
  if (!phase) return PHASE_STYLE.Build;
  if (PHASE_STYLE[phase]) return PHASE_STYLE[phase];
  const lower = phase.toLowerCase();
  const key = Object.keys(PHASE_STYLE).find(k => k.toLowerCase() === lower ||
    k.toLowerCase().startsWith(lower.slice(0,4)));
  return PHASE_STYLE[key] || PHASE_STYLE.Build;
}

const R = {
  accent:    '#e03535',
  accentDim: 'rgba(224,53,53,0.1)',
  accentBrd: 'rgba(224,53,53,0.2)',
  text:      '#c8d4e0',
  textDim:   'rgba(200,212,224,0.65)',
  panelBg:   'rgba(5,3,5,0.97)',
  border:    'rgba(255,255,255,0.06)',
};

function parsePlanStart(startDate) {
  return startDate == null ? new Date() : new Date(startDate);
}

function PhaseTag({ phase }) {
  const s = PHASE_STYLE[phase] || PHASE_STYLE.Build;
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`,
                   fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'9px',
                   letterSpacing:'0.18em', padding:'2px 7px', textTransform:'uppercase' }}>
      {phase}
    </span>
  );
}

function CyberBtn({ onClick, children, style }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background: hov ? 'rgba(224,53,53,0.1)' : 'rgba(255,255,255,0.02)',
               border:`1px solid ${hov ? 'rgba(224,53,53,0.4)' : 'rgba(255,255,255,0.08)'}`,
               borderRadius:0, padding:'7px 14px', cursor:'pointer', transition:'all 0.15s',
               display:'flex', alignItems:'center', gap:'6px',
               fontFamily:"'Rajdhani',monospace", fontWeight:600, fontSize:'11px',
               letterSpacing:'0.14em', textTransform:'uppercase',
               color: hov ? R.accent : R.textDim, ...style }}>
      {children}
    </button>
  );
}

export default function TaskCalendar({ tasks, goal, startDate, onReset }) {
  const planStart = useMemo(() => parsePlanStart(startDate), [startDate]);
  const allDates  = tasks.map((_, i) => addDays(planStart, i));

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(parsePlanStart(startDate)));
  const [selectedDay,  setSelectedDay]  = useState(() => parsePlanStart(startDate));

  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end:   endOfMonth(currentMonth),
  }), [currentMonth]);

  const startDow = getDay(startOfMonth(currentMonth));
  const getTaskForDate = (date) => {
    const idx = allDates.findIndex(d => isSameDay(d, date));
    return idx >= 0 ? { ...tasks[idx], dayNumber: idx+1 } : null;
  };
  const selectedTask = getTaskForDate(selectedDay);

  const prevMonth = () => setCurrentMonth(p => new Date(p.getFullYear(), p.getMonth()-1, 1));
  const nextMonth = () => setCurrentMonth(p => new Date(p.getFullYear(), p.getMonth()+1, 1));

  const handleDownload = () => {
    let csv = 'Day,Date,Weekday,Phase,Scheduled Time,Task,Milestone,Description,Duration\n';
    tasks.forEach((task, i) => {
      const date = format(addDays(planStart, i), 'yyyy-MM-dd');
      const q = s => `"${String(s||'').replace(/"/g,'""')}"`;
      csv += [i+1,date,q(task.weekday),q(task.phase),q(task.scheduledTime),
              q(task.title),q(task.milestone),q(task.description),q(task.duration)].join(',') + '\n';
    });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
      download: `stoix-protocol-${format(new Date(),'yyyy-MM-dd')}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}
      style={{ width:'100%', maxWidth:'900px', margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between',
                    gap:'12px', marginBottom:'20px' }}>
        <div>
          <h2 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'22px',
                       color:R.accent, letterSpacing:'0.1em', textShadow:`0 0 18px rgba(224,53,53,0.35)`,
                       margin:'0 0 3px', textTransform:'uppercase' }}>
            PROTOCOL ACTIVE
          </h2>
          <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:R.textDim, margin:0 }}>
            <span style={{ color:'rgba(224,53,53,0.6)', fontFamily:"'Rajdhani',monospace", fontWeight:700,
                           fontSize:'13px' }}>{tasks.length}</span>{' '}
            DAYS &middot; {goal.length>70 ? goal.slice(0,70)+'…' : goal}
          </p>
        </div>
        <div style={{ display:'flex', gap:'6px' }}>
          <CyberBtn onClick={handleDownload}><Download size={12}/> CSV</CyberBtn>
          <CyberBtn onClick={onReset}><RotateCcw size={12}/> NEW MISSION</CyberBtn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'12px' }}
           className="lg:grid-cols-3-auto">
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px',
                      alignItems:'start' }} className="grid-cal-detail">

          {/* Calendar panel */}
          <div style={{ border:`1px solid ${R.accentBrd}`, background:R.panelBg, position:'relative' }}>
            {/* Corner accents */}
            {[{top:-1,left:-1,borderTop:`2px solid ${R.accent}`,borderLeft:`2px solid ${R.accent}`},
              {top:-1,right:-1,borderTop:`2px solid ${R.accent}`,borderRight:`2px solid ${R.accent}`},
              {bottom:-1,left:-1,borderBottom:`2px solid ${R.accent}`,borderLeft:`2px solid ${R.accent}`},
              {bottom:-1,right:-1,borderBottom:`2px solid ${R.accent}`,borderRight:`2px solid ${R.accent}`}
            ].map((s,i)=><div key={i} style={{ position:'absolute', width:8, height:8, ...s }}/>)}

            {/* Month nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'12px 16px', borderBottom:`1px solid rgba(224,53,53,0.1)` }}>
              <button type="button" onClick={prevMonth}
                style={{ background:'none', border:'none', cursor:'pointer', color:R.textDim,
                         padding:'4px', transition:'color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.color=R.accent}
                onMouseLeave={e=>e.currentTarget.style.color=R.textDim}>
                <ChevronLeft size={16}/>
              </button>
              <h3 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'14px',
                           color:R.text, letterSpacing:'0.18em', textTransform:'uppercase', margin:0 }}>
                {format(currentMonth,'MMMM yyyy')}
              </h3>
              <button type="button" onClick={nextMonth}
                style={{ background:'none', border:'none', cursor:'pointer', color:R.textDim,
                         padding:'4px', transition:'color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.color=R.accent}
                onMouseLeave={e=>e.currentTarget.style.color=R.textDim}>
                <ChevronRight size={16}/>
              </button>
            </div>

            <div style={{ padding:'12px 14px' }}>
              {/* Weekday headers */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'4px' }}>
                {weekDays.map(d=>(
                  <div key={d} style={{ textAlign:'center', fontFamily:"'Rajdhani',monospace",
                                        fontWeight:600, fontSize:'9px', letterSpacing:'0.14em',
                                        color:R.textDim, padding:'4px 0', textTransform:'uppercase' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
                {Array(startDow).fill(null).map((_,i)=><div key={`e-${i}`}/>)}
                {monthDays.map(day=>{
                  const task       = getTaskForDate(day);
                  const isSelected = isSameDay(day, selectedDay);
                  const hasTask    = !!task;
                  const ps         = task ? getPhaseStyle(task.phase) : null;
                  return (
                    <button key={day.toISOString()} type="button"
                      onClick={()=>hasTask&&setSelectedDay(day)} disabled={!hasTask}
                      style={{ aspectRatio:'1', display:'flex', flexDirection:'column',
                               alignItems:'center', justifyContent:'center', position:'relative',
                               background: isSelected&&hasTask ? ps.bg : 'transparent',
                               border: isSelected&&hasTask ? `1px solid ${ps.border}` : '1px solid transparent',
                               cursor: hasTask ? 'pointer' : 'default',
                               opacity: hasTask ? 1 : 0.2, transition:'all 0.12s',
                               fontFamily:"'Share Tech Mono',monospace", fontSize:'11px',
                               color: isSelected&&hasTask ? ps.color : R.text }}>
                      {format(day,'d')}
                      {hasTask && (
                        <div style={{ position:'absolute', bottom:'3px', width:'4px', height:'4px',
                                      background: ps?.color||R.accent,
                                      boxShadow:`0 0 4px ${ps?.color||R.accent}` }}/>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Phase legend */}
              <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:`1px solid ${R.border}`,
                            display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {Object.entries(PHASE_STYLE).map(([phase,s])=>(
                  <span key={phase} style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`,
                                             fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'8px',
                                             letterSpacing:'0.16em', padding:'2px 8px', textTransform:'uppercase' }}>
                    {phase}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Task detail panel */}
          <div style={{ border:`1px solid ${R.accentBrd}`, background:R.panelBg,
                        position:'relative', minHeight:'300px' }}>
            {[{top:-1,left:-1,borderTop:`2px solid ${R.accent}`,borderLeft:`2px solid ${R.accent}`},
              {top:-1,right:-1,borderTop:`2px solid ${R.accent}`,borderRight:`2px solid ${R.accent}`},
              {bottom:-1,left:-1,borderBottom:`2px solid ${R.accent}`,borderLeft:`2px solid ${R.accent}`},
              {bottom:-1,right:-1,borderBottom:`2px solid ${R.accent}`,borderRight:`2px solid ${R.accent}`}
            ].map((s,i)=><div key={i} style={{ position:'absolute', width:8, height:8, ...s }}/>)}

            <div style={{ padding:'10px 14px', borderBottom:`1px solid rgba(224,53,53,0.1)`,
                          background:'rgba(224,53,53,0.03)' }}>
              <span style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'9px',
                             letterSpacing:'0.22em', color:'rgba(224,53,53,0.5)', textTransform:'uppercase' }}>
                TASK DETAIL
              </span>
            </div>

            <div style={{ padding:'14px' }}>
              {selectedTask ? (
                <motion.div key={selectedDay.toISOString()}
                  initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                  transition={{ duration:0.25 }}
                  style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                    <span style={{ background:'rgba(224,53,53,0.1)', color:R.accent,
                                   border:`1px solid rgba(224,53,53,0.3)`,
                                   fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'9px',
                                   letterSpacing:'0.16em', padding:'2px 8px', textTransform:'uppercase' }}>
                      DAY {selectedTask.dayNumber}
                    </span>
                    {selectedTask.phase && <PhaseTag phase={selectedTask.phase}/>}
                    <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px', color:R.textDim }}>
                      {format(selectedDay,'EEE, MMM d, yyyy')}
                    </span>
                  </div>

                  {selectedTask.scheduledTime && (
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <Clock size={11} style={{ color:R.accent, flexShrink:0 }}/>
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:R.textDim }}>
                        {selectedTask.scheduledTime}{selectedTask.duration&&` · ${selectedTask.duration}`}
                      </span>
                    </div>
                  )}

                  {selectedTask.milestone && (
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'6px' }}>
                      <Target size={11} style={{ color:R.accent, flexShrink:0, marginTop:2 }}/>
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim,
                                     lineHeight:1.5 }}>
                        {selectedTask.milestone}
                      </span>
                    </div>
                  )}

                  <div style={{ width:'100%', height:'1px', background:`linear-gradient(90deg, ${R.accent}44, transparent)` }}/>

                  <h3 style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'16px',
                               color:R.text, letterSpacing:'0.04em', margin:0, textTransform:'uppercase',
                               textShadow:`0 0 12px rgba(224,53,53,0.2)` }}>
                    {selectedTask.title}
                  </h3>

                  <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:R.textDim,
                              lineHeight:1.6, margin:0, whiteSpace:'pre-line' }}>
                    {selectedTask.description}
                  </p>

                  {selectedTask.scheduleNote && (
                    <div style={{ paddingTop:'8px', borderTop:`1px solid ${R.border}`,
                                  display:'flex', alignItems:'flex-start', gap:'6px' }}>
                      <Calendar size={10} style={{ color:'rgba(224,53,53,0.4)', flexShrink:0, marginTop:2 }}/>
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px',
                                     color:'rgba(200,212,224,0.22)', fontStyle:'italic', lineHeight:1.5 }}>
                        {selectedTask.scheduleNote}
                      </span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                              minHeight:'200px' }}>
                  <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'11px', color:R.textDim,
                              textAlign:'center', lineHeight:1.6 }}>
                    Select a day on the calendar<br/>to view its task
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All days list */}
        <div style={{ border:`1px solid ${R.accentBrd}`, background:R.panelBg,
                      overflow:'hidden', marginTop:'12px', position:'relative' }}>
          {[{top:-1,left:-1,borderTop:`2px solid ${R.accent}`,borderLeft:`2px solid ${R.accent}`},
            {top:-1,right:-1,borderTop:`2px solid ${R.accent}`,borderRight:`2px solid ${R.accent}`},
            {bottom:-1,left:-1,borderBottom:`2px solid ${R.accent}`,borderLeft:`2px solid ${R.accent}`},
            {bottom:-1,right:-1,borderBottom:`2px solid ${R.accent}`,borderRight:`2px solid ${R.accent}`}
          ].map((s,i)=><div key={i} style={{ position:'absolute', width:8, height:8, ...s }}/>)}

          <div style={{ padding:'10px 16px', borderBottom:`1px solid rgba(224,53,53,0.1)`,
                        background:'rgba(224,53,53,0.03)', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'12px',
                           color:R.text, letterSpacing:'0.14em', textTransform:'uppercase' }}>
              ALL DAYS
            </span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim }}>
              {tasks.length} tasks
            </span>
          </div>

          <div style={{ maxHeight:'320px', overflowY:'auto' }} className="cyber-scroll">
            {tasks.map((task, i) => {
              const ps       = getPhaseStyle(task.phase);
              const isActive = selectedTask?.dayNumber===i+1;
              return (
                <motion.div key={i}
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  transition={{ delay: Math.min(i*0.015,0.8) }}
                  onClick={()=>setSelectedDay(addDays(planStart,i))}
                  style={{ padding:'10px 16px', borderBottom:`1px solid ${R.border}`,
                           cursor:'pointer', transition:'background 0.12s',
                           background: isActive ? ps.bg : 'transparent',
                           borderLeft: isActive ? `2px solid ${ps.color}` : '2px solid transparent' }}
                  onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background='rgba(255,255,255,0.02)';}}
                  onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start',
                                  minWidth:'52px', gap:'2px' }}>
                      <span style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'10px',
                                     color: ps.color, letterSpacing:'0.12em', opacity: 0.75 }}>
                        DAY {i+1}
                      </span>
                      {task.scheduledTime && (
                        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'9px',
                                       color:R.textDim }}>
                          {task.scheduledTime}
                        </span>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'2px' }}>
                        <p style={{ fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'13px',
                                    color:R.text, margin:0, overflow:'hidden', textOverflow:'ellipsis',
                                    whiteSpace:'nowrap', maxWidth:'100%', letterSpacing:'0.03em' }}>
                          {task.title}
                        </p>
                        {task.phase && (
                          <span style={{ background:ps.bg, color:ps.color, border:`1px solid ${ps.border}`,
                                         fontFamily:"'Rajdhani',monospace", fontWeight:700, fontSize:'8px',
                                         letterSpacing:'0.14em', padding:'1px 5px', textTransform:'uppercase',
                                         flexShrink:0 }}>
                            {task.phase}
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim, margin:0 }}>
                        {format(addDays(planStart,i),'MMM d')}{task.duration&&` · ${task.duration}`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
