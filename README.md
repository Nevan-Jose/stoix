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

3. **Build the Base44 (Vite) UI** (needed whenever you change the React app; produces `cordial-matrix-logic-lab-2 4/dist/`):
   ```bash
   cd "cordial-matrix-logic-lab-2 4"
   npm install
   npm run build
   ```

4. **Run the server** — Python serves the **React app at `/`** and the **Gemini API** on the same port (`/api/*`):
   ```bash
   cd ..   # back to repo root if you were in cordial-matrix-logic-lab-2 4
   python3 server.py
   ```

5. **Open** http://localhost:8787 in your browser (intro → pill choice → `/protocol` for the red-pill flow; `fetch("/api/generate-tasks")` is same-origin).

**Optional — Vite dev server** (hot reload; proxies `/api` to Python on 8787): run `python3 server.py` in one terminal and `npm run dev` in `cordial-matrix-logic-lab-2 4/` in another, then open the URL Vite prints (e.g. http://localhost:5173).

With `VITE_BASE44_APP_ID` unset, the app skips Base44 cloud auth and uses the local STOIX API only. To use Base44 hosting again, set `VITE_BASE44_APP_ID` (and related vars) in `cordial-matrix-logic-lab-2 4/.env.local` and set `VITE_STOIX_LOCAL=false`.

Press `Ctrl+C` in the terminal to stop `server.py`.

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

- `cordial-matrix-logic-lab-2 4/` — Base44 (Vite + React) UI; `npm run build` writes `dist/`, which `server.py` serves at `/`
- `index.html`, `styles.css`, `redpill.js`, `matrix.js` — legacy vanilla UI (still in repo; not used at `/` once `dist/` exists)
- `server.py` — Python stdlib HTTP server + Gemini pipeline + static SPA from `dist/`
- `.env` — API key (gitignored)

## Notes

- Uses only Python standard library — no `pip install` required.
- Deep 2-pass pipeline takes ~20-45 seconds depending on goal complexity.
- Tasks respect the 5–60 minute daily budget strictly.
