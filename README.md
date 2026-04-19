# STOIX // Red Pill

Evidence-style protocol generator. User enters a goal + timeline; the backend
calls **OpenRouter** (cloud API — open-weight and other chat models) using
`OPENROUTER_API_KEY`, or falls back to **Ollama** locally if the key is unset.
It synthesizes high-leverage practices, then decomposes the objective into
prerequisites, milestones, and a final outcome — one concrete micro-task per day
within the minute budget.

## Setup (macOS)

1. **Install Python 3** (if you don't already have it):
   - Download from https://www.python.org/downloads/macos/
   - Run the installer, open a new terminal

2. **Configure the LLM** — copy `.env.example` to `.env`, then either:
   - **Cloud (recommended):** add `OPENROUTER_API_KEY` from [OpenRouter](https://openrouter.ai). Defaults use strong open instruct models (see `.env.example`).
   - **Local only:** leave `OPENROUTER_API_KEY` empty, install [Ollama](https://ollama.com), run `ollama pull qwen2.5:7b` (and `llava` for calendar screenshots), and keep `ollama serve` running.

3. **Build the Base44 (Vite) UI** (needed whenever you change the React app; produces `cordial-matrix-logic-lab-2 4/dist/`):
   ```bash
   cd "cordial-matrix-logic-lab-2 4"
   npm install
   npm run build
   ```
   Or from the **repo root**: `npm run build` (runs the UI build via the root `package.json`).

4. **Run the server** — Python serves the **React app at `/`** and **`/api/generate-tasks`** (OpenRouter or Ollama) on the same port:
   ```bash
   cd ..   # back to repo root if you were in cordial-matrix-logic-lab-2 4
   python3 server.py
   ```

5. **Open** http://localhost:8787 in your browser (intro → pill choice → `/protocol` for the red-pill flow; `fetch("/api/generate-tasks")` is same-origin).

**Optional — Vite dev server** (hot reload): from the **repo root**, run **`npm install`** once, then **`npm run stoix:restart`** — that **stops** anything on ports **8787** and **5173**, then starts **`server.py`** and **Vite** together (one terminal; **Ctrl+C** stops both). Open the URL Vite prints (e.g. http://localhost:5173). Vite **proxies `/api`** to Python (`vite.config.js` uses `VITE_STOIX_API_ORIGIN` if set, otherwise `http://127.0.0.1:8787`). The UI calls `server.py` via `stoixApiUrl('/api/generate-tasks')` in `Protocol.jsx`. See **`AGENTS.md`** for the “restart after changes” workflow.

With `VITE_BASE44_APP_ID` unset, the app skips Base44 cloud auth and uses the local STOIX API only. To use Base44 hosting again, set `VITE_BASE44_APP_ID` (and related vars) in `cordial-matrix-logic-lab-2 4/.env.local` and set `VITE_STOIX_LOCAL=false`.

Press `Ctrl+C` in the terminal to stop `server.py`.

## How the LLM pipeline works

**Pass 1 — Research** (OpenRouter or Ollama chat)
Gathers proven methods, named techniques, common mistakes, and realistic
milestones from the model's knowledge (no live web search).

**Pass 2 — Decomposition & Daily Micro-Tasks** (JSON mode)
Using Pass 1 as context, decomposes the goal into:
- Foundational prerequisites
- Intermediate milestones
- Final execution outcome

Then produces exactly one concrete, sequenced micro-task per day.
Every task references specific techniques from the research and fits
the user's daily minute budget.

**Fallback**: If no API key and Ollama is down, or generation fails, the server
returns a built-in offline task ladder.

## Files

- `cordial-matrix-logic-lab-2 4/` — Base44 (Vite + React) UI; `npm run build` writes `dist/`, which `server.py` serves at `/`
- `index.html`, `styles.css`, `redpill.js`, `matrix.js` — legacy vanilla UI (still in repo; not used at `/` once `dist/` exists)
- `server.py` — Python stdlib HTTP server + OpenRouter/Ollama pipeline + static SPA from `dist/`
- `.env` — OpenRouter key + model IDs (or Ollama settings); gitignored

## Notes

- Uses only Python standard library — no `pip install` required.
- Pipeline runtime depends on provider, model size, and day count (cloud is often faster than a small local model).
- Tasks respect the 5–60 minute daily budget strictly.
