import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import GoalForm from '../components/matrix/GoalForm';
import TaskCalendar from '../components/matrix/TaskCalendar';
import { format, addDays } from 'date-fns';

export default function Home() {
  const [tasks, setTasks] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateTasks = async ({ goal, days }) => {
    setIsLoading(true);
    setGoalText(goal);

    const today = new Date();
    setStartDate(today.toISOString());

    const prompt = `You are a strategic life coach and behavioral psychologist. A user wants to achieve this goal: "${goal}" within ${days} days starting from ${format(today, 'MMMM d, yyyy')}.

Your job: Create exactly ${days} daily micro-tasks. Each task should:
- Appear trivially easy and take 5-30 minutes
- Be so small that the user thinks "this barely matters"
- But actually be strategically designed to build compound progress
- Each task builds invisibly on previous ones
- Use progressive overload: start extremely easy, gradually increase complexity
- Include variety to prevent burnout
- Mix theory, practice, reflection, and social elements

For example, if the goal is "learn guitar": Day 1 might be "Hold the guitar for 5 minutes while watching TV" — seemingly pointless, but it builds physical comfort with the instrument.

Return a JSON object with a "tasks" array of exactly ${days} objects, each with:
- "title": short task name (max 60 chars)
- "description": 1-2 sentences explaining what to do (make it feel easy and casual)
- "duration": estimated time like "5 min", "15 min", "20 min"`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                duration: { type: "string" }
              }
            }
          }
        }
      },
      model: "claude_sonnet_4_6"
    });

    setTasks(result.tasks || []);
    setIsLoading(false);
  };

  const handleReset = () => {
    setTasks(null);
    setGoalText('');
    setStartDate(null);
  };

  return (
    <div className="min-h-screen bg-background relative scanline-overlay">
      <MatrixRainBg intensity={0.5} speed={0.4} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="py-6 px-6 sm:px-12"
        >
          <h1 className="font-mono text-xl sm:text-2xl text-glow-strong tracking-widest">
            THE MATRIX PLANNER
          </h1>
          <p className="font-mono text-xs text-muted-foreground mt-1 tracking-wider">
            There is no spoon. Only the path.
          </p>
        </motion.header>

        {/* Main content */}
        <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pb-12 pt-4 sm:pt-8">
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

        {/* Footer */}
        <footer className="py-4 px-6 text-center">
          <p className="font-mono text-xs text-muted-foreground/50">
            Free your mind.
          </p>
        </footer>
      </div>
    </div>
  );
}