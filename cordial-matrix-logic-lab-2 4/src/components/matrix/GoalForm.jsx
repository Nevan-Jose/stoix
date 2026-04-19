import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Paperclip, X, Calendar, Image } from 'lucide-react';

// ---- helpers ----
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---- GoalForm ----
// Props:
//   onSubmit({ goal, days, dailyMinutes, calendar, startTime }) → void
//   isLoading: boolean
export default function GoalForm({ onSubmit, isLoading }) {
  const [goal, setGoal]               = useState('');
  const [days, setDays]               = useState('');
  const [dailyMinutes, setDailyMinutes] = useState('30');
  /** Shown when calendar data is attached — sent as startTime (HH:MM) to the API. */
  const [preferredStartTime, setPreferredStartTime] = useState('09:00');

  // Calendar attachments state
  const [calImages, setCalImages]   = useState([]); // [{ name, mime, dataURL }]
  const [calIcs, setCalIcs]         = useState(null); // { name, text, size }
  const [calTab, setCalTab]         = useState('images'); // 'images' | 'ics' | 'none'
  const [isDragging, setIsDragging] = useState(false);

  const imageInputRef = useRef(null);
  const icsInputRef   = useRef(null);

  // Ingest a file into the appropriate slot
  const ingestFile = useCallback(async (file) => {
    if (!file) return;
    const isImage = file.type && file.type.startsWith('image/');
    const isICS   = /\.ics$/i.test(file.name) || file.type === 'text/calendar';

    if (isImage) {
      if (calImages.length >= 5) return;
      const dataURL = await fileToDataURL(file);
      setCalImages(prev => [...prev, { name: file.name || 'image.png', mime: file.type || 'image/png', dataURL }]);
      setCalTab('images');
    } else if (isICS) {
      const text = await file.text();
      setCalIcs({ name: file.name || 'calendar.ics', text, size: file.size || text.length });
      setCalTab('ics');
    }
  }, [calImages.length]);

  const handleImageInput = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await ingestFile(f);
    e.target.value = '';
  };

  const handleICSInput = async (e) => {
    const file = (e.target.files || [])[0];
    if (file) await ingestFile(file);
    e.target.value = '';
  };

  const handlePaste = async (e) => {
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    let used = false;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) { used = true; await ingestFile(file); }
      }
    }
    if (used) e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    for (const f of files) await ingestFile(f);
  };

  const removeImage = (idx) => setCalImages(prev => prev.filter((_, i) => i !== idx));
  const removeICS   = () => setCalIcs(null);

  // Build the calendar payload
  const buildCalendarPayload = () => {
    if (calTab === 'images' && calImages.length > 0) {
      return {
        type: 'images',
        images: calImages.map(i => ({
          name:   i.name,
          mime:   i.mime,
          base64: i.dataURL.split(',')[1] || '',
        })),
      };
    }
    if (calTab === 'ics' && calIcs) {
      return { type: 'ics', name: calIcs.name, text: calIcs.text };
    }
    return { type: 'none' };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!goal.trim() || !days) return;
    const dm = parseInt(dailyMinutes, 10);
    onSubmit({
      goal:         goal.trim(),
      days:         parseInt(days, 10),
      dailyMinutes: Number.isFinite(dm) ? dm : 30,
      calendar:     buildCalendarPayload(),
      startTime:    preferredStartTime || '09:00',
    });
  };

  const hasAttachments = calImages.length > 0 || calIcs !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="border border-border border-glow rounded-lg p-6 sm:p-8 bg-card/80 backdrop-blur-sm">
        <p className="font-mono text-xs text-primary/80 tracking-widest mb-2">
          [ PROTOCOL INITIALIZATION ]
        </p>
        <h2 className="text-2xl sm:text-3xl font-mono text-glow mb-2">
          What is your mission?
        </h2>
        <p className="text-muted-foreground font-mono text-sm mb-8">
          State your objective and timeline. STOIX builds a sequenced daily protocol toward it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal input with paste + drag support */}
          <div className="space-y-2">
            <Label className="font-mono text-foreground text-sm tracking-wider uppercase">
              {'> '}Target objective
            </Label>
            <div
              className={`relative ${isDragging ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md' : ''}`}
              onDragEnter={() => setIsDragging(true)}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
              onDrop={handleDrop}
            >
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onPaste={handlePaste}
                placeholder="e.g. Learn to play guitar fluently..."
                className="bg-background border-border font-mono text-foreground placeholder:text-muted-foreground/50 min-h-[100px] resize-none focus:border-primary focus:ring-primary/30 pr-12"
                disabled={isLoading}
              />
              {/* Paperclip attach button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="absolute top-2 right-2 p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Attach calendar image or .ics — or paste with Cmd+V"
                aria-label="Attach calendar file"
                disabled={isLoading}
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Optional: paste or drop your calendar screenshot to schedule tasks around your real availability.
            </p>
          </div>

          {/* Calendar upload tabs */}
          <div className="space-y-3">
            <Label className="font-mono text-foreground text-sm tracking-wider uppercase flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Calendar (optional)
            </Label>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-background border border-border rounded p-1 w-fit">
              {[
                { key: 'images', icon: <Image className="w-3 h-3" />, label: 'Images' },
                { key: 'ics',    icon: <Calendar className="w-3 h-3" />, label: '.ics' },
                { key: 'none',   icon: null, label: 'Skip' },
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCalTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                    calTab === key
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={isLoading}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Images tab */}
            {calTab === 'images' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading || calImages.length >= 5}
                >
                  <Paperclip className="w-4 h-4 mx-auto mb-1 opacity-60" />
                  Click to upload calendar screenshot(s)
                  <br />
                  <span className="opacity-60">PNG / JPG · up to 5 · or paste Cmd+V</span>
                </button>
                {calImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {calImages.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded border border-border overflow-hidden bg-background">
                        <img src={img.dataURL} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          aria-label="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ICS tab */}
            {calTab === 'ics' && (
              <div className="space-y-2">
                {!calIcs ? (
                  <button
                    type="button"
                    onClick={() => icsInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    <Calendar className="w-4 h-4 mx-auto mb-1 opacity-60" />
                    Click to upload .ics calendar file
                    <br />
                    <span className="opacity-60">Exported from Apple / Google / Outlook Calendar</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-3 border border-primary/30 bg-primary/5 rounded text-xs font-mono">
                    <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="flex-1 truncate text-foreground">{calIcs.name}</span>
                    <span className="text-muted-foreground">{Math.max(1, Math.round(calIcs.size / 1024))} KB</span>
                    <button type="button" onClick={removeICS} className="text-muted-foreground hover:text-red-400 transition-colors" aria-label="Remove">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Skip tab */}
            {calTab === 'none' && (
              <p className="text-xs font-mono text-muted-foreground border border-border/50 rounded p-3">
                No calendar provided. All tasks will be scheduled at 09:00 by default.
              </p>
            )}
          </div>

          {/* Hidden file inputs */}
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageInput} />
          <input ref={icsInputRef}   type="file" accept=".ics,text/calendar" hidden onChange={handleICSInput} />

          {hasAttachments && (
            <div className="space-y-2 border border-primary/25 rounded-lg p-4 bg-primary/5">
              <Label className="font-mono text-foreground text-sm tracking-wider uppercase">
                {'> '}Preferred daily task time
              </Label>
              <Input
                type="time"
                step={60}
                value={preferredStartTime}
                onChange={(e) => setPreferredStartTime(e.target.value || '09:00')}
                className="bg-background border-border font-mono text-foreground max-w-[200px] focus:border-primary focus:ring-primary/30"
                disabled={isLoading}
              />
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                STOIX tries to use this same clock time on every day your protocol runs. If your calendar blocks that
                window on specific weekdays only, the model picks the most practical alternative on{' '}
                <span className="text-foreground/90">those days only</span> (for example right after a class ends),
                without shifting unrelated days.
              </p>
            </div>
          )}

          {/* Days */}
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

          {/* Daily minutes */}
          <div className="space-y-2">
            <Label className="font-mono text-foreground text-sm tracking-wider uppercase">
              {'> '}Daily time budget (minutes)
            </Label>
            <Input
              type="number"
              min="5"
              max="60"
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(e.target.value)}
              placeholder="e.g. 30"
              className="bg-background border-border font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/30"
              disabled={isLoading}
            />
            <p className="text-xs font-mono text-muted-foreground">
              Each micro-task must fit in this window (5–60 minutes).
            </p>
          </div>

          <Button
            type="submit"
            disabled={
              !goal.trim() ||
              !days ||
              parseInt(days, 10) < 7 ||
              parseInt(dailyMinutes, 10) < 5 ||
              parseInt(dailyMinutes, 10) > 60 ||
              isLoading
            }
            className="w-full font-mono text-lg tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/80 border border-primary/50 transition-all duration-300 h-12"
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Researching + constructing your protocol...
              </span>
            ) : (
              `[ INITIATE${hasAttachments ? ' WITH CALENDAR' : ''} ]`
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
