import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, MapPin, Clock, DollarSign, Compass, Target } from 'lucide-react';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import { STOIX_MATRIX_INTENSITY, STOIX_MATRIX_SPEED } from '@/lib/matrix-rain-presets';
import { useToast } from '@/components/ui/use-toast';
import { goBackNavigate } from '@/lib/stoix-nav';

function QuestCard({ quest, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="rounded-lg p-4 bg-transparent border border-sky-400/55 hover:border-sky-400 transition-colors cursor-pointer shadow-[0_0_18px_rgba(56,189,248,0.08)]"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{quest.vibe}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-[10px] text-sky-300 tracking-widest uppercase">{quest.type}</p>
            <span className="text-sky-400/40 text-xs">·</span>
            <p className="font-mono text-[10px] text-sky-300/85">
              ${quest.estimatedCost} · {quest.totalTimeMinutes} min total
            </p>
          </div>
          <h3 className="font-mono text-sm text-sky-100 font-semibold mt-0.5">{quest.title}</h3>
          <p className="font-mono text-xs text-sky-300 mt-0.5">{quest.place}</p>
          <p className="font-mono text-xs text-sky-200/90 mt-1.5 leading-relaxed">{quest.whyThisFits}</p>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="font-mono text-xs text-sky-200/85 mt-3 leading-relaxed border-t border-sky-400/35 pt-3">
                  {quest.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(quest.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-transparent text-sky-300 border border-sky-400/45"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 font-mono text-[10px] text-sky-300/75">
                  <span>{quest.distanceMiles?.toFixed?.(1) ?? quest.distanceMiles} mi</span>
                  <span>{quest.travelTimeMinutes} min travel</span>
                  <span>{quest.activityDurationMinutes} min activity</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-mono text-[10px] text-sky-400/70 mt-2">
            {expanded ? '[ collapse ]' : '[ tap to expand ]'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SkillPathCard({ skill, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.45 }}
      className="rounded-lg p-4 bg-transparent border border-sky-400/55 hover:border-sky-400 transition-colors shadow-[0_0_18px_rgba(56,189,248,0.08)]"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{skill.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-sky-300 tracking-widest uppercase">{skill.category}</p>
          <h3 className="font-mono text-sm text-sky-100 font-semibold mt-0.5">{skill.title}</h3>
          <div className="flex gap-2 mt-1 font-mono text-[10px] text-sky-300/85">
            <span>{skill.timeRequired}</span>
            <span>·</span>
            <span>{skill.cost}</span>
          </div>
          <p className="font-mono text-xs text-sky-200/90 mt-1.5 leading-relaxed">{skill.whyThisFits}</p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 rounded-lg px-2 py-1 font-mono text-[10px] text-sky-300 border border-transparent transition-all duration-200 hover:bg-sky-400/10 hover:border-sky-400/40 hover:shadow-[0_0_14px_rgba(56,189,248,0.15)] active:scale-[0.98]"
          >
            {expanded ? '[ hide plan ]' : '[ view session plan + milestones ]'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 border-t border-sky-400/35 pt-3">
                  <p className="font-mono text-[10px] text-sky-300 tracking-widest uppercase mb-2">
                    Today&apos;s Session
                  </p>
                  <div className="space-y-1.5">
                    {(skill.sessionPlan || []).map((s) => (
                      <div key={s.step} className="flex gap-2">
                        <span className="font-mono text-[10px] text-sky-400/70 shrink-0 mt-0.5">{s.step}.</span>
                        <span className="font-mono text-xs text-sky-100/95">
                          {s.action}
                          <span className="text-sky-300/80 ml-1.5">— {s.duration}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 border-t border-sky-400/35 pt-3">
                  <p className="font-mono text-[10px] text-sky-300 tracking-widest uppercase mb-2">
                    Level-Up Path
                  </p>
                  <div className="space-y-1.5">
                    {(skill.levelUpPath || []).map((m) => (
                      <div key={m.milestone} className="flex gap-2">
                        <span className="font-mono text-[10px] text-sky-400/70 shrink-0 mt-0.5">
                          M{m.milestone}
                        </span>
                        <span className="font-mono text-xs text-sky-100/95">
                          {m.goal}
                          <span className="text-sky-300/80 ml-1.5">— {m.timeframe}</span>
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
    </motion.div>
  );
}

function SkillRoadmapCard({ skill }) {
  if (!skill?.skill) return null;
  return (
    <div className="rounded-lg p-4 bg-transparent border border-sky-400/55 mt-4 shadow-[0_0_18px_rgba(56,189,248,0.08)]">
      <p className="font-mono text-[10px] text-sky-300 tracking-widest uppercase mb-1">
        Skill Suggestion
      </p>
      <h3 className="font-mono text-sm text-sky-100 font-semibold">{skill.skill}</h3>
      <p className="font-mono text-xs text-sky-200/90 mt-1 leading-relaxed">{skill.tagline}</p>
      <div className="mt-3 space-y-1.5">
        {(skill.steps || []).map((s) => (
          <div key={s.step} className="flex gap-2">
            <span className="font-mono text-[10px] text-sky-400/70 shrink-0 mt-0.5">{s.step}.</span>
            <span className="font-mono text-xs text-sky-100/95">
              {s.action}
              <span className="text-sky-300/80 ml-1.5">— {s.time}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideQuestsForm({ onSubmit, isLoading }) {
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('60');
  const [budget, setBudget] = useState('20');
  const [maxDist, setMaxDist] = useState('2');
  const [interest, setInterest] = useState('');
  const [mode, setMode] = useState('solo');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim() || !interest.trim()) return;
    onSubmit({
      location: location.trim(),
      availableTimeMinutes: parseInt(time, 10) || 60,
      budget: parseInt(budget, 10) || 0,
      maxDistanceMiles: parseFloat(maxDist) || 2,
      interest: interest.trim(),
      mode,
    });
  };

  const inputClass =
    'bg-transparent border-sky-400/50 font-mono text-sm text-sky-100 placeholder:text-sky-400/45 focus:border-sky-400 focus:ring-sky-400/25';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> Location
        </Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Manhattan, NYC"
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Time (min)
          </Label>
          <Input
            type="number"
            min="15"
            max="240"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="60"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" /> Budget ($)
          </Label>
          <Input
            type="number"
            min="0"
            max="500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="20"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase flex items-center gap-1.5">
            <Compass className="w-3 h-3" /> Max Dist (mi)
          </Label>
          <Input
            type="number"
            min="0.1"
            max="20"
            step="0.1"
            value={maxDist}
            onChange={(e) => setMaxDist(e.target.value)}
            placeholder="2"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase">Mode</Label>
          <div className="flex gap-1 h-9">
            {['solo', 'social'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                disabled={isLoading}
                className={`flex-1 rounded-lg border font-mono text-xs transition-all duration-200 active:scale-[0.98] ${
                  mode === m
                    ? 'border-sky-400/50 bg-gradient-to-b from-sky-500/25 to-blue-600/15 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_16px_rgba(56,189,248,0.18)]'
                    : 'border-sky-400/40 bg-transparent text-sky-300/80 hover:border-sky-400/70 hover:text-sky-100 hover:bg-sky-400/5'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase flex items-center gap-1.5">
          <Target className="w-3 h-3" /> Interest / Vibe
        </Label>
        <Input
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          placeholder="e.g. coffee, art, music, fitness..."
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        variant="blue"
        disabled={!location.trim() || !interest.trim() || isLoading}
        className="w-full text-sm tracking-wider uppercase"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Scanning your city...
          </span>
        ) : (
          '[ FIND QUESTS ]'
        )}
      </Button>
    </form>
  );
}

function SkillForm({ onSubmit, isLoading }) {
  const [interest, setInterest] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!interest.trim()) return;
    onSubmit({ interest: interest.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="font-mono text-xs text-sky-300 tracking-widest uppercase flex items-center gap-1.5">
          <Target className="w-3 h-3" /> What do you want to learn?
        </Label>
        <Input
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          placeholder="e.g. music, fitness, coding, cooking..."
          className="bg-transparent border-sky-400/50 font-mono text-sm text-sky-100 placeholder:text-sky-400/45 focus:border-sky-400 focus:ring-sky-400/25"
          disabled={isLoading}
        />
        <p className="font-mono text-[11px] text-sky-200/85 leading-relaxed">
          You&apos;ll get 3 skills you can start today, each with a session plan and a level-up path.
        </p>
      </div>

      <Button
        type="submit"
        variant="blue"
        disabled={!interest.trim() || isLoading}
        className="w-full text-sm tracking-wider uppercase"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Building your skill path...
          </span>
        ) : (
          '[ GENERATE SKILL PATH ]'
        )}
      </Button>
    </form>
  );
}

export default function BluePill() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('quests');
  const [isLoading, setIsLoading] = useState(false);

  const [quests, setQuests] = useState(null);
  const [questSkill, setQuestSkill] = useState(null);
  const [skills, setSkills] = useState(null);

  const handleQuestSubmit = async (params) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/blue-pill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      let data;
      try { data = await resp.json(); } catch { data = null; }

      if (!resp.ok || !data?.ok) {
        toast({
          variant: 'destructive',
          title: 'Quest engine error',
          description: data?.error || `Server returned ${resp.status}.`,
        });
        return;
      }

      setQuests(data.quests || []);
      setQuestSkill(data.skill || null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Cannot reach server',
        description: e?.message || 'Start the Python backend (python3 server.py) on port 8787, then retry.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillSubmit = async ({ interest }) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/skill-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest }),
      });

      let data;
      try { data = await resp.json(); } catch { data = null; }

      if (!resp.ok || !data?.ok) {
        toast({
          variant: 'destructive',
          title: 'Skill path error',
          description: data?.error || `Server returned ${resp.status}.`,
        });
        return;
      }

      setSkills(data.skills || []);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Cannot reach server',
        description: e?.message || 'Start the Python backend (python3 server.py) on port 8787, then retry.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showForms = !quests && !skills;

  return (
    <div className="min-h-screen bg-transparent relative">
      <MatrixRainBg intensity={STOIX_MATRIX_INTENSITY} speed={STOIX_MATRIX_SPEED} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="py-6 px-6 sm:px-12 flex items-center gap-4"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goBackNavigate(navigate)}
            className="shrink-0 border-sky-400/50 bg-transparent text-sky-200 hover:bg-sky-400/10 hover:text-sky-50 backdrop-blur-none"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1
              className="font-mono text-xl sm:text-2xl tracking-widest"
              style={{ color: '#60a5fa', textShadow: '0 0 14px #3b82f666' }}
            >
              STOIX
            </h1>
            <p className="font-mono text-xs text-sky-300/90 mt-0.5 tracking-wider">
              Side quests &amp; skill learning — curated for your time and place.
            </p>
          </div>
        </motion.header>

        <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pb-12 pt-2 sm:pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15 }}
            className="w-full max-w-xl"
          >
            {/* Tab switcher — only shown on forms */}
            {showForms && (
              <div className="flex gap-1 bg-transparent border border-sky-400/50 rounded-lg p-1 mb-5 w-fit">
                {[
                  { key: 'quests', label: '\ud83d\uddfa\ufe0f Side Quests' },
                  { key: 'skills', label: '\ud83d\udcda Skill Path' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`rounded-lg px-4 py-2 font-mono text-xs transition-all duration-200 active:scale-[0.98] border ${
                      activeTab === key
                        ? 'border-sky-400/45 bg-gradient-to-b from-sky-500/22 to-blue-700/12 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_18px_rgba(56,189,248,0.16)]'
                        : 'border-transparent text-sky-300/75 hover:border-sky-400/45 hover:bg-sky-400/5 hover:text-sky-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Side quests form */}
            {activeTab === 'quests' && !quests && (
              <div className="rounded-lg p-6 sm:p-8 bg-transparent border border-sky-400/55 shadow-[0_0_22px_rgba(56,189,248,0.12)]">
                <p className="font-mono text-[10px] text-sky-300 tracking-widest mb-2">
                  [ SIDE QUEST FINDER ]
                </p>
                <h2 className="font-mono text-xl sm:text-2xl text-sky-100 mb-1">
                  Where are you?
                </h2>
                <p className="font-mono text-sm text-sky-200/90 mb-6">
                  Tell us your time, budget, and vibe. We&apos;ll find 5 real things to do near you.
                </p>
                <SideQuestsForm onSubmit={handleQuestSubmit} isLoading={isLoading} />
              </div>
            )}

            {/* Quest results */}
            {activeTab === 'quests' && quests && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] text-sky-300 tracking-widest">
                    [ {quests.length} QUESTS FOUND ]
                  </p>
                  <button
                    type="button"
                    onClick={() => { setQuests(null); setQuestSkill(null); }}
                    className="rounded-lg px-2 py-1 font-mono text-[10px] text-sky-300/85 border border-transparent transition-all duration-200 hover:bg-sky-400/10 hover:border-sky-400/35 hover:text-sky-100 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] active:scale-[0.98]"
                  >
                    [ new search ]
                  </button>
                </div>
                <div className="space-y-3">
                  {quests.map((q, i) => (
                    <QuestCard key={i} quest={q} index={i} />
                  ))}
                </div>
                <SkillRoadmapCard skill={questSkill} />
              </div>
            )}

            {/* Skill path form */}
            {activeTab === 'skills' && !skills && (
              <div className="rounded-lg p-6 sm:p-8 bg-transparent border border-sky-400/55 shadow-[0_0_22px_rgba(56,189,248,0.12)]">
                <p className="font-mono text-[10px] text-sky-300 tracking-widest mb-2">
                  [ SKILL PATH GENERATOR ]
                </p>
                <h2 className="font-mono text-xl sm:text-2xl text-sky-100 mb-1">
                  What do you want to learn?
                </h2>
                <p className="font-mono text-sm text-sky-200/90 mb-6">
                  Pick any interest. Get 3 skills you can start today with a session plan and level-up path.
                </p>
                <SkillForm onSubmit={handleSkillSubmit} isLoading={isLoading} />
              </div>
            )}

            {/* Skill results */}
            {activeTab === 'skills' && skills && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] text-sky-300 tracking-widest">
                    [ {skills.length} SKILLS UNLOCKED ]
                  </p>
                  <button
                    type="button"
                    onClick={() => setSkills(null)}
                    className="rounded-lg px-2 py-1 font-mono text-[10px] text-sky-300/85 border border-transparent transition-all duration-200 hover:bg-sky-400/10 hover:border-sky-400/35 hover:text-sky-100 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] active:scale-[0.98]"
                  >
                    [ new search ]
                  </button>
                </div>
                <div className="space-y-3">
                  {skills.map((s, i) => (
                    <SkillPathCard key={i} skill={s} index={i} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </main>

        <footer className="py-4 px-6 text-center">
          <p className="font-mono text-xs text-sky-400/45">The path shapes the protocol.</p>
        </footer>
      </div>
    </div>
  );
}
