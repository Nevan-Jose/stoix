import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from 'date-fns';

export default function TaskCalendar({ tasks, goal, startDate, onReset }) {
  const allDates = tasks.map((_, i) => addDays(new Date(startDate), i));
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date(startDate)));
  const [selectedDay, setSelectedDay] = useState(new Date(startDate));

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDow = getDay(startOfMonth(currentMonth));

  const getTaskForDate = (date) => {
    const idx = allDates.findIndex(d => isSameDay(d, date));
    return idx >= 0 ? { ...tasks[idx], dayNumber: idx + 1 } : null;
  };

  const selectedTask = getTaskForDate(selectedDay);

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handleDownload = () => {
    let csv = 'Day,Date,Task,Details,Duration\n';
    tasks.forEach((task, i) => {
      const date = format(addDays(new Date(startDate), i), 'yyyy-MM-dd');
      const safeTitle = `"${(task.title || '').replace(/"/g, '""')}"`;
      const safeDesc = `"${(task.description || '').replace(/"/g, '""')}"`;
      const duration = task.duration || '';
      csv += `${i + 1},${date},${safeTitle},${safeDesc},${duration}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrix-plan-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-mono text-glow">
            Your Path is Constructed
          </h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            {tasks.length} days &middot; {goal.length > 60 ? goal.slice(0, 60) + '...' : goal}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="font-mono border-border text-foreground hover:bg-accent gap-2"
          >
            <Download className="w-4 h-4" /> Download CSV
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
        {/* Calendar */}
        <div className="lg:col-span-2 border border-border border-glow rounded-lg p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
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

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(d => (
              <div key={d} className="text-center font-mono text-xs text-muted-foreground py-2">
                {d}
              </div>
            ))}

            {Array(startDow).fill(null).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {monthDays.map(day => {
              const task = getTaskForDate(day);
              const isSelected = isSameDay(day, selectedDay);
              const hasTask = !!task;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasTask && setSelectedDay(day)}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded font-mono text-sm transition-all duration-200
                    ${hasTask ? 'cursor-pointer hover:bg-primary/20' : 'opacity-30 cursor-default'}
                    ${isSelected && hasTask ? 'bg-primary/30 border border-primary text-foreground' : ''}
                    ${hasTask && !isSelected ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                  disabled={!hasTask}
                >
                  <span>{format(day, 'd')}</span>
                  {hasTask && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Detail */}
        <div className="border border-border border-glow rounded-lg p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
          {selectedTask ? (
            <motion.div
              key={selectedDay.toISOString()}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">
                  Day {selectedTask.dayNumber}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {format(selectedDay, 'MMM d, yyyy')}
                </span>
              </div>

              <h3 className="font-mono text-lg text-glow leading-snug">
                {selectedTask.title}
              </h3>

              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                {selectedTask.description}
              </p>

              {selectedTask.duration && (
                <div className="pt-2 border-t border-border">
                  <span className="font-mono text-xs text-muted-foreground">
                    ⏱ Estimated: {selectedTask.duration}
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="font-mono text-sm text-muted-foreground text-center">
                Select a day on the calendar to view its task
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task list below for mobile */}
      <div className="mt-6 border border-border border-glow rounded-lg bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-mono text-lg text-glow">All Tasks</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {tasks.map((task, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 1) }}
              className={`p-4 border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors ${
                selectedTask?.dayNumber === i + 1 ? 'bg-primary/10' : ''
              }`}
              onClick={() => setSelectedDay(addDays(new Date(startDate), i))}
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs text-muted-foreground min-w-[50px]">
                  Day {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-foreground truncate">
                    {task.title}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {format(addDays(new Date(startDate), i), 'MMM d')}
                    {task.duration && ` · ${task.duration}`}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}