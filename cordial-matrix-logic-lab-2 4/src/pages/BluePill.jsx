import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, MapPin, Clock, DollarSign, Compass, Target } from 'lucide-react';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import { useToast } from '@/components/ui/use-toast';
import { goBackNavigate } from '@/lib/stoix-nav';

function QuestCard({ quest, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="border border-border rounded-lg p-4 bg-card/80 backdrop-blur-sm hover:border-blue-500/40 transition-colors cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{quest.vibe}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-[10px] text-blue-400/70 tracking-widest uppercase">{quest.type}</p>
            <span className="text-muted-foreground/30 text-xs">·</span>
            <p className="font-mono text-[10px] text-muted-foreground">
              ${quest.estimatedCost} · {quest.totalTimeMinutes} min total
            </p>
          </div>
          <h3 className="font-mono text-sm text-foreground font-semibold mt-0.5">{quest.title}</h3>
          <p className="font-mono text-xs text-blue-300/80 mt-0.5">{quest.place}</p>
          <p className="font-mono text-xs text-muted-foreground mt-1.5 leading-relaxed">{quest.whyThisFits}</p>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="font-mono text-xs text-muted-foreground mt-3 leading-relaxed border-t border-border/40 pt-3">
                  {quest.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(quest.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/80 border border-blue-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 font-mono text-[10px] text-muted-foreground/70">
                  <span>{quest.distanceMiles?.toFixed?.(1) ?? quest.distanceMiles} mi</span>
                  <span>{quest.travelTimeMinutes} min travel</span>
                  <span>{quest.activityDurationMinutes} min activity</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-mono text-[10px] text-blue-500/50 mt-2">
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
      className="border border-border rounded-lg p-4 bg-card/80 backdrop-blur-sm hover:border-blue-500/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{skill.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-blue-400/70 tracking-widest uppercase">{skill.category}</p>
          <h3 className="font-mono text-sm text-foreground font-semibold mt-0.5">{skill.title}</h3>
          <div className="flex gap-2 mt-1 font-mono text-[10px] text-muted-foreground">
            <span>{skill.timeRequired}</span>
            <span>·</span>
            <span>{skill.cost}</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1.5 leading-relaxed">{skill.whyThisFits}</p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-[10px] text-blue-500/60 hover:text-blue-400 mt-2 transition-colors"
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
                <div className="mt-3 border-t border-border/40 pt-3">
                  <p className="font-mono text-[10px] text-blue-400/70 tracking-widest uppercase mb-2">
                    Today&apos;s Session
                  </p>
                  <div className="space-y-1.5">
                    {(skill.sessionPlan || []).map((s) => (
                      <div key={s.step} className="flex gap-2">
                        <span className="font-mono text-[10px] text-blue-500/50 shrink-0 mt-0.5">{s.step}.</span>
                        <span className="font-mono text-xs text-foreground/80">
                          {s.action}
                          <span className="text-muted-foreground ml-1.5">— {s.duration}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 border-t border-border/40 pt-3">
                  <p className="font-mono text-[10px] text-blue-400/70 tracking-widest uppercase mb-2">
                    Level-Up Path
                  </p>
                  <div className="space-y-1.5">
                    {(skill.levelUpPath || []).map((m) => (
                      <div key={m.milestone} className="flex gap-2">
                        <span className="font-mono text-[10px] text-blue-500/50 shrink-0 mt-0.5">
                          M{m.milestone}
                        </span>
                        <span className="font-mono text-xs text-foreground/80">
                          {m.goal}
                          <span className="text-muted-foreground ml-1.5">— {m.timeframe}</span>
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
    <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/5 mt-4">
      <p className="font-mono text-[10px] text-blue-400/70 tracking-widest uppercase mb-1">
        Skill Suggestion
      </p>
      <h3 className="font-mono text-sm text-foreground font-semibold">{skill.skill}</h3>
      <p className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">{skill.tagline}</p>
      <div className="mt-3 space-y-1.5">
        {(skill.steps || []).map((s) => (
          <div key={s.step} className="flex gap-2">
            <span className="font-mono text-[10px] text-blue-500/50 shrink-0 mt-0.5">{s.step}.</span>
            <span className="font-mono text-xs text-foreground/80">
              {s.action}
              <span className="text-muted-foreground ml-1.5">— {s.time}</span>
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
    'bg-background border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-blue-500/50 focus:ring-blue-500/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase flex items-center gap-1.5">
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
          <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase flex items-center gap-1.5">
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
          <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase flex items-center gap-1.5">
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
          <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase flex items-center gap-1.5">
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
          <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase">Mode</Label>
          <div className="flex gap-1 h-9">
            {['solo', 'social'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                disabled={isLoading}
                className={`flex-1 rounded font-mono text-xs transition-colors ${
                  mode === m
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase flex items-center gap-1.5">
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
        disabled={!location.trim() || !interest.trim() || isLoading}
        className="w-full font-mono text-sm tracking-wider uppercase bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 h-10"
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
        <Label className="font-mono text-xs text-foreground/60 tracking-widest uppercase flex items-center gap-1.5">
          <Target className="w-3 h-3" /> What do you want to learn?
        </Label>
        <Input
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          placeholder="e.g. music, fitness, coding, cooking..."
          className="bg-background border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-blue-500/50 focus:ring-blue-500/20"
          disabled={isLoading}
        />
        <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
          You&apos;ll get 3 skills you can start today, each with a session plan and a level-up path.
        </p>
      </div>

      <Button
        type="submit"
        disabled={!interest.trim() || isLoading}
        className="w-full font-mono text-sm tracking-wider uppercase bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 h-10"
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
    <div className="min-h-screen bg-background relative">
      <MatrixRainBg intensity={0.3} speed={0.3} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="py-6 px-6 sm:px-12 flex items-center gap-4"
        >
          <button
            type="button"
            onClick={() => goBackNavigate(navigate)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0 bg-transparent border-0 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1
              className="font-mono text-xl sm:text-2xl tracking-widest"
              style={{ color: '#60a5fa', textShadow: '0 0 14px #3b82f666' }}
            >
              STOIX // BLUE PILL
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-0.5 tracking-wider">
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
              <div className="flex gap-1 bg-card/60 border border-border rounded-lg p-1 mb-5 w-fit">
                {[
                  { key: 'quests', label: '\ud83d\uddfa\ufe0f Side Quests' },
                  { key: 'skills', label: '\ud83d\udcda Skill Path' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 rounded font-mono text-xs transition-colors ${
                      activeTab === key
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Side quests form */}
            {activeTab === 'quests' && !quests && (
              <div className="border border-border rounded-lg p-6 sm:p-8 bg-card/80 backdrop-blur-sm">
                <p className="font-mono text-[10px] text-blue-400/70 tracking-widest mb-2">
                  [ SIDE QUEST FINDER ]
                </p>
                <h2 className="font-mono text-xl sm:text-2xl text-foreground mb-1">
                  Where are you?
                </h2>
                <p className="font-mono text-sm text-muted-foreground mb-6">
                  Tell us your time, budget, and vibe. We&apos;ll find 5 real things to do near you.
                </p>
                <SideQuestsForm onSubmit={handleQuestSubmit} isLoading={isLoading} />
              </div>
            )}

            {/* Quest results */}
            {activeTab === 'quests' && quests && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] text-blue-400/70 tracking-widest">
                    [ {quests.length} QUESTS FOUND ]
                  </p>
                  <button
                    type="button"
                    onClick={() => { setQuests(null); setQuestSkill(null); }}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="border border-border rounded-lg p-6 sm:p-8 bg-card/80 backdrop-blur-sm">
                <p className="font-mono text-[10px] text-blue-400/70 tracking-widest mb-2">
                  [ SKILL PATH GENERATOR ]
                </p>
                <h2 className="font-mono text-xl sm:text-2xl text-foreground mb-1">
                  What do you want to learn?
                </h2>
                <p className="font-mono text-sm text-muted-foreground mb-6">
                  Pick any interest. Get 3 skills you can start today with a session plan and level-up path.
                </p>
                <SkillForm onSubmit={handleSkillSubmit} isLoading={isLoading} />
              </div>
            )}

            {/* Skill results */}
            {activeTab === 'skills' && skills && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] text-blue-400/70 tracking-widest">
                    [ {skills.length} SKILLS UNLOCKED ]
                  </p>
                  <button
                    type="button"
                    onClick={() => setSkills(null)}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="font-mono text-xs text-muted-foreground/50">The path shapes the protocol.</p>
        </footer>
      </div>
    </div>
  );
}
