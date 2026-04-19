import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import GoalForm from '../components/matrix/GoalForm';
import TaskCalendar from '../components/matrix/TaskCalendar';
import CyberGridBg from '../components/matrix/CyberGridBg';
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

function mapApiTasks(rawTasks, dailyMinutes) {
  return [...rawTasks]
    .sort((a, b) => (a.day || 0) - (b.day || 0))
    .map((t) => ({
      title:         String(t.title         || '').trim() || 'Task',
      description:   String(t.description   || '').trim(),
      duration:      `${dailyMinutes} min`,
      phase:         String(t.phase         || '').trim(),
      milestone:     String(t.milestone     || '').trim(),
      scheduledTime: t.scheduled_time ? String(t.scheduled_time).trim() : '09:00',
      scheduleNote:  String(t.schedule_note || '').trim(),
      weekday:       String(t.weekday       || '').trim(),
    }));
}

const R = {
  accent:     '#e03535',
  accentDim:  'rgba(224,53,53,0.12)',
  accentBrd:  'rgba(224,53,53,0.22)',
  accentGlow: 'rgba(224,53,53,0.4)',
  bg:         '#060204',
  panelBg:    'rgba(6,3,5,0.97)',
  text:       '#c8d4e0',
  textDim:    'rgba(200,212,224,0.65)',
};

const BATCH = 30; // tasks per API call

async function fetchBatch(apiKey, goal, fromDay, toDay, totalDays, dailyMinutes) {
  const batchNum   = Math.ceil(fromDay / BATCH);
  const totalBatch = Math.ceil(totalDays / BATCH);
  const phaseHint  =
    fromDay <= totalDays * 0.25 ? 'Foundation' :
    fromDay <= totalDays * 0.55 ? 'Build' :
    fromDay <= totalDays * 0.8  ? 'Push' : 'Mastery';

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: 'Respond with valid JSON only. No markdown, no code blocks, no extra text.',
      messages: [{
        role: 'user',
        content: `Generate days ${fromDay}–${toDay} (batch ${batchNum} of ${totalBatch}) of a ${totalDays}-day protocol for: "${goal}". Each day = ${dailyMinutes} min. Current phase: ${phaseHint}.
Use phase names exactly: Foundation, Build, Push, Mastery.
Return JSON: {"tasks":[{"day":${fromDay},"title":"...","description":"concise 1-2 sentence task","phase":"${phaseHint}","milestone":"...","scheduled_time":"HH:MM","schedule_note":"...","weekday":"..."},...up to day ${toDay}]}
Generate all ${toDay - fromDay + 1} tasks.`,
      }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${resp.status}`);
  }
  const data = await resp.json();
  const raw  = data.content[0].text.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.tasks) ? parsed.tasks : [];
}

export default function Protocol() {
  const { toast }                   = useToast();
  const [tasks, setTasks]           = useState(null);
  const [goalText, setGoalText]     = useState('');
  const [startDate, setStartDate]   = useState(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const cardRef    = useRef(null);
  const [orbitRect, setOrbitRect] = useState(null);
  const handleCardEnter = useCallback(() => {
    if (cardRef.current) setOrbitRect(cardRef.current.getBoundingClientRect());
  }, []);
  const handleCardLeave = useCallback(() => setOrbitRect(null), []);

  const generateTasks = async ({ goal, days, dailyMinutes }) => {
    setIsLoading(true);
    setLoadingMsg('');
    setGoalText(goal);
    const day0 = startOfDay(new Date());
    setStartDate(day0.getTime());
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Add VITE_ANTHROPIC_API_KEY to your .env file.');

      const totalBatches = Math.ceil(days / BATCH);
      const allTasks = [];

      for (let b = 0; b < totalBatches; b++) {
        const fromDay = b * BATCH + 1;
        const toDay   = Math.min((b + 1) * BATCH, days);
        setLoadingMsg(totalBatches > 1 ? `Building days ${fromDay}–${toDay} of ${days}…` : 'Building protocol…');
        const batch = await fetchBatch(apiKey, goal, fromDay, toDay, days, dailyMinutes);
        allTasks.push(...batch);
      }

      if (!allTasks.length) {
        toast({ variant: 'destructive', title: 'No tasks generated', description: 'Try rephrasing your goal.' });
        return;
      }
      setTasks(mapApiTasks(allTasks, dailyMinutes));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Protocol engine error', description: e?.message || 'Failed to generate tasks.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => { setTasks(null); setGoalText(''); setStartDate(null); setLoadingMsg(''); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="cyber-bg-red" style={{ minHeight: '100vh', paddingBottom: '48px', position: 'relative', isolation: 'isolate' }}>
      <CyberGridBg accent="#e03535" downOnly orbitRect={orbitRect} />
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${R.accentBrd}`, padding: '5px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: R.panelBg }}>
        <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'10px', letterSpacing:'0.22em',
                       color:'rgba(224,53,53,0.45)', fontWeight:600 }}>
          STOIX PROTOCOL ENGINE · RED PILL MODULE
        </span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim, letterSpacing:'0.06em' }}>
          {format(new Date(), 'yyyy.MM.dd  HH:mm')}
        </span>
      </div>

      {/* Header */}
      <motion.header initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
        style={{ padding:'18px 28px', borderBottom:`1px solid ${R.accentBrd}`,
                 display:'flex', alignItems:'center', gap:'16px', background:'rgba(4,2,4,0.75)' }}>
        <Link to="/" state={{ skipIntro: true }} style={{ color:'rgba(224,53,53,0.45)', display:'flex', transition:'color 0.2s',
                               textDecoration:'none' }}
              onMouseEnter={e=>e.currentTarget.style.color=R.accent}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(224,53,53,0.45)'}>
          <ArrowLeft size={15} />
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:"'Rajdhani',monospace", fontSize:'21px', fontWeight:700,
                       color:R.accent, letterSpacing:'0.12em', textShadow:`0 0 22px ${R.accentGlow}`,
                       margin:0 }}>
            STOIX <span style={{ color:'rgba(224,53,53,0.3)', fontWeight:400 }}>//</span> RED PILL
          </h1>
          <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'10px', color:R.textDim,
                      letterSpacing:'0.07em', marginTop:'3px' }}>
            Evidence-based protocol — research + structured daily micro-tasks
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:R.accent,
                        boxShadow:`0 0 8px ${R.accent}` }} />
          <span style={{ fontFamily:"'Rajdhani',monospace", fontSize:'10px', letterSpacing:'0.18em',
                         color:'rgba(224,53,53,0.55)', fontWeight:600 }}>ACTIVE</span>
        </div>
      </motion.header>

      {/* Content */}
      <main style={{ padding:'32px 16px 32px', display:'flex', justifyContent:'center' }}>
        {!tasks
          ? <GoalForm ref={cardRef} onSubmit={generateTasks} isLoading={isLoading} loadingMsg={loadingMsg}
              onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave} />
          : <TaskCalendar tasks={tasks} goal={goalText} startDate={startDate} onReset={handleReset} accent="red" />
        }
      </main>
    </motion.div>
  );
}
