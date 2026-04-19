import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, RotateCcw,
  Clock, Target, Calendar,
} from 'lucide-react';
import {
  format, addDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, getDay,
} from 'date-fns';

// Phase → colour mapping (stays in the green/red/amber terminal palette)
const PHASE_COLORS = {
  Foundation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  Build:      'bg-primary/20 text-primary border-primary/40',
  Push:       'bg-amber-500/20 text-amber-400 border-amber-500/40',
  Mastery:    'bg-red-500/20 text-red-400 border-red-500/40',
};

function parsePlanStart(startDate) {
  if (startDate == null) return new Date();
  return new Date(startDate);
}

export default function TaskCalendar({ tasks, goal, startDate, onReset }) {
  const planStart = useMemo(() => parsePlanStart(startDate), [startDate]);
  const allDates  = tasks.map((_, i) => addDays(planStart, i));

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(parsePlanStart(startDate)));
  const [selectedDay,  setSelectedDay]  = useState(() => parsePlanStart(startDate));

  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end:   endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const startDow = getDay(startOfMonth(currentMonth));

  const getTaskForDate = (date) => {
    const idx = allDates.findIndex(d => isSameDay(d, date));
    return idx >= 0 ? { ...tasks[idx], dayNumber: idx + 1 } : null;
  };

  const selectedTask = getTaskForDate(selectedDay);

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handleDownloadIcs = () => {
    const escapeIcsText = (s) =>
      String(s || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\n|\r/g, '\\n');

    const parseDurationMinutes = (durationStr) => {
      const m = String(durationStr || '').match(/(\d+)/);
      if (!m) return 30;
      return Math.min(480, Math.max(5, parseInt(m[1], 10)));
    };

    const parseClockOnDay = (dayDate, hhmm) => {
      const d = new Date(dayDate);
      const m = String(hhmm || '09:00').trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!m) {
        d.setHours(9, 0, 0, 0);
        return d;
      }
      d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
      return d;
    };

    const toUtcStamp = (d) => {
      const iso = d.toISOString();
      return `${iso.slice(0, 10).replace(/-/g, '')}T${iso.slice(11, 19).replace(/:/g, '')}Z`;
    };

    const stampNow = toUtcStamp(new Date());

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//STOIX//Red Pill//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    tasks.forEach((task, i) => {
      const dayDate = addDays(planStart, i);
      const start = parseClockOnDay(dayDate, task.scheduledTime);
      const mins = parseDurationMinutes(task.duration);
      const end = new Date(start.getTime() + mins * 60 * 1000);
      const uid = `stoix-${format(dayDate, 'yyyyMMdd')}-${i}-${Math.random().toString(36).slice(2, 10)}@stoix.local`;
      const summary = escapeIcsText(task.title);
      const descParts = [
        task.description,
        task.phase && `Phase: ${task.phase}`,
        task.milestone && `Milestone: ${task.milestone}`,
        task.scheduleNote && `Schedule: ${task.scheduleNote}`,
        `Day ${i + 1} of ${tasks.length} · ${goal}`,
      ].filter(Boolean);
      const description = escapeIcsText(descParts.join('\\n'));

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${stampNow}`);
      lines.push(`DTSTART:${toUtcStamp(start)}`);
      lines.push(`DTEND:${toUtcStamp(end)}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DESCRIPTION:${description}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    const ics = lines.join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stoix-protocol-${format(new Date(), 'yyyy-MM-dd')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-mono text-glow">Protocol active</h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            {tasks.length} days &middot;{' '}
            {goal.length > 60 ? goal.slice(0, 60) + '…' : goal}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadIcs}
            variant="outline"
            className="font-mono border-border text-foreground hover:bg-accent gap-2"
          >
            <Calendar className="w-4 h-4" /> Download .ics
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="font-mono border-border text-foreground hover:bg-accent gap-2"
          >
            <RotateCcw className="w-4 h-4" /> New Mission
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Month calendar ── */}
        <div className="lg:col-span-2 border border-border border-glow rounded-lg p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="text-foreground hover:bg-accent">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h3 className="font-mono text-lg text-glow">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="text-foreground hover:bg-accent">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(d => (
              <div key={d} className="text-center font-mono text-xs text-muted-foreground py-2">{d}</div>
            ))}

            {Array(startDow).fill(null).map((_, i) => <div key={`e-${i}`} />)}

            {monthDays.map(day => {
              const task       = getTaskForDate(day);
              const isSelected = isSameDay(day, selectedDay);
              const hasTask    = !!task;
              const phaseClass = task ? PHASE_COLORS[task.phase] || PHASE_COLORS.Build : '';

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasTask && setSelectedDay(day)}
                  disabled={!hasTask}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded font-mono text-sm transition-all duration-200
                    ${hasTask ? 'cursor-pointer hover:bg-primary/20' : 'opacity-30 cursor-default'}
                    ${isSelected && hasTask ? 'bg-primary/30 border border-primary text-foreground' : ''}
                    ${hasTask && !isSelected ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {hasTask && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full border ${phaseClass}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Phase legend */}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3">
            {Object.entries(PHASE_COLORS).map(([phase, cls]) => (
              <span key={phase} className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
                {phase}
              </span>
            ))}
          </div>
        </div>

        {/* ── Task detail panel ── */}
        <div className="border border-border border-glow rounded-lg p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
          {selectedTask ? (
            <motion.div
              key={selectedDay.toISOString()}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Day + date */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">
                  Day {selectedTask.dayNumber}
                </Badge>
                {selectedTask.phase && (
                  <Badge className={`font-mono border ${PHASE_COLORS[selectedTask.phase] || PHASE_COLORS.Build}`}>
                    {selectedTask.phase}
                  </Badge>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {format(selectedDay, 'EEE, MMM d, yyyy')}
                </span>
              </div>

              {/* Scheduled time */}
              {selectedTask.scheduledTime && (
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{selectedTask.scheduledTime}</span>
                  {selectedTask.duration && <span>· {selectedTask.duration}</span>}
                </div>
              )}

              {/* Milestone */}
              {selectedTask.milestone && (
                <div className="flex items-start gap-2 text-xs font-mono">
                  <Target className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{selectedTask.milestone}</span>
                </div>
              )}

              {/* Title */}
              <h3 className="font-mono text-lg text-glow leading-snug">
                {selectedTask.title}
              </h3>

              {/* Description */}
              <p className="font-mono text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {selectedTask.description}
              </p>

              {/* Schedule note */}
              {selectedTask.scheduleNote && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-start gap-2 text-xs font-mono text-muted-foreground/70">
                    <Calendar className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary/60" />
                    <span className="italic">{selectedTask.scheduleNote}</span>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="font-mono text-sm text-muted-foreground text-center">
                Select a day on the calendar<br />to view its task
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── All-days list (mobile-friendly) ── */}
      <div className="mt-6 border border-border border-glow rounded-lg bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <h3 className="font-mono text-lg text-glow">All days</h3>
          <span className="font-mono text-xs text-muted-foreground">{tasks.length} tasks</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {tasks.map((task, i) => {
            const phaseClass  = PHASE_COLORS[task.phase] || PHASE_COLORS.Build;
            const isActive    = selectedTask?.dayNumber === i + 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 1) }}
                className={`p-4 border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors ${isActive ? 'bg-primary/10' : ''}`}
                onClick={() => setSelectedDay(addDays(planStart, i))}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 min-w-[50px]">
                    <span className="font-mono text-xs text-muted-foreground">Day {i + 1}</span>
                    {task.scheduledTime && (
                      <span className="font-mono text-[10px] text-primary/70">{task.scheduledTime}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-mono text-sm text-foreground truncate">{task.title}</p>
                      {task.phase && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${phaseClass}`}>
                          {task.phase}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {format(addDays(planStart, i), 'MMM d')}
                      {task.duration && ` · ${task.duration}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
