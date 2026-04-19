#!/usr/bin/env python3
"""
STOIX // Red Pill — local Python backend (stdlib only, no pip needed).

Pipeline for /api/generate-tasks:

  PASS 1 (RESEARCH) — Gemini with Google Search grounding
      Gather evidence-based practices, proven methods, common mistakes,
      and real-world techniques for the user's specific goal.

  PASS 2 (DECOMPOSITION + DAILY MINI-TASKS) — Gemini JSON output
      Using Pass 1 as context, decompose the goal into:
        - Foundational prerequisites
        - Intermediate milestones
        - Final execution outcome
      Then generate exactly N concrete, sequenced, daily micro-tasks
      that each fit within the user's daily minute budget.

If either pass fails, the endpoint returns ok=False and the frontend
silently falls back to its rule-based template plan.
"""

import json
import os
import re
import sys
import mimetypes
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# Base44 (Vite) React UI — `npm run build` in `cordial-matrix-logic-lab-2 4/`
FRONTEND_DIST = (ROOT / "cordial-matrix-logic-lab-2 4" / "dist").resolve()

STATIC_SUFFIXES = frozenset(
    {
        ".js",
        ".css",
        ".map",
        ".ico",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".woff",
        ".woff2",
        ".ttf",
        ".json",
        ".webmanifest",
        ".txt",
    }
)


def _is_probable_asset_request(rel: str) -> bool:
    """Paths that should 404 if missing (do not SPA-fallback to index.html)."""
    if not rel:
        return False
    p = Path(rel)
    suf = p.suffix.lower()
    if suf in STATIC_SUFFIXES:
        return True
    return bool(p.parts) and p.parts[0] == "assets"


def _send_static_file(handler: BaseHTTPRequestHandler, file_path: Path) -> None:
    mime, _ = mimetypes.guess_type(str(file_path))
    data = file_path.read_bytes()
    handler.send_response(200)
    handler.send_header("Content-Type", mime or "application/octet-stream")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def _serve_built_frontend(handler: BaseHTTPRequestHandler, url_path: str) -> bool:
    """
    Serve the Vite production build (Base44 template UI) when dist/ exists.
    Returns True if the response was fully handled (including 403/404).
    Returns False if dist is not available (caller may fall back to legacy static).
    """
    if not FRONTEND_DIST.is_dir():
        return False
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.is_file():
        return False

    rel = url_path.strip("/")

    if not rel:
        _send_static_file(handler, index_file)
        return True

    candidate = (FRONTEND_DIST / rel).resolve()
    try:
        candidate.relative_to(FRONTEND_DIST)
    except ValueError:
        handler.send_error(403, "Forbidden")
        return True

    if candidate.is_file():
        _send_static_file(handler, candidate)
        return True

    if _is_probable_asset_request(rel):
        handler.send_error(404, "Not found")
        return True

    _send_static_file(handler, index_file)
    return True


# ---------- Load .env ----------
def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$", line, re.I)
        if not m:
            continue
        key, val = m.group(1), m.group(2)
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        os.environ.setdefault(key, val)


load_env()

PORT = int(os.environ.get("PORT", "8787"))
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
# Gemini 2.5 Flash is fast + supports google_search grounding.
# You can override via .env if you want Pro for higher quality.
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)


# Models tried in order. If the primary is overloaded (503) or rate-limited
# (429), we automatically fall through to the next one. gemini-2.0-flash is
# a stable backup that supports google_search grounding.
FALLBACK_MODELS = [
    MODEL,
    "gemini-2.0-flash",
    "gemini-2.5-pro",
]

# HTTP status codes worth retrying (transient service issues)
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _post_gemini(model: str, body: dict, timeout: int = 120) -> dict:
    url = GEMINI_URL.format(model=model, key=GEMINI_API_KEY)
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------- Gemini helper ----------
def call_gemini(prompt, *, grounding=False, want_json=False, images=None):
    """
    Calls Gemini REST API with automatic retry + model fallback.

    - grounding=True enables google_search tool (real web research).
    - want_json=True forces JSON output mode (no grounding tool — Gemini
      cannot combine google_search with response_mime_type=application/json).
    - images: optional list of {"mime": "image/png", "base64": "..."} dicts
      for vision input (e.g. calendar screenshots).

    Retry policy:
      * Try each model in FALLBACK_MODELS in order.
      * For each model, retry up to 3 times on transient 429/5xx errors
        with exponential backoff (1s, 2s, 4s).
      * If all models exhausted, raise the last error.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")

    # Build multi-modal content parts
    parts = [{"text": prompt}]
    for img in images or []:
        parts.append({
            "inline_data": {
                "mime_type": img.get("mime", "image/png"),
                "data": img.get("base64", ""),
            }
        })

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 16384,
        },
    }
    if want_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    if grounding:
        body["tools"] = [{"google_search": {}}]

    import time
    last_err = "no attempts"

    for model in FALLBACK_MODELS:
        for attempt in range(3):
            try:
                data = _post_gemini(model, body)
                if model != FALLBACK_MODELS[0] or attempt > 0:
                    print(
                        f"[gemini] succeeded with model={model} attempt={attempt + 1}",
                        flush=True,
                    )
                return _extract_text(data)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                last_err = f"HTTP {e.code}: {err_body[:300]}"
                transient = e.code in RETRYABLE_STATUS
                if transient and attempt < 2:
                    delay = 2 ** attempt  # 1s, 2s
                    print(
                        f"[gemini] {model} attempt {attempt + 1}: {e.code} — retry in {delay}s",
                        flush=True,
                    )
                    time.sleep(delay)
                    continue
                # Non-retryable OR last attempt on this model — move on
                print(
                    f"[gemini] {model} gave up after attempt {attempt + 1} ({e.code}) — trying next model",
                    flush=True,
                )
                break
            except urllib.error.URLError as e:
                last_err = f"network: {e}"
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                break

    raise RuntimeError(f"Gemini API exhausted all retries: {last_err}")


def _extract_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini returned no candidates: {json.dumps(data)[:400]}")

    parts = candidates[0].get("content", {}).get("parts", [])
    text_out = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
    if not text_out.strip():
        raise RuntimeError("Gemini returned empty text.")
    return text_out


# ---------- Calendar analysis phase ----------
#
# Accepts one of:
#   { "type": "images", "images": [{ "mime": "...", "base64": "..." }, ...] }
#   { "type": "ics", "text": "<raw ics text>" }
#   { "type": "none" }
#
# Returns a plain-English summary of the user's typical weekly availability
# that the downstream planner can feed to Gemini when picking task times.
def analyze_calendar(cal, daily_minutes):
    if not cal or cal.get("type") == "none":
        return None

    if cal.get("type") == "ics":
        return analyze_ics(cal.get("text", ""), daily_minutes)

    if cal.get("type") == "images":
        imgs = cal.get("images") or []
        if not imgs:
            return None
        return analyze_images(imgs, daily_minutes)

    return None


def analyze_ics(ics_text, daily_minutes):
    """
    Minimal .ics parser: collect all VEVENT DTSTART/DTEND and summarize
    busy windows per weekday. We don't need perfect fidelity — just a
    reasonable availability picture.
    """
    import datetime as dt

    events = []
    in_event = False
    cur = {}
    for line in ics_text.splitlines():
        line = line.strip()
        if line == "BEGIN:VEVENT":
            in_event = True
            cur = {}
        elif line == "END:VEVENT":
            in_event = False
            if cur.get("dtstart") and cur.get("dtend"):
                events.append(cur)
        elif in_event and ":" in line:
            key_part, _, val = line.partition(":")
            key = key_part.split(";")[0].upper()
            if key == "DTSTART":
                cur["dtstart"] = val
            elif key == "DTEND":
                cur["dtend"] = val
            elif key == "SUMMARY":
                cur["summary"] = val

    # Parse into weekday buckets
    by_dow = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []}
    dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday",
                 "Friday", "Saturday", "Sunday"]

    def parse_ics_dt(s):
        s = s.replace("Z", "")
        if "T" in s:
            fmts = ["%Y%m%dT%H%M%S", "%Y%m%dT%H%M"]
        else:
            fmts = ["%Y%m%d"]
        for f in fmts:
            try:
                return dt.datetime.strptime(s, f)
            except ValueError:
                continue
        return None

    for ev in events:
        start = parse_ics_dt(ev["dtstart"])
        end = parse_ics_dt(ev["dtend"])
        if not start or not end:
            continue
        by_dow[start.weekday()].append(
            (start.strftime("%H:%M"), end.strftime("%H:%M"), ev.get("summary", ""))
        )

    # Build a summary string
    lines = ["User provided a .ics file. Extracted busy windows per weekday:"]
    for i in range(7):
        slots = sorted(by_dow[i])
        if not slots:
            lines.append(f"- {dow_names[i]}: appears free all day (no events found)")
        else:
            parts = ", ".join(f"{s}-{e} ({t or 'event'})" for s, e, t in slots)
            lines.append(f"- {dow_names[i]}: busy {parts}")

    lines.append(
        f"\nTask duration is {daily_minutes} minutes. "
        "Find free windows of at least that length."
    )
    return "\n".join(lines)


def analyze_images(images, daily_minutes):
    """
    Send calendar screenshots to Gemini vision. Returns a plain-English
    availability summary written by Gemini.
    """
    prompt = f"""You are analyzing screenshots of a user's weekly calendar to extract when they are BUSY vs FREE.

The user wants to schedule a recurring {daily_minutes}-minute task.

Examine the image(s) carefully. For each day of the week (Monday through Sunday), describe:
1. The time windows when the user has existing events / appears busy.
2. The time windows that look FREE for a {daily_minutes}-minute block.
3. Anything notable (e.g. "Mondays are packed 9-5", "evenings after 8pm are always free").

Write your answer as a plain text summary, one paragraph per weekday, using 24-hour time (e.g. 14:00 not 2pm). Do NOT invent events that aren't visible. If a day is blank or off-screen, say so.

Finish with one line: "CONSISTENT FREE SLOT ACROSS ALL VISIBLE DAYS: HH:MM-HH:MM" if you can find a single time window free every day; otherwise write "CONSISTENT FREE SLOT: NONE".
"""
    text = call_gemini(prompt, grounding=False, want_json=False, images=images)
    return "User provided calendar screenshot(s). Vision analysis:\n\n" + text


# ---------- Research phase ----------
def research_phase(goal: str, days: int, daily_minutes: int) -> str:
    prompt = f"""You are a research analyst. Before any planning, gather evidence-based insight on this goal.

GOAL: "{goal}"
TIMELINE: {days} days
DAILY BUDGET: {daily_minutes} minutes

Using Google Search, research the most effective, real-world practices for achieving this specific goal. Find:

1. Proven systems, frameworks, or curricula that experts recommend.
2. Highest-leverage daily habits or drills that compound over time.
3. Common beginner mistakes and how to avoid them.
4. Foundational prerequisites that must be in place before intermediate work.
5. Realistic milestones people actually hit in {days} days with ~{daily_minutes} minutes/day.
6. Specific techniques, exercises, or resources (named precisely — not generic advice).

Write a focused research brief (250-400 words) summarizing what you found. Be specific and cite concrete methods, techniques, and resources by name. Do NOT invent; ground every claim in the search results. No fluff, no motivational filler — this is source material for a downstream planner.
"""
    return call_gemini(prompt, grounding=True, want_json=False)


# ---------- Robust JSON parsing for plan phase ----------
def _parse_plan_json(raw: str) -> dict:
    """
    Gemini returns JSON, but occasionally malforms it with unescaped quotes,
    trailing commas, or truncated output. This tries several repair passes
    before giving up, so a tiny syntax hiccup doesn't nuke the whole run.
    """
    # 1) Straight parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 2) Extract the outermost JSON object
    m = re.search(r"\{[\s\S]*\}", raw)
    candidate = m.group(0) if m else raw

    # 3) Strip trailing commas before } or ]
    repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)

    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        # 4) Dump the raw output for post-mortem debugging
        debug_path = ROOT / "last_bad_response.json"
        try:
            debug_path.write_text(raw, encoding="utf-8")
            print(
                f"[plan] JSON parse failed, wrote raw to {debug_path.name}",
                flush=True,
            )
        except Exception:
            pass

        # 5) As a final fallback, try to salvage just the `tasks` array and
        #    parse up to the last complete task object.
        salvaged = _salvage_tasks(repaired)
        if salvaged:
            return salvaged

        raise RuntimeError(f"Plan JSON malformed: {e}")


def _salvage_tasks(text):
    """
    Extract a valid prefix of the tasks array. If Gemini truncates output
    mid-task, we can still recover every preceding complete task.
    """
    tasks_match = re.search(r'"tasks"\s*:\s*\[', text)
    if not tasks_match:
        return None

    start = tasks_match.end()
    depth = 1  # inside [
    i = start
    last_good_end = None
    in_str = False
    escape = False
    obj_depth = 0

    while i < len(text) and depth > 0:
        c = text[i]
        if escape:
            escape = False
        elif c == "\\":
            escape = True
        elif c == '"':
            in_str = not in_str
        elif not in_str:
            if c == "{":
                obj_depth += 1
            elif c == "}":
                obj_depth -= 1
                if obj_depth == 0:
                    last_good_end = i + 1
            elif c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
        i += 1

    if last_good_end is None:
        return None

    # Take everything up through the last completed object, then close the array
    prefix = text[:last_good_end] + "]"
    # Extract decomposition if present
    decomp_match = re.search(
        r'"decomposition"\s*:\s*(\{[^}]*\}(?:\s*,\s*"[^"]+"\s*:\s*\[[^\]]*\])*)',
        text,
    )

    # Re-wrap into a minimal parseable object
    tasks_json = prefix[prefix.find("["):]
    try:
        tasks = json.loads(tasks_json)
    except json.JSONDecodeError:
        return None

    return {"tasks": tasks, "decomposition": {}}


# ---------- Decomposition + daily task phase ----------
def plan_phase(goal, days, daily_minutes, research, availability=None,
               start_weekday=None, fallback_time="09:00"):
    # Build a weekday map so we can tell the model which day index is which
    dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday",
                 "Friday", "Saturday", "Sunday"]
    if start_weekday is None:
        start_weekday = 0
    day_to_dow = []
    for i in range(days):
        day_to_dow.append(dow_names[(start_weekday + i) % 7])
    day_map_lines = [f"Day {i+1} = {d}" for i, d in enumerate(day_to_dow)]

    # Availability section injected only if we have calendar data
    if availability:
        availability_block = f"""
=== USER AVAILABILITY ===
{availability}
=== END AVAILABILITY ===

SCHEDULING INSTRUCTIONS (MANDATORY):
- For each task, assign a "scheduled_time" (24h HH:MM) that actually fits the user's availability for the weekday that task falls on.
- STRONGLY PREFER the same time across all days. Find one {daily_minutes}-minute window that is FREE every day in the data above, and use that for every task.
- Only deviate when the preferred slot is genuinely blocked on a given weekday. In those cases, pick the next-best free {daily_minutes}-minute window on that weekday.
- Never schedule a task into a window the user is busy.
- Never invent availability not in the data.
- Add a one-sentence "schedule_note" for each task explaining why that time was chosen (e.g. "Consistent 07:30 slot — free every weekday", or "Mondays blocked 9-12, moved to 14:00").
"""
    else:
        availability_block = f"""
=== USER AVAILABILITY ===
No calendar provided. Schedule every task at the user's preferred start time: {fallback_time}.
=== END AVAILABILITY ===

SCHEDULING INSTRUCTIONS:
- Set "scheduled_time" to {fallback_time} for every task.
- Set "schedule_note" to "Default time — no calendar provided."
"""

    prompt = f"""You are STOIX, a disciplined performance planner. Using ONLY the research brief below, design a rigorous {days}-day protocol toward this goal.

GOAL: "{goal}"
TIMELINE: {days} days (exactly one task per day, in order)
DAILY BUDGET: {daily_minutes} minutes per task — every task must be doable inside this budget
DAY-TO-WEEKDAY MAPPING:
{chr(10).join(day_map_lines)}

=== RESEARCH BRIEF ===
{research}
=== END RESEARCH ===
{availability_block}
Your job has three layers:

LAYER 1 — DECOMPOSITION (internal, not in output):
  - Identify foundational prerequisites (what must be true before real work starts)
  - Identify intermediate milestones (checkpoints along the way)
  - Identify the final execution outcome (what Day {days} looks like)
  Every daily task must trace back to one of these.

LAYER 2 — SEQUENCING RULES:
  - Tasks must be in dependency-based order: never ask the user to do something that assumes knowledge not yet introduced.
  - Tasks must build cumulatively — each day advances a specific milestone.
  - Distribute phases approximately: Foundation ~25%, Build ~25%, Push ~25%, Mastery ~25% of the {days} days.

LAYER 3 — TASK RULES (critical):
  - Each task is a SMALL, CONCRETE daily micro-action (not a project).
  - It must fit within {daily_minutes} minutes of real work, including warm-up.
  - It must be specific: reference real techniques, exercises, or frameworks from the research brief by name when possible.
  - Never say "work on X", "study Y", "practice Z" — instead say WHAT exactly (e.g. "complete the 3 rolling-note drills from Justin Guitar lesson 2", "write a 200-word summary of Newton's third law using the Feynman technique", "do 4 sets of 5 deadlifts at 60% 1RM focusing on neutral spine").
  - Include WHY it matters for this specific goal and HOW to execute it today.

OUTPUT — respond with ONLY valid JSON in this exact schema, no prose before or after:

{{
  "decomposition": {{
    "prerequisites": ["...", "..."],
    "milestones": ["...", "..."],
    "final_outcome": "..."
  }},
  "tasks": [
    {{
      "day": 1,
      "weekday": "Monday",
      "phase": "Foundation",
      "milestone": "which milestone from the list above this contributes to",
      "title": "short actionable title (<= 10 words)",
      "description": "2-4 sentences. Be specific. Reference exact techniques/exercises. Explain what to do, why it advances the goal, how to execute inside {daily_minutes} minutes.",
      "scheduled_time": "HH:MM (24h)",
      "schedule_note": "brief reason this time was chosen"
    }}
  ]
}}

The "tasks" array MUST contain exactly {days} items, in ascending day order, each building on the previous. Phase values must be one of: "Foundation", "Build", "Push", "Mastery".

CRITICAL JSON OUTPUT RULES — FAILURE TO FOLLOW WILL BREAK THE SYSTEM:
- Output ONLY valid JSON. No prose, no markdown fences, no explanation.
- Do NOT use smart/curly quotes anywhere. Only plain ASCII double-quotes.
- Inside string values, NEVER use raw double-quotes — use single quotes instead (e.g. use 'Feynman technique' NOT "Feynman technique").
- No literal newlines inside strings — keep each description on one line.
- No trailing commas after the last item in any list or object.
- Keep each description concise (2-4 sentences max) so the whole response stays well within token limits.
- "scheduled_time" must be 5 chars exactly in HH:MM 24h format.
"""

    raw = call_gemini(prompt, grounding=False, want_json=True)

    parsed = _parse_plan_json(raw)

    tasks = parsed.get("tasks") or []
    if not isinstance(tasks, list) or not tasks:
        raise RuntimeError("Plan phase returned no tasks.")

    # Attach decomposition into each task so the frontend can surface it
    decomposition = parsed.get("decomposition") or {}
    for t in tasks:
        t["_decomposition"] = decomposition

    return tasks


# ---------- HTTP server ----------
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _send_json(self, status, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/health":
            return self._send_json(
                200,
                {
                    "ok": True,
                    "hasKey": bool(GEMINI_API_KEY),
                    "model": MODEL,
                    "provider": "gemini",
                },
            )

        url_path = self.path.split("?", 1)[0]
        if url_path.startswith("/api/"):
            self.send_error(404, "Not found")
            return

        # Base44 (Vite) React app over STOIX — same origin as /api/*
        if _serve_built_frontend(self, url_path):
            return

        # Legacy static files at repo root (vanilla index.html, redpill.js, …)
        if url_path == "/":
            url_path = "/index.html"
        file_path = (ROOT / url_path.lstrip("/")).resolve()
        try:
            file_path.relative_to(ROOT)
        except ValueError:
            self.send_error(403, "Forbidden")
            return
        if not file_path.exists() or not file_path.is_file():
            self.send_error(404, "Not found")
            return
        mime, _ = mimetypes.guess_type(str(file_path))
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/api/generate-tasks":
            self.send_error(404, "Not found")
            return

        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            body = json.loads(raw or "{}")
        except Exception:
            return self._send_json(400, {"ok": False, "error": "Invalid JSON"})

        goal = str(body.get("goal", "")).strip()
        try:
            days = int(body.get("days"))
            daily_minutes = int(body.get("dailyMinutes"))
        except (TypeError, ValueError):
            return self._send_json(
                400, {"ok": False, "error": "Invalid days/dailyMinutes"}
            )

        if not goal:
            return self._send_json(400, {"ok": False, "error": "Missing goal"})
        if days < 1 or days > 365:
            return self._send_json(400, {"ok": False, "error": "days must be 1-365"})
        if daily_minutes < 5 or daily_minutes > 60:
            return self._send_json(
                400, {"ok": False, "error": "dailyMinutes must be 5-60"}
            )

        start_time = str(body.get("startTime") or "09:00").strip()
        start_date = str(body.get("startDate") or "").strip()
        calendar = body.get("calendar") or {"type": "none"}

        # Figure out which weekday Day 1 falls on (0=Mon..6=Sun)
        start_weekday = 0
        if start_date:
            import datetime as dt
            try:
                start_weekday = dt.datetime.strptime(
                    start_date, "%Y-%m-%d"
                ).weekday()
            except ValueError:
                start_weekday = 0

        print(
            f'[generate] goal="{goal}" days={days} min={daily_minutes} '
            f'cal={calendar.get("type")} start_dow={start_weekday}',
            flush=True,
        )

        try:
            # PASS 0: calendar analysis (only if calendar provided)
            availability = None
            if calendar.get("type") in ("images", "ics"):
                print("[generate] pass 0: calendar analysis...", flush=True)
                availability = analyze_calendar(calendar, daily_minutes)
                if availability:
                    print(
                        f"[generate] availability summary: {len(availability)} chars",
                        flush=True,
                    )

            # PASS 1: research
            print("[generate] pass 1: research (google_search grounding)...", flush=True)
            research = research_phase(goal, days, daily_minutes)
            print(f"[generate] research brief: {len(research)} chars", flush=True)

            # PASS 2: decomposition + daily micro-tasks (schedule-aware)
            print("[generate] pass 2: decomposition + daily tasks...", flush=True)
            tasks = plan_phase(
                goal,
                days,
                daily_minutes,
                research,
                availability=availability,
                start_weekday=start_weekday,
                fallback_time=start_time,
            )
            print(f"[generate] returned {len(tasks)} tasks", flush=True)

            return self._send_json(
                200,
                {
                    "ok": True,
                    "tasks": tasks,
                    "research": research,
                    "availability": availability or "",
                },
            )
        except Exception as e:
            print(f"[generate] error: {e}", flush=True)
            return self._send_json(500, {"ok": False, "error": str(e)})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"\nSTOIX // Red Pill server running at http://localhost:{PORT}")
    if (FRONTEND_DIST / "index.html").is_file():
        print(f"UI: Base44 (Vite) app from {FRONTEND_DIST.relative_to(ROOT)}")
    else:
        print(
            "UI: legacy static files only — run: "
            'cd "cordial-matrix-logic-lab-2 4" && npm install && npm run build'
        )
    print(f"Provider: Google Gemini  Model: {MODEL}")
    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY not set. Add it to .env to enable AI tasks.")
        print("         (Frontend will silently fall back to rule-based plans.)")
    else:
        print("API key: loaded")
    print("Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
