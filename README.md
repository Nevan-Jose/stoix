# STOIX // Red Pill

AI-researched, evidence-based protocol generator. User enters a goal + timeline;
the backend uses **Google Gemini with live web search grounding** to research
proven, high-leverage practices for that specific goal, then decomposes the
objective into foundational prerequisites, intermediate milestones, and a
final outcome — and generates exactly one concrete micro-task per day that
fits the user's daily minute budget.

## Setup (macOS)

1. **Install Python 3** (if you don't already have it):
   - Download from https://www.python.org/downloads/macos/
   - Run the installer, open a new terminal

2. **Your API key is already in `.env`.** If you want to change it, edit that file.

3. **Run the server:**
   ```bash
   python3 server.py
   ```

4. **Open** http://localhost:8787 in your browser.

Press `Ctrl+C` in the terminal to stop.

## How the AI pipeline works

**Pass 1 — Research** (Gemini + Google Search grounding)
Gathers proven methods, evidence-based practices, named techniques,
common mistakes, and realistic milestones for the user's specific goal
using live web search.

**Pass 2 — Decomposition & Daily Micro-Tasks** (Gemini JSON mode)
Using Pass 1 as context, decomposes the goal into:
- Foundational prerequisites
- Intermediate milestones
- Final execution outcome

Then produces exactly one concrete, sequenced micro-task per day.
Every task references specific techniques from the research and fits
the user's daily minute budget.

**Silent fallback**: If the API call fails (no key, network error, rate
limit), the frontend silently falls back to its rule-based template plan
so the user always gets something usable.

## Files

- `index.html`, `styles.css` — UI
- `matrix.js` — water-smooth Matrix digital rain
- `redpill.js` — flow logic, AI fetch, fallback generator, .ics export
- `server.py` — Python stdlib HTTP server + Gemini pipeline
- `.env` — API key (gitignored)

## Notes

- Uses only Python standard library — no `pip install` required.
- Deep 2-pass pipeline takes ~20-45 seconds depending on goal complexity.
- Tasks respect the 5–60 minute daily budget strictly.
