#!/usr/bin/env python3
"""
STOIX // Red Pill — local Python backend (stdlib only, no pip needed).

Pipeline for /api/generate-tasks:

  PASS 1 (RESEARCH) — cloud chat model (OpenRouter by default)
      Synthesize evidence-style practices, mistakes, and milestones.
      Optional: set OPENROUTER_API_KEY; otherwise falls back to local Ollama
      if `ollama serve` is running.

  PASS 2 (DECOMPOSITION + DAILY MINI-TASKS) — JSON mode from the same backend

If no cloud key and Ollama is unreachable (or generation fails), the endpoint
returns HTTP 200 with ok=True and a deterministic offline task ladder
(source="offline").
"""

import json
import os
import re
import sys
import time
from typing import Optional
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


def _model_chain(primary: str, fallbacks_csv: str) -> list:
    out = []
    if primary:
        out.append(primary)
    for part in (fallbacks_csv or "").split(","):
        p = part.strip()
        if p and p not in out:
            out.append(p)
    return out


# Cloud — OpenRouter (OpenAI-compatible API): https://openrouter.ai
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_BASE_URL = os.environ.get(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
).rstrip("/")
OPENROUTER_MODEL = os.environ.get(
    "OPENROUTER_MODEL", "qwen/qwen2.5-72b-instruct"
).strip()
OPENROUTER_MODEL_FALLBACKS = os.environ.get(
    "OPENROUTER_MODEL_FALLBACKS",
    "meta-llama/llama-3.3-70b-instruct,mistralai/mistral-7b-instruct",
).strip()
OPENROUTER_VISION_MODEL = os.environ.get(
    "OPENROUTER_VISION_MODEL", "qwen/qwen2-vl-7b-instruct"
).strip()
OPENROUTER_VISION_FALLBACKS = os.environ.get("OPENROUTER_VISION_FALLBACKS", "").strip()
OPENROUTER_TIMEOUT_RESEARCH = int(os.environ.get("OPENROUTER_TIMEOUT_RESEARCH", "180"))
OPENROUTER_TIMEOUT_PLAN = int(os.environ.get("OPENROUTER_TIMEOUT_PLAN", "600"))
OPENROUTER_TIMEOUT_VISION = int(os.environ.get("OPENROUTER_TIMEOUT_VISION", "180"))
OPENROUTER_MAX_TOKENS = int(os.environ.get("OPENROUTER_MAX_TOKENS", "16384"))

OPENROUTER_MODEL_CHAIN = _model_chain(OPENROUTER_MODEL, OPENROUTER_MODEL_FALLBACKS)
if not OPENROUTER_MODEL_CHAIN:
    OPENROUTER_MODEL_CHAIN = ["qwen/qwen2.5-72b-instruct"]
OPENROUTER_VISION_CHAIN = _model_chain(
    OPENROUTER_VISION_MODEL, OPENROUTER_VISION_FALLBACKS
)

# Blue Pill (/api/blue-pill, /api/skill-path) — Google Gemini (separate from Red Pill).
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)


def _post_gemini_generate(model: str, body: dict, timeout: int = 120) -> dict:
    url = GEMINI_URL.format(model=model, key=GEMINI_API_KEY)
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _extract_gemini_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini returned no candidates: {json.dumps(data)[:400]}")
    parts = candidates[0].get("content", {}).get("parts", [])
    text_out = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
    if not text_out.strip():
        raise RuntimeError("Gemini returned empty text.")
    return text_out


def call_gemini(
    prompt: str,
    *,
    grounding: bool = False,
    want_json: bool = False,
    images=None,
) -> str:
    """Blue Pill — Gemini REST. JSON mode cannot be combined with google_search."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
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
            "maxOutputTokens": 8192,
        },
    }
    if want_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    if grounding:
        body["tools"] = [{"google_search": {}}]
    data = _post_gemini_generate(GEMINI_MODEL, body, timeout=120)
    return _extract_gemini_text(data)


# Local fallback — Ollama (https://ollama.com)
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b").strip()
OLLAMA_MODEL_FALLBACKS = os.environ.get(
    "OLLAMA_MODEL_FALLBACKS", "llama3.2:latest,mistral:7b"
).strip()

_vraw = os.environ.get("OLLAMA_VISION_MODEL", "llava:latest").strip()
OLLAMA_VISION_MODEL = _vraw
OLLAMA_VISION_FALLBACKS = os.environ.get("OLLAMA_VISION_FALLBACKS", "").strip()

OLLAMA_TIMEOUT_RESEARCH = int(os.environ.get("OLLAMA_TIMEOUT_RESEARCH", "300"))
OLLAMA_TIMEOUT_PLAN = int(os.environ.get("OLLAMA_TIMEOUT_PLAN", "600"))
OLLAMA_TIMEOUT_VISION = int(os.environ.get("OLLAMA_TIMEOUT_VISION", "300"))

OLLAMA_MODEL_CHAIN = _model_chain(OLLAMA_MODEL, OLLAMA_MODEL_FALLBACKS) or ["qwen2.5:7b"]
OLLAMA_VISION_CHAIN = (
    _model_chain(OLLAMA_VISION_MODEL, OLLAMA_VISION_FALLBACKS)
    if OLLAMA_VISION_MODEL
    else []
)


def use_openrouter() -> bool:
    return bool(OPENROUTER_API_KEY)


def llm_ready() -> bool:
    if use_openrouter():
        return True
    return ollama_reachable()


def active_vision_chain() -> list:
    if use_openrouter():
        return OPENROUTER_VISION_CHAIN
    return OLLAMA_VISION_CHAIN


def ollama_reachable() -> bool:
    try:
        req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except Exception:
        return False


def _post_ollama(path: str, payload: dict, timeout: int) -> dict:
    url = f"{OLLAMA_HOST}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _ollama_chat_once(
    model: str,
    prompt: str,
    *,
    want_json: bool,
    images: Optional[list],
    timeout: int,
) -> str:
    msg: dict = {"role": "user", "content": prompt}
    if images:
        b64s = [img.get("base64", "") for img in images if img.get("base64")]
        if b64s:
            msg["images"] = b64s
    payload: dict = {
        "model": model,
        "messages": [msg],
        "stream": False,
        "options": {"temperature": 0.6},
    }
    if want_json:
        payload["format"] = "json"
    data = _post_ollama("/api/chat", payload, timeout=timeout)
    content = (data.get("message") or {}).get("content")
    if not content or not str(content).strip():
        raise RuntimeError(f"Ollama returned empty content: {json.dumps(data)[:400]}")
    return str(content).strip()


def call_ollama(
    prompt: str,
    *,
    want_json: bool = False,
    images: Optional[list] = None,
    timeout: int = 300,
    model_chain: Optional[list] = None,
    label: str = "chat",
) -> str:
    chain = list(model_chain or OLLAMA_MODEL_CHAIN)
    if not chain:
        raise RuntimeError("No Ollama models configured (OLLAMA_MODEL).")
    last_err: Optional[BaseException] = None
    for model in chain:
        for attempt in range(3):
            try:
                text = _ollama_chat_once(
                    model, prompt, want_json=want_json, images=images, timeout=timeout
                )
                if model != chain[0] or attempt > 0:
                    print(
                        f"[ollama] {label} ok model={model} attempt={attempt + 1}",
                        flush=True,
                    )
                return text
            except urllib.error.HTTPError as e:
                err_body = ""
                try:
                    err_body = e.read().decode("utf-8", errors="replace")[:400]
                except Exception:
                    pass
                last_err = RuntimeError(f"HTTP {e.code}: {err_body}")
                print(
                    f"[ollama] {label} model={model} HTTP {e.code} — try next model",
                    flush=True,
                )
                break
            except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
                last_err = e
                if attempt < 2:
                    delay = 2**attempt
                    print(
                        f"[ollama] {label} model={model} attempt {attempt + 1}: {e} — retry in {delay}s",
                        flush=True,
                    )
                    time.sleep(delay)
                else:
                    break
            except RuntimeError as e:
                last_err = e
                print(f"[ollama] {label} model={model}: {e}", flush=True)
                break
    raise RuntimeError(f"Ollama failed ({label}): {last_err}")


def _openrouter_user_content(prompt: str, images: Optional[list]):
    if not images:
        return prompt
    parts: list = [{"type": "text", "text": prompt}]
    for img in images:
        mime = (img.get("mime") or "image/png").split(";")[0].strip()
        b64 = img.get("base64", "")
        if b64:
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                }
            )
    return parts


def _post_openrouter_chat(body: dict, timeout: int) -> dict:
    url = f"{OPENROUTER_BASE_URL}/chat/completions"
    payload = json.dumps(body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": os.environ.get(
            "OPENROUTER_HTTP_REFERER", "https://local.stoix.dev"
        ),
        "X-Title": os.environ.get("OPENROUTER_APP_TITLE", "STOIX Red Pill"),
    }
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _extract_openrouter_text(data: dict) -> str:
    ch = data.get("choices") or []
    if not ch:
        raise RuntimeError(f"OpenRouter: no choices in {json.dumps(data)[:500]}")
    msg = ch[0].get("message") or {}
    content = msg.get("content")
    if content is None:
        raise RuntimeError("OpenRouter: empty message content")
    if isinstance(content, list):
        bits = []
        for p in content:
            if isinstance(p, dict) and p.get("type") == "text":
                bits.append(p.get("text", ""))
        content = "".join(bits)
    text_out = str(content).strip()
    if not text_out:
        raise RuntimeError("OpenRouter: empty assistant text")
    return text_out


def call_openrouter(
    prompt: str,
    *,
    want_json: bool = False,
    images: Optional[list] = None,
    timeout: int = 300,
    model_chain: Optional[list] = None,
    label: str = "chat",
) -> str:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    chain = list(model_chain or OPENROUTER_MODEL_CHAIN)
    if not chain:
        raise RuntimeError("No OpenRouter models configured")
    last_err: Optional[BaseException] = None
    for model in chain:
        for attempt in range(3):
            try:
                body: dict = {
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": _openrouter_user_content(prompt, images),
                        }
                    ],
                    "temperature": 0.6,
                    "max_tokens": OPENROUTER_MAX_TOKENS,
                }
                if want_json:
                    body["response_format"] = {"type": "json_object"}
                data = _post_openrouter_chat(body, timeout=timeout)
                text = _extract_openrouter_text(data)
                if model != chain[0] or attempt > 0:
                    print(
                        f"[openrouter] {label} ok model={model} attempt={attempt + 1}",
                        flush=True,
                    )
                return text
            except urllib.error.HTTPError as e:
                err_body = ""
                try:
                    err_body = e.read().decode("utf-8", errors="replace")[:500]
                except Exception:
                    pass
                last_err = RuntimeError(f"HTTP {e.code}: {err_body}")
                print(f"[openrouter] {label} model={model} HTTP {e.code}", flush=True)
                transient = e.code in {429, 500, 502, 503, 504}
                if transient and attempt < 2:
                    time.sleep(2**attempt)
                    continue
                break
            except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
                last_err = e
                if attempt < 2:
                    delay = 2**attempt
                    print(
                        f"[openrouter] {label} attempt {attempt + 1}: {e} — retry in {delay}s",
                        flush=True,
                    )
                    time.sleep(delay)
                else:
                    break
            except RuntimeError as e:
                last_err = e
                print(f"[openrouter] {label} model={model}: {e}", flush=True)
                break
    raise RuntimeError(f"OpenRouter failed ({label}): {last_err}")


def _llm_timeout_for(label: str) -> int:
    if use_openrouter():
        return {
            "research": OPENROUTER_TIMEOUT_RESEARCH,
            "plan": OPENROUTER_TIMEOUT_PLAN,
            "vision": OPENROUTER_TIMEOUT_VISION,
        }.get(label, 300)
    return {
        "research": OLLAMA_TIMEOUT_RESEARCH,
        "plan": OLLAMA_TIMEOUT_PLAN,
        "vision": OLLAMA_TIMEOUT_VISION,
    }.get(label, 300)


def call_llm(
    prompt: str,
    *,
    want_json: bool = False,
    images: Optional[list] = None,
    timeout: Optional[int] = None,
    model_chain: Optional[list] = None,
    label: str = "chat",
) -> str:
    t = timeout if timeout is not None else _llm_timeout_for(label)
    if use_openrouter():
        return call_openrouter(
            prompt,
            want_json=want_json,
            images=images,
            timeout=t,
            model_chain=model_chain,
            label=label,
        )
    return call_ollama(
        prompt,
        want_json=want_json,
        images=images,
        timeout=t,
        model_chain=model_chain,
        label=label,
    )


# ---------- Calendar analysis phase ----------
#
# Accepts one of:
#   { "type": "images", "images": [{ "mime": "...", "base64": "..." }, ...] }
#   { "type": "ics", "text": "<raw ics text>" }
#   { "type": "none" }
#
# Returns a plain-English summary of the user's typical weekly availability
# that the downstream planner can use when picking task times.
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
    Send calendar screenshots to a vision-capable model (OpenRouter or Ollama).
    Returns a plain-English availability summary.
    """
    vchain = active_vision_chain()
    if not vchain:
        raise RuntimeError("No vision model configured — set OPENROUTER_VISION_MODEL or OLLAMA_VISION_MODEL.")
    prompt = f"""You are analyzing screenshots of a user's weekly calendar to extract when they are BUSY vs FREE.

The user wants to schedule a recurring {daily_minutes}-minute task.

Examine the image(s) carefully. For each day of the week (Monday through Sunday), describe:
1. The time windows when the user has existing events / appears busy.
2. The time windows that look FREE for a {daily_minutes}-minute block.
3. Anything notable (e.g. "Mondays are packed 9-5", "evenings after 8pm are always free").

Write your answer as a plain text summary, one paragraph per weekday, using 24-hour time (e.g. 14:00 not 2pm). Do NOT invent events that aren't visible. If a day is blank or off-screen, say so.

Finish with one line: "CONSISTENT FREE SLOT ACROSS ALL VISIBLE DAYS: HH:MM-HH:MM" if you can find a single time window free every day; otherwise write "CONSISTENT FREE SLOT: NONE".
"""
    text = call_llm(
        prompt,
        want_json=False,
        images=images,
        model_chain=vchain,
        label="vision",
    )
    return "User provided calendar screenshot(s). Vision analysis:\n\n" + text


# ---------- Research phase ----------
def research_phase(goal: str, days: int, daily_minutes: int) -> str:
    prompt = f"""You are a research analyst. Before any planning, synthesize evidence-based insight on this goal.

GOAL: "{goal}"
TIMELINE: {days} days
DAILY BUDGET: {daily_minutes} minutes

You do NOT have live web access. Use well-established knowledge from your training: widely recommended systems, textbooks, courses, and expert consensus. Find:

1. Proven systems, frameworks, or curricula people use for this class of goal.
2. Highest-leverage daily habits or drills that compound over time.
3. Common beginner mistakes and how to avoid them.
4. Foundational prerequisites that must be in place before intermediate work.
5. Realistic milestones people often reach in {days} days with ~{daily_minutes} minutes/day.
6. Specific techniques, exercises, or resources (named precisely — not generic advice).

Write a focused research brief (250-400 words). Be specific. If you cite a named method or resource, only do so when it is a real, established one from your knowledge — do not fabricate citations or URLs. No fluff — this is source material for a downstream planner.
"""
    return call_llm(
        prompt,
        want_json=False,
        label="research",
    )


# ---------- Robust JSON parsing for plan phase ----------
def _parse_plan_json(raw: str) -> dict:
    """
    The model returns JSON, but occasionally malforms it with unescaped quotes,
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

        # 5) As a final fallback, try to salvage just the `tasks` array.
        salvaged = _salvage_tasks(repaired)
        if salvaged:
            return salvaged

        raise RuntimeError(f"Plan JSON malformed: {e}")


def _salvage_tasks(text):
    """
    Extract a valid prefix of the tasks array. If the model truncates output
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


def _normalize_hhmm(s: str, default: str = "09:00") -> str:
    """Accept H:MM or HH:MM and return zero-padded HH:MM."""
    if not s:
        return default
    s = str(s).strip()
    m = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?$", s)
    if not m:
        return default
    h, mi = int(m.group(1)), int(m.group(2))
    if 0 <= h <= 23 and 0 <= mi <= 59:
        return f"{h:02d}:{mi:02d}"
    return default


def _phase_for_day(day: int, days: int) -> str:
    if days <= 1:
        return "Foundation"
    pos = (day - 1) / (days - 1)
    if pos < 0.25:
        return "Foundation"
    if pos < 0.5:
        return "Build"
    if pos < 0.75:
        return "Push"
    return "Mastery"


_MILESTONE_BY_PHASE = {
    "Foundation": "Orientation and constraints",
    "Build": "Skill and habit scaffolding",
    "Push": "Volume and deliberate difficulty",
    "Mastery": "Integration and consolidation",
}

# Pre-planned daily micro-tasks when Ollama is unavailable or generation fails.
# Cycles for long timelines.
_FALLBACK_BLUEPRINTS = [
    (
        "Write your north-star outcome",
        "In {m} minutes, write one sentence that defines success for this goal: {g}. Make it concrete enough that someone else could tell if you achieved it.",
    ),
    (
        "Capture your baseline",
        "Spend {m} minutes logging where you are today for this goal (skills, habits, metrics, blockers). Date the note so you can compare later.",
    ),
    (
        "Name your riskiest unknown",
        "List three questions you must answer to reach your goal. Circle the one whose wrong answer would hurt most; spend {m} minutes outlining how you will test it this week.",
    ),
    (
        "Remove one friction point",
        "Pick one small environmental change that makes the next session easier (tools ready, tab closed, shoes by the door). Implement it in {m} minutes.",
    ),
    (
        "Decompose into three pillars",
        "Break the goal into three supporting pillars or sub-skills. Spend {m} minutes writing one line per pillar and one success signal for each.",
    ),
    (
        "Pick one canonical resource",
        "Choose a single book, course, or reference you will treat as primary for now. In {m} minutes, skim the outline or chapter list and note where you will start tomorrow.",
    ),
    (
        "Smallest viable rep",
        "Define the tiniest version of practice that still counts (one set, one paragraph, one drill). Do that rep once, timed, within {m} minutes.",
    ),
    (
        "Start a simple log",
        "Create a one-line daily log format (date, minutes, what you did, 1–10 energy). Use {m} minutes to set it up and enter today.",
    ),
    (
        "Deliberate weakness work",
        "Identify your weakest pillar from earlier. Spend {m} minutes on one drill or exercise aimed only at that gap — no new topics.",
    ),
    (
        "Explain it out loud",
        "Use the Feynman-style approach: explain one core idea from your goal to an imaginary beginner in {m} minutes. Note where you stumbled; that is your study list.",
    ),
    (
        "Progressive overload",
        "Repeat yesterday's core rep with one controlled increase (more focus, stricter form, tighter time box, or +10% load if safe). Keep total work inside {m} minutes.",
    ),
    (
        "Review and adjust",
        "Read the last five log entries. In {m} minutes, write one pattern you see and one change you will make for the next three days.",
    ),
    (
        "Rehearse under mild pressure",
        "Simulate real conditions: timer visible, phone away, same time of day as your anchor. Complete one full cycle of your main practice in {m} minutes.",
    ),
    (
        "Failure mode check",
        "List two ways this goal usually fails for people. Spend {m} minutes writing one guardrail you will use this week for each.",
    ),
    (
        "Combine skills",
        "Pick two micro-skills you have practiced and chain them in one session (no new content). Finish within {m} minutes.",
    ),
    (
        "Quality pass",
        "Redo one prior task at higher quality bar (slower, cleaner, more precise). {m} minutes max — stop when quality peaks, not when time runs out.",
    ),
    (
        "Accountability artifact",
        "Draft a one-sentence commitment message you could send to a friend or calendar note. Spend {m} minutes refining it and scheduling the next check-in.",
    ),
    (
        "Next horizon",
        "If you succeeded on schedule, what is the next chapter after this {m}-minute daily habit? Write three bullets for the next phase in {m} minutes.",
    ),
]


def _fallback_research(goal: str, days: int, daily_minutes: int) -> str:
    g = goal.strip() or "your goal"
    return (
        "OFFLINE PROTOCOL NOTE: No LLM run succeeded (set OPENROUTER_API_KEY or run Ollama; or fix errors/timeouts). "
        "This brief is a generic evidence-style scaffold.\n\n"
        f"Goal: {g}\nTimeline: {days} days at {daily_minutes} minutes per day.\n\n"
        "Strong protocols usually combine: clear outcomes and self-assessment, short daily sessions "
        "you can finish without negotiation, immediate logging, progressive overload within safe limits, "
        "and environment design that reduces friction. Treat each day as one focused rep; adapt the "
        "prompts to your domain while keeping every block completable in the time you chose."
    )


def _offline_tasks(
    goal: str,
    days: int,
    daily_minutes: int,
    start_weekday: int,
    anchor_time: str,
    availability: Optional[str],
) -> list:
    g = (goal.strip() or "your goal").replace("\r", " ").replace("\n", " ")
    if len(g) > 200:
        g = g[:197] + "..."
    m = int(daily_minutes)
    dow_names = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    t = _normalize_hhmm(anchor_time)
    if availability:
        note = (
            "Offline plan — .ics was parsed locally for context; all tasks use your "
            "preferred start time (AI time optimization disabled)."
        )
    else:
        note = "Offline plan — using your preferred start time (no live AI scheduling)."

    decomposition = {
        "prerequisites": [
            "A clear written outcome and a daily time box you can defend",
            "A simple log so you can see streaks and bottlenecks",
        ],
        "milestones": [
            "Constraints and baseline captured",
            "Core practice loop running daily",
            "Difficulty and quality deliberately increased",
            "Skills integrated; next horizon defined",
        ],
        "final_outcome": f"After {days} days of consistent reps, you have measurable progress toward: {g}",
    }

    n_blue = len(_FALLBACK_BLUEPRINTS)
    out = []
    for day in range(1, days + 1):
        phase = _phase_for_day(day, days)
        title, desc_tmpl = _FALLBACK_BLUEPRINTS[(day - 1) % n_blue]
        desc = desc_tmpl.format(m=m, g=g)
        weekday = dow_names[(start_weekday + day - 1) % 7]
        out.append(
            {
                "day": day,
                "weekday": weekday,
                "phase": phase,
                "milestone": _MILESTONE_BY_PHASE.get(phase, "Progress"),
                "title": title,
                "description": desc,
                "scheduled_time": t,
                "schedule_note": note,
                "_decomposition": decomposition,
            }
        )
    return out


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
        preferred = fallback_time
        availability_block = f"""
=== USER AVAILABILITY ===
{availability}
=== END AVAILABILITY ===

USER_PREFERRED_ANCHOR_TIME: {preferred} (24h). The user chose this as their ideal daily start time for tasks.

SCHEDULING INSTRUCTIONS (MANDATORY — READ CAREFULLY):

1) GLOBAL DEFAULT (highest priority)
   - First, assume EVERY task uses scheduled_time = {preferred} unless that exact {daily_minutes}-minute window is impossible on that calendar day.
   - If {preferred} is free on ALL weekdays covered by the protocol for a contiguous {daily_minutes}-minute block, use {preferred} for every task.

2) SAME-TIME-ACROSS-WEEK (when anchor is not universally free)
   - Search for ONE clock time HH:MM that yields a free {daily_minutes}-minute block on every weekday in the data; if found, use it for all tasks (even if it is not {preferred}).

3) PER-DAY OVERRIDES (only when a weekday cannot use the global choice)
   - NEVER move a day to another weekday's free time. Each day is solved independently.
   - For any weekday where the chosen global time (from step 1 or 2) overlaps a busy block OR cannot fit {daily_minutes} minutes, pick a DIFFERENT scheduled_time for tasks that fall on THAT weekday ONLY.
   - Choose the single most convenient alternative ON THAT DAY: prefer the free window immediately AFTER the blocking event ends; if none, immediately BEFORE it begins; otherwise the nearest large free gap still on that day.
   - Stay as close as reasonable on the clock to {preferred} (same afternoon vs morning cluster) when multiple options exist.

4) HARD RULES
   - Never place a task inside a busy window shown in the availability data.
   - Never invent events or free time not supported by the data.
   - "schedule_note" must cite the weekday when you deviate (e.g. "Wed+Thu: 14:00 blocked by class 14:00-16:00 — using 16:15 after class").

5) FORMAT
   - "scheduled_time" is exactly HH:MM (24h) per task.
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

    raw = call_llm(
        prompt,
        want_json=True,
        label="plan",
    )

    parsed = _parse_plan_json(raw)

    tasks = parsed.get("tasks") or []
    if not isinstance(tasks, list) or not tasks:
        raise RuntimeError("Plan phase returned no tasks.")

    # Attach decomposition into each task so the frontend can surface it
    decomposition = parsed.get("decomposition") or {}
    for t in tasks:
        t["_decomposition"] = decomposition

    return tasks


# ─── Blue Pill mock data ─────────────────────────────────────────────────────

BLUE_PILL_MOCK_QUESTS = [
    {
        "title": "Espresso & Novels",
        "type": "cafe",
        "place": "Local Coffeehouse",
        "distanceMiles": 0.4,
        "travelTimeMinutes": 8,
        "activityDurationMinutes": 45,
        "totalTimeMinutes": 61,
        "estimatedCost": 5,
        "whyThisFits": "An 8-min walk and a $5 espresso gets you into a great coffeehouse for 60 minutes of solo reading.",
        "description": "Find a corner table at your local cafe, order something warm, and bring a book or just people-watch.",
        "tags": ["coffee", "solo", "cozy"],
        "vibe": "\u2615",
    },
    {
        "title": "Waterfront Wander",
        "type": "fitness",
        "place": "Nearest Park",
        "distanceMiles": 0.9,
        "travelTimeMinutes": 18,
        "activityDurationMinutes": 45,
        "totalTimeMinutes": 81,
        "estimatedCost": 0,
        "whyThisFits": "Free, no sign-up — a 45-min walk in nature clears your head better than anything.",
        "description": "Head to the nearest park or waterfront path, plug in some music, and let the walk clear your head.",
        "tags": ["walking", "outdoor", "free"],
        "vibe": "\ud83d\udcaa",
    },
    {
        "title": "New Books, Old Spines",
        "type": "learning",
        "place": "Local Bookstore",
        "distanceMiles": 0.6,
        "travelTimeMinutes": 12,
        "activityDurationMinutes": 40,
        "totalTimeMinutes": 64,
        "estimatedCost": 0,
        "whyThisFits": "Browse for free and walk out with a mental reading list for the week.",
        "description": "Spend 40 minutes in a bookstore you haven't visited recently. Browse with no agenda.",
        "tags": ["books", "browsing", "solo"],
        "vibe": "\ud83d\udcda",
    },
    {
        "title": "Draft Beers & Dark Wood",
        "type": "nightlife",
        "place": "Neighbourhood Bar",
        "distanceMiles": 0.7,
        "travelTimeMinutes": 14,
        "activityDurationMinutes": 60,
        "totalTimeMinutes": 88,
        "estimatedCost": 15,
        "whyThisFits": "No loud music, no attitude. $15 gets you a pint and an hour of genuine downtime.",
        "description": "Find a proper neighbourhood bar and go between 5-7pm for the calmest experience.",
        "tags": ["bar", "casual", "solo"],
        "vibe": "\ud83c\udfb5",
    },
    {
        "title": "Panoramic Sky Hunt",
        "type": "random",
        "place": "High Vantage Point",
        "distanceMiles": 1.2,
        "travelTimeMinutes": 22,
        "activityDurationMinutes": 45,
        "totalTimeMinutes": 89,
        "estimatedCost": 0,
        "whyThisFits": "Free viewpoint with a skyline view most locals never find.",
        "description": "Find the highest accessible public point in your area. Bring headphones and stay till the lights come on.",
        "tags": ["outdoor", "views", "free"],
        "vibe": "\u2728",
    },
]

BLUE_PILL_MOCK_SKILL = {
    "skill": "Urban Photography",
    "tagline": "Shoot 10 frames that actually tell a story — no camera required, just your phone.",
    "steps": [
        {"step": 1, "action": "Pick one subject (light, shadows, or strangers) and shoot only that for 30 minutes", "time": "Day 1"},
        {"step": 2, "action": "Edit 3 of your best shots using Snapseed — learn the 'selective' tool", "time": "Day 2"},
        {"step": 3, "action": "Post a photo essay (5 images + captions) to a public Instagram or Flickr", "time": "Week 1"},
        {"step": 4, "action": "Join a photo walk with a local group and shoot alongside other people", "time": "Week 2"},
    ],
}

SKILL_PATH_MOCK = {
    "music": [
        {
            "title": "Play Your First 3 Guitar Chords",
            "category": "Creative / Music",
            "timeRequired": "30 min",
            "cost": "Free",
            "whyThisFits": "G, C, and Em unlock hundreds of songs — you can strum a full progression today with zero experience.",
            "sessionPlan": [
                {"step": 1, "action": "Watch a 5-min finger placement tutorial for G chord on YouTube", "duration": "5 min"},
                {"step": 2, "action": "Practice switching between G and Em 20 times slowly", "duration": "15 min"},
                {"step": 3, "action": "Add C chord and strum G-Em-C-Em to a backing track", "duration": "10 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Strum 4-chord progression without looking at your hands", "timeframe": "Day 3"},
                {"milestone": 2, "goal": "Play an actual song start to finish", "timeframe": "Week 1"},
                {"milestone": 3, "goal": "Record a 30-second clip and share it", "timeframe": "Week 2"},
            ],
            "emoji": "\ud83c\udfb8",
        },
        {
            "title": "Beat-Make a Loop in GarageBand",
            "category": "Creative / Production",
            "timeRequired": "45 min",
            "cost": "Free",
            "whyThisFits": "GarageBand is free on Mac/iOS and has a drag-and-drop beat builder — no music theory needed.",
            "sessionPlan": [
                {"step": 1, "action": "Open GarageBand, New Project, Drummer track", "duration": "5 min"},
                {"step": 2, "action": "Pick a drum style, adjust complexity and volume sliders", "duration": "10 min"},
                {"step": 3, "action": "Add a bass loop and layer a synth pad", "duration": "30 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Build a 16-bar track with at least 3 instrument layers", "timeframe": "Day 2"},
                {"milestone": 2, "goal": "Export and share a finished 1-minute beat", "timeframe": "Week 1"},
                {"milestone": 3, "goal": "Recreate the intro of a favourite song by ear", "timeframe": "Week 3"},
            ],
            "emoji": "\ud83c\udf9b\ufe0f",
        },
        {
            "title": "Sight-Read Sheet Music Basics",
            "category": "Mental / Music Theory",
            "timeRequired": "30 min",
            "cost": "Free",
            "whyThisFits": "Learning to read music unlocks every instrument — the note names take less than one session to memorise.",
            "sessionPlan": [
                {"step": 1, "action": "Memorise treble clef lines EGBDF, spaces FACE", "duration": "10 min"},
                {"step": 2, "action": "Identify 20 random notes on a piano app without looking up answers", "duration": "10 min"},
                {"step": 3, "action": "Find a simple melody as sheet music and tap out the rhythm", "duration": "10 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Name any note on treble clef in under 3 seconds", "timeframe": "Day 4"},
                {"milestone": 2, "goal": "Play a one-line melody from sheet music", "timeframe": "Week 1"},
                {"milestone": 3, "goal": "Read and play a 16-bar piece with both clefs", "timeframe": "Week 4"},
            ],
            "emoji": "\ud83c\udfbc",
        },
    ],
    "fitness": [
        {
            "title": "First Handstand Wall Walk",
            "category": "Physical / Calisthenics",
            "timeRequired": "20 min",
            "cost": "Free",
            "whyThisFits": "Wall-assisted handstands build shoulder strength and body awareness — no equipment, no gym.",
            "sessionPlan": [
                {"step": 1, "action": "Wrist warm-up: 30 circles each direction, hold a plank for 30 sec", "duration": "5 min"},
                {"step": 2, "action": "Kick up against the wall and hold for 10 seconds, rest, repeat 5x", "duration": "10 min"},
                {"step": 3, "action": "Walk your feet up the wall slowly and try a 20-sec wall handstand hold", "duration": "5 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Hold a wall handstand for 30 unbroken seconds", "timeframe": "Day 5"},
                {"milestone": 2, "goal": "Kick up to freestanding for 2+ seconds", "timeframe": "Week 2"},
                {"milestone": 3, "goal": "Hold a freestanding handstand for 10 seconds", "timeframe": "Month 2"},
            ],
            "emoji": "\ud83e\udd38",
        },
        {
            "title": "5-Minute Mobility Routine",
            "category": "Physical / Flexibility",
            "timeRequired": "15 min",
            "cost": "Free",
            "whyThisFits": "Five targeted stretches done daily eliminate most desk-job tension in two weeks.",
            "sessionPlan": [
                {"step": 1, "action": "90/90 hip stretch: 60 sec each side on the floor", "duration": "3 min"},
                {"step": 2, "action": "Thoracic rotation: seated, hands behind head, rotate 10x each side", "duration": "3 min"},
                {"step": 3, "action": "World's greatest stretch: 5 slow reps each side", "duration": "5 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Complete the full routine 5 days in a row", "timeframe": "Day 5"},
                {"milestone": 2, "goal": "Touch the floor with straight legs", "timeframe": "Week 2"},
                {"milestone": 3, "goal": "Hold a full pigeon pose for 90 seconds each side", "timeframe": "Week 6"},
            ],
            "emoji": "\ud83e\uddd8",
        },
        {
            "title": "Jump Rope: From Zero to 50 Consecutive",
            "category": "Physical / Cardio",
            "timeRequired": "20 min",
            "cost": "Free (if you have rope) / $10 for a speed rope",
            "whyThisFits": "Jump rope is elite cardio you can do anywhere — beats 30 minutes jogging for calorie burn.",
            "sessionPlan": [
                {"step": 1, "action": "Grip check and rope length: handle should reach your armpits. Practice arm rotation without jumping", "duration": "3 min"},
                {"step": 2, "action": "Jump 10 reps, rest 20 sec: repeat 5 rounds, counting your best streak", "duration": "10 min"},
                {"step": 3, "action": "One final 60-sec attempt to hit a personal best unbroken streak", "duration": "7 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "50 consecutive jumps without stopping", "timeframe": "Day 3"},
                {"milestone": 2, "goal": "200 consecutive: no trips, controlled pace", "timeframe": "Week 2"},
                {"milestone": 3, "goal": "Learn double-unders (rope passes twice per jump)", "timeframe": "Week 4"},
            ],
            "emoji": "\ud83e\udea2",
        },
    ],
    "default": [
        {
            "title": "One-Deck Card Magic",
            "category": "Creative / Fun",
            "timeRequired": "30 min",
            "cost": "Free",
            "whyThisFits": "A single card trick done well is an instant conversation starter — learn the Ambitious Card routine in one session.",
            "sessionPlan": [
                {"step": 1, "action": "Watch the Ambitious Card tutorial by 52Kards on YouTube", "duration": "8 min"},
                {"step": 2, "action": "Slow-motion practice: work through the three phases alone", "duration": "15 min"},
                {"step": 3, "action": "Perform it for someone nearby: do it twice", "duration": "7 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Perform without any hesitations or fumbles", "timeframe": "Day 2"},
                {"milestone": 2, "goal": "Add a second trick to create a 2-minute routine", "timeframe": "Week 1"},
                {"milestone": 3, "goal": "Perform 5-minute set for 3+ people and get a reaction", "timeframe": "Week 3"},
            ],
            "emoji": "\ud83c\udccf",
        },
        {
            "title": "Sketch Anything in 30 Minutes",
            "category": "Creative / Art",
            "timeRequired": "30 min",
            "cost": "Free",
            "whyThisFits": "Contour drawing bypasses perfectionism — you finish today with 3 actual sketches.",
            "sessionPlan": [
                {"step": 1, "action": "Blind contour: pick any object, draw it without looking at the paper for 5 min", "duration": "5 min"},
                {"step": 2, "action": "Gesture sketch: draw your non-dominant hand in 3 poses, 4 min each", "duration": "12 min"},
                {"step": 3, "action": "Pick a still life (mug, phone, keys) and do one careful 10-min sketch", "duration": "13 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Complete one sketch per day for 7 days straight", "timeframe": "Week 1"},
                {"milestone": 2, "goal": "Draw a recognisable portrait of someone from life", "timeframe": "Week 2"},
                {"milestone": 3, "goal": "Fill a 20-page sketchbook", "timeframe": "Month 2"},
            ],
            "emoji": "\u270f\ufe0f",
        },
        {
            "title": "Learn 20 Words in a New Language",
            "category": "Mental / Language",
            "timeRequired": "25 min",
            "cost": "Free",
            "whyThisFits": "Spaced repetition makes 20 words stick in one session — the first 100 words cover 50% of everyday conversation.",
            "sessionPlan": [
                {"step": 1, "action": "Open Duolingo, pick a language, and complete the first 2 lessons", "duration": "10 min"},
                {"step": 2, "action": "Write the 20 new words + their meaning by hand", "duration": "10 min"},
                {"step": 3, "action": "Cover the translation column and quiz yourself: aim for 90% accuracy", "duration": "5 min"},
            ],
            "levelUpPath": [
                {"milestone": 1, "goal": "Hit a 7-day Duolingo streak", "timeframe": "Day 7"},
                {"milestone": 2, "goal": "Hold a simple 5-sentence conversation", "timeframe": "Week 2"},
                {"milestone": 3, "goal": "Watch a 10-min YouTube video in the language without subtitles", "timeframe": "Week 6"},
            ],
            "emoji": "\ud83c\udf0d",
        },
    ],
}


# ─── Blue Pill Gemini helpers ─────────────────────────────────────────────────

def _build_blue_pill_quest_prompt(params):
    loc = params.get("location", "unspecified city")
    mins = params.get("availableTimeMinutes", 60)
    budget = params.get("budget", 20)
    dist = params.get("maxDistanceMiles", 2)
    interest = params.get("interest", "anything")
    mode = params.get("mode", "solo")
    free_note = " (free only)" if budget == 0 else ""
    return f"""You are a sharp city guide helping someone use their free time well.

USER PROFILE:
- Location: {loc}
- Time available: {mins} minutes total (including travel)
- Budget: ${budget}{free_note}
- Max distance: {dist} miles
- Interest: {interest}
- Mode: {mode}

Suggest 5 specific, real activities or venues near {loc} that fit this profile.
Every quest must fit within {mins} minutes total (travel there + activity + travel back).

Return ONLY valid JSON, no markdown, no extra text:
{{
  "quests": [
    {{
      "title": "creative 3-4 word quest name",
      "type": "event|cafe|restaurant|fitness|learning|nightlife|random",
      "place": "specific real venue or location name",
      "distanceMiles": 0.0,
      "travelTimeMinutes": 0,
      "activityDurationMinutes": 0,
      "totalTimeMinutes": 0,
      "estimatedCost": 0,
      "whyThisFits": "1-2 sentences referencing their time, budget, and interest",
      "description": "2-3 sentences like a friend's recommendation: specific and honest",
      "tags": ["tag1", "tag2"],
      "vibe": "single emoji"
    }}
  ]
}}

Rules:
- Use real, specific venues that actually exist near {loc}
- Numbers must be realistic (travel time, cost, distance)
- Budget $0 means free places only
- Mix types: do not return 5 of the same category
- Keep every totalTimeMinutes within {mins} minutes"""


def _build_blue_pill_skill_prompt(interest, available_time):
    return f"""Suggest ONE skill related to "{interest}" that someone can start today with {available_time} minutes free.

Return ONLY valid JSON, no markdown, no extra text:
{{
  "skill": "skill name",
  "tagline": "one punchy sentence about what they will achieve",
  "steps": [
    {{"step": 1, "action": "specific action to take", "time": "Day X or Week X"}},
    {{"step": 2, "action": "specific action to take", "time": "Day X or Week X"}},
    {{"step": 3, "action": "specific action to take", "time": "Day X or Week X"}},
    {{"step": 4, "action": "specific action to take", "time": "Day X or Week X"}}
  ]
}}"""


def _build_skill_path_prompt(interest):
    return f"""Suggest 3 skills related to "{interest}" that someone can start learning today.

Return ONLY valid JSON, no markdown, no extra text:
{{
  "skills": [
    {{
      "title": "skill name",
      "category": "Domain / Subcategory",
      "timeRequired": "X min",
      "cost": "Free or $X",
      "whyThisFits": "1-2 sentences explaining why this skill is a great starting point",
      "sessionPlan": [
        {{"step": 1, "action": "specific action", "duration": "X min"}},
        {{"step": 2, "action": "specific action", "duration": "X min"}},
        {{"step": 3, "action": "specific action", "duration": "X min"}}
      ],
      "levelUpPath": [
        {{"milestone": 1, "goal": "achievable goal", "timeframe": "Day X or Week X"}},
        {{"milestone": 2, "goal": "achievable goal", "timeframe": "Week X"}},
        {{"milestone": 3, "goal": "achievable goal", "timeframe": "Month X"}}
      ],
      "emoji": "single relevant emoji"
    }}
  ]
}}

Return exactly 3 skills, ranging from beginner to more advanced. All should be actionable today."""


def _parse_blue_pill_json(raw):
    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        try:
            repaired = re.sub(r",(\s*[}\]])", r"\1", m.group(0))
            return json.loads(repaired)
        except Exception:
            pass
    return None


_VIBES = {
    "event": "\ud83c\udfdf\ufe0f", "cafe": "\u2615", "restaurant": "\ud83c\udf7d\ufe0f",
    "fitness": "\ud83d\udcaa", "learning": "\ud83d\udcda", "nightlife": "\ud83c\udfb5", "random": "\u2728",
}


def blue_pill_gemini(params):
    interest = params.get("interest", "anything")
    available_time = params.get("availableTimeMinutes", 60)

    quest_raw = call_gemini(
        _build_blue_pill_quest_prompt(params), grounding=False, want_json=True
    )
    skill_raw = call_gemini(
        _build_blue_pill_skill_prompt(interest, available_time), grounding=False, want_json=True
    )

    quest_parsed = _parse_blue_pill_json(quest_raw)
    skill_parsed = _parse_blue_pill_json(skill_raw)

    quests = quest_parsed.get("quests", []) if quest_parsed else []
    for q in quests:
        if not q.get("vibe"):
            q["vibe"] = _VIBES.get(q.get("type", ""), "\u26a1")

    skill = (
        skill_parsed
        if skill_parsed and "skill" in skill_parsed
        else BLUE_PILL_MOCK_SKILL
    )

    return {"quests": quests or BLUE_PILL_MOCK_QUESTS, "skill": skill}


def skill_path_gemini(interest):
    raw = call_gemini(
        _build_skill_path_prompt(interest), grounding=False, want_json=True
    )
    parsed = _parse_blue_pill_json(raw)
    if parsed and isinstance(parsed.get("skills"), list) and parsed["skills"]:
        return parsed["skills"]
    return None


def _get_mock_skills(interest):
    key = next(
        (k for k in SKILL_PATH_MOCK if k != "default" and k in interest.lower()),
        "default",
    )
    return SKILL_PATH_MOCK[key]


def _norm_request_path(path: str) -> str:
    """Strip query string and trailing slash so /api/x and /api/x?y=1 match handlers."""
    p = (path or "").split("?", 1)[0].rstrip("/")
    return p or "/"


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
        if _norm_request_path(self.path) == "/api/health":
            or_cfg = use_openrouter()
            oa = ollama_reachable()
            return self._send_json(
                200,
                {
                    "ok": True,
                    "provider": "openrouter" if or_cfg else "ollama",
                    "model": OPENROUTER_MODEL if or_cfg else OLLAMA_MODEL,
                    "visionModel": (
                        OPENROUTER_VISION_MODEL if or_cfg else OLLAMA_VISION_MODEL
                    )
                    or None,
                    "openrouterConfigured": or_cfg,
                    "ollamaHost": OLLAMA_HOST,
                    "ollamaReachable": oa,
                    "hasKey": or_cfg or oa,
                },
            )

        url_path = _norm_request_path(self.path)
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
        path = _norm_request_path(self.path)
        if path == "/api/generate-tasks":
            return self._handle_generate_tasks()
        elif path == "/api/blue-pill":
            return self._handle_blue_pill()
        elif path == "/api/skill-path":
            return self._handle_skill_path()
        else:
            return self._send_json(
                404, {"ok": False, "error": f"Unknown API route: POST {path}"}
            )

    def _handle_generate_tasks(self):
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

        start_time = _normalize_hhmm(str(body.get("startTime") or ""))
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

        availability = None

        def _respond_ok(tasks, research, source: str):
            return self._send_json(
                200,
                {
                    "ok": True,
                    "tasks": tasks,
                    "research": research,
                    "availability": availability or "",
                    "source": source,
                },
            )

        try:
            llm_up = llm_ready()
            vchain = active_vision_chain()

            # PASS 0: .ics parses locally; images use vision model when configured
            if calendar.get("type") == "ics":
                print("[generate] pass 0: .ics availability (local parse)...", flush=True)
                try:
                    availability = analyze_ics(
                        str(calendar.get("text", "")), daily_minutes
                    )
                except Exception as ce:
                    print(f"[generate] ics parse failed: {ce}", flush=True)
            elif calendar.get("type") == "images":
                imgs = calendar.get("images") or []
                if imgs and llm_up and vchain:
                    print("[generate] pass 0: calendar images (vision)...", flush=True)
                    try:
                        availability = analyze_images(imgs, daily_minutes)
                    except Exception as ve:
                        print(
                            f"[generate] image calendar analysis failed: {ve}",
                            flush=True,
                        )
                elif imgs:
                    print(
                        "[generate] skipping calendar vision "
                        "(no API key / Ollama down, or no vision model in .env)",
                        flush=True,
                    )

            if availability:
                print(
                    f"[generate] availability summary: {len(availability)} chars",
                    flush=True,
                )

            if not llm_up:
                print(
                    "[generate] Set OPENROUTER_API_KEY (cloud) or start Ollama — offline ladder",
                    flush=True,
                )
                tasks = _offline_tasks(
                    goal,
                    days,
                    daily_minutes,
                    start_weekday,
                    start_time,
                    availability,
                )
                return _respond_ok(
                    tasks,
                    _fallback_research(goal, days, daily_minutes),
                    "offline",
                )

            # PASS 1: research
            backend = "OpenRouter" if use_openrouter() else "Ollama"
            print(f"[generate] pass 1: research ({backend})...", flush=True)
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

            src = "cloud" if use_openrouter() else "local"
            return _respond_ok(tasks, research, src)
        except Exception as e:
            print(f"[generate] error: {e}", flush=True)
            print("[generate] falling back to offline task ladder", flush=True)
            tasks = _offline_tasks(
                goal,
                days,
                daily_minutes,
                start_weekday,
                start_time,
                availability,
            )
            return _respond_ok(
                tasks,
                _fallback_research(goal, days, daily_minutes),
                "offline",
            )

    def _handle_blue_pill(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            body = json.loads(raw or "{}")
        except Exception:
            return self._send_json(400, {"ok": False, "error": "Invalid JSON"})

        location = str(body.get("location", "")).strip()
        interest = str(body.get("interest", "")).strip()
        if not location:
            return self._send_json(400, {"ok": False, "error": "Missing location"})
        if not interest:
            return self._send_json(400, {"ok": False, "error": "Missing interest"})

        params = {
            "location": location,
            "availableTimeMinutes": int(body.get("availableTimeMinutes", 60)),
            "budget": int(body.get("budget", 20)),
            "maxDistanceMiles": float(body.get("maxDistanceMiles", 2.0)),
            "interest": interest,
            "mode": str(body.get("mode", "solo")).strip(),
        }

        print(
            f'[blue-pill] location="{location}" time={params["availableTimeMinutes"]}min '
            f'budget=${params["budget"]} interest="{interest}"',
            flush=True,
        )

        try:
            if GEMINI_API_KEY:
                print("[blue-pill] calling Gemini to curate quests + skill...", flush=True)
                result = blue_pill_gemini(params)
            else:
                print("[blue-pill] no API key — returning mock data", flush=True)
                result = {"quests": BLUE_PILL_MOCK_QUESTS, "skill": BLUE_PILL_MOCK_SKILL}
            return self._send_json(200, {"ok": True, **result})
        except Exception as e:
            print(f"[blue-pill] error: {e}", flush=True)
            return self._send_json(500, {"ok": False, "error": str(e)})

    def _handle_skill_path(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            body = json.loads(raw or "{}")
        except Exception:
            return self._send_json(400, {"ok": False, "error": "Invalid JSON"})

        interest = str(body.get("interest", "")).strip()
        if not interest:
            return self._send_json(400, {"ok": False, "error": "Missing interest"})

        print(f'[skill-path] interest="{interest}"', flush=True)

        try:
            if GEMINI_API_KEY:
                print("[skill-path] calling Gemini to generate skills...", flush=True)
                skills = skill_path_gemini(interest)
                if not skills:
                    skills = _get_mock_skills(interest)
            else:
                print("[skill-path] no API key — returning mock data", flush=True)
                skills = _get_mock_skills(interest)
            return self._send_json(200, {"ok": True, "skills": skills})
        except Exception as e:
            print(f"[skill-path] error: {e}", flush=True)
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
    if use_openrouter():
        print(f"LLM: OpenRouter  model={OPENROUTER_MODEL}")
        print(f"     Vision: {OPENROUTER_VISION_MODEL}")
        print(f"     Fallbacks: {', '.join(OPENROUTER_MODEL_CHAIN)}")
    else:
        print(f"LLM: Ollama at {OLLAMA_HOST} (set OPENROUTER_API_KEY to use cloud)")
        print(f"     Text: {', '.join(OLLAMA_MODEL_CHAIN)}")
        if OLLAMA_VISION_CHAIN:
            print(f"     Vision: {', '.join(OLLAMA_VISION_CHAIN)}")
        if not ollama_reachable():
            print("WARNING: Ollama not reachable — /api/generate-tasks will use offline tasks.")
        else:
            print("Ollama: reachable")
    print("Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
