import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import { STOIX_MATRIX_INTENSITY, STOIX_MATRIX_SPEED } from '@/lib/matrix-rain-presets';
import GoalForm from '../components/matrix/GoalForm';
import TaskCalendar from '../components/matrix/TaskCalendar';
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { stoixApiUrl } from '@/lib/stoix-api';
import { goBackNavigate } from '@/lib/stoix-nav';

// Map the backend task objects to the shape TaskCalendar expects.
// Keeps fields as structured props rather than concatenating into description.
function mapApiTasks(rawTasks, dailyMinutes) {
  const sorted = [...rawTasks].sort((a, b) => (a.day || 0) - (b.day || 0));
  return sorted.map((t) => ({
    title:         String(t.title         || '').trim() || 'Task',
    description:   String(t.description   || '').trim(),
    duration:      `${dailyMinutes} min`,
    phase:         String(t.phase         || '').trim(),
    milestone:     String(t.milestone     || '').trim(),
    scheduledTime: t.scheduled_time
      ? String(t.scheduled_time).trim()
      : '09:00',
    scheduleNote:  String(t.schedule_note || '').trim(),
    weekday:       String(t.weekday       || '').trim(),
  }));
}

export default function Protocol() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks]         = useState(null);
  const [goalText, setGoalText]   = useState('');
  const [startDate, setStartDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // onSubmit receives { goal, days, dailyMinutes, calendar, startTime } from GoalForm
  const generateTasks = async ({ goal, days, dailyMinutes, calendar, startTime }) => {
    setIsLoading(true);
    setGoalText(goal);

    const day0          = startOfDay(new Date());
    const startDateStr  = format(day0, 'yyyy-MM-dd');
    setStartDate(day0.getTime());

    try {
      const resp = await fetch(stoixApiUrl('/api/generate-tasks'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          days,
          dailyMinutes,
          startTime: startTime || '09:00',
          startDate: startDateStr,
          calendar:  calendar || { type: 'none' },
        }),
      });

      const rawText = await resp.text();
      let data = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!resp.ok) {
        let detail = data?.error;
        if (!detail) {
          if (resp.status === 502 || resp.status === 503 || resp.status === 504) {
            detail =
              'Cannot reach STOIX on port 8787. In a separate terminal run: python3 server.py (from the repo root). If you use npm run dev, start the Python server first so Vite can proxy /api.';
          } else if (resp.status === 404) {
            detail =
              'POST /api/generate-tasks was not found. Use server.py for the API, or set VITE_STOIX_API_ORIGIN to your backend URL.';
          } else if (rawText && rawText.length < 400 && !rawText.trim().startsWith('<')) {
            detail = rawText.trim();
          } else {
            detail = `HTTP ${resp.status}. Check the terminal running server.py for tracebacks.`;
          }
        }
        toast({
          variant:     'destructive',
          title:       'Protocol engine error',
          description: detail,
        });
        setIsLoading(false);
        return;
      }

      if (!data?.ok || !Array.isArray(data.tasks) || !data.tasks.length) {
        toast({
          variant:     'destructive',
          title:       'No tasks generated',
          description: data?.error || 'The server returned no usable tasks. Try again.',
        });
        setIsLoading(false);
        return;
      }

      setTasks(mapApiTasks(data.tasks, dailyMinutes));
    } catch (e) {
      toast({
        variant:     'destructive',
        title:       'Cannot reach server',
        description: e?.message || 'Start the Python backend (python3 server.py) on port 8787, then retry.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTasks(null);
    setGoalText('');
    setStartDate(null);
  };

  return (
    <div className="min-h-screen bg-transparent relative">
      <MatrixRainBg intensity={STOIX_MATRIX_INTENSITY} speed={STOIX_MATRIX_SPEED} />

      <div className="relative z-10 min-h-screen flex flex-col">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="py-6 px-6 sm:px-12"
        >
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => goBackNavigate(navigate)}
              className="shrink-0 -ml-1 mt-0.5 border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:text-primary backdrop-blur-none"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-mono text-xl sm:text-2xl text-glow-strong tracking-widest">
                STOIX // RED PILL
              </h1>
              <p className="font-mono text-xs text-primary/70 mt-1 tracking-wider">
                Evidence-style protocol — cloud open models (OpenRouter) or Ollama + daily micro-tasks.
              </p>
            </div>
          </div>
        </motion.header>

        <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pb-24 sm:pb-28 pt-4 sm:pt-8 overflow-x-hidden">
          {!tasks ? (
            <GoalForm onSubmit={generateTasks} isLoading={isLoading} />
          ) : (
            <TaskCalendar
              tasks={tasks}
              goal={goalText}
              startDate={startDate}
              onReset={handleReset}
            />
          )}
        </main>

        <footer className="py-4 px-6 text-center">
          <p className="font-mono text-xs text-primary/45">
            The path shapes the protocol.
          </p>
        </footer>
      </div>
    </div>
  );
}
