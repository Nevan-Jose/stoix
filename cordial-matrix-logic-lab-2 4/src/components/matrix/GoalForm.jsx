import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function GoalForm({ onSubmit, isLoading }) {
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!goal.trim() || !days) return;
    onSubmit({ goal: goal.trim(), days: parseInt(days) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="border border-border border-glow rounded-lg p-6 sm:p-8 bg-card/80 backdrop-blur-sm">
        <h2 className="text-2xl sm:text-3xl font-mono text-glow mb-2">
          What is your mission?
        </h2>
        <p className="text-muted-foreground font-mono text-sm mb-8">
          Tell me your goal. I will construct a path of invisible steps that will lead you there.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="font-mono text-foreground text-sm tracking-wider uppercase">
              {'> '}Target objective
            </Label>
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Learn to play guitar fluently..."
              className="bg-background border-border font-mono text-foreground placeholder:text-muted-foreground/50 min-h-[100px] resize-none focus:border-primary focus:ring-primary/30"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-foreground text-sm tracking-wider uppercase">
              {'> '}Time limit (days)
            </Label>
            <Input
              type="number"
              min="7"
              max="365"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="e.g. 90"
              className="bg-background border-border font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/30"
              disabled={isLoading}
            />
            <p className="text-xs font-mono text-muted-foreground">
              Minimum 7 days. Maximum 365 days.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!goal.trim() || !days || parseInt(days) < 7 || isLoading}
            className="w-full font-mono text-lg tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/80 border border-primary/50 transition-all duration-300 h-12"
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Constructing your path...
              </span>
            ) : (
              '[ INITIATE ]'
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}