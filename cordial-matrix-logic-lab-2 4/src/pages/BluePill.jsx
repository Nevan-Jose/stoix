import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MatrixRainBg from '../components/matrix/MatrixRainBg';
import { ArrowLeft } from 'lucide-react';

export default function BluePill() {
  return (
    <div className="min-h-screen bg-background relative">
      <MatrixRainBg intensity={0.35} speed={0.35} />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-xl border border-border border-glow rounded-lg p-8 sm:p-10 bg-card/85 backdrop-blur-sm"
        >
          <p className="font-mono text-xs text-primary/80 tracking-widest mb-3">
            [ BLUE PILL — SIDE QUESTS ]
          </p>
          <h1 className="font-mono text-2xl sm:text-3xl text-glow mb-4">Not yet awakened</h1>
          <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-8">
            The Blue Pill path — Skill Learning and Side Questing — is under construction. When it
            opens, you&apos;ll be able to branch into a generated learning roadmap or discover
            real-world activities tailored to your location, budget, and time.
          </p>

          <div className="space-y-4 mb-10">
            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0" aria-hidden>
                📚
              </span>
              <div>
                <p className="font-mono text-sm text-foreground font-medium">Skill Learning</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Pick a skill, pick a timeframe, follow a progressive roadmap.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0" aria-hidden>
                🎯
              </span>
              <div>
                <p className="font-mono text-sm text-foreground font-medium">Side Questing</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Curated real-world activities based on where you are and what you have.
                </p>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="font-mono border-border gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back to choice
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
