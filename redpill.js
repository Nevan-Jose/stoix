// STOIX // Red Pill — goal -> timeline -> tasks -> .ics export
(function () {
  // ---------- State ----------
  const state = {
    goal: "",
    startDate: null,
    endDate: null,
    dailyMinutes: 60,
    startTime: "09:00",
    tasks: [], // [{ title, date: Date, durationMin, phase, dayNumber, totalDays, description }]
    completion: {}, // { taskIndex: true }
  };

  // ---------- Screen routing ----------
  const screens = {
    intro: document.getElementById("screen-intro"),
    choice: document.getElementById("screen-choice"),
    blue: document.getElementById("screen-blue"),
    goal: document.getElementById("screen-goal"),
    timeline: document.getElementById("screen-timeline"),
    loading: document.getElementById("screen-loading"),
    error: document.getElementById("screen-error"),
    schedule: document.getElementById("screen-schedule"),
  };
  const hudMessages = {
    intro:    "SYSTEM BOOT //",
    choice:   "DECISION POINT //",
    blue:     "BLUE PATH (SOON) //",
    goal:     "AWAITING INPUT //",
    timeline: "CONFIGURING TIMELINE //",
    loading:  "RESEARCH IN PROGRESS //",
    error:    "ENGINE FAILURE //",
    schedule: "PROTOCOL ACTIVE //",
  };
  function show(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    const hud = document.getElementById("hud-status");
    if (hud && hudMessages[name]) hud.textContent = hudMessages[name];
    // HUD + rain visibility are controlled by the intro-phase body class
    if (name !== "intro") {
      document.body.classList.remove("intro-phase");
    }
    // Trigger typewriter on goal screen every time it becomes active
    if (name === "goal") runTypewriter();
  }

  // Typewriter for the goal prompt
  function runTypewriter() {
    const el = document.getElementById("prompt-goal");
    if (!el) return;
    el.classList.remove("typing");
    // Force reflow so the animation restarts
    void el.offsetWidth;
    el.classList.add("typing");
  }

  // ---------- INTRO sequence ----------
  //
  // Screen goes black (matrix rain held at 0 opacity by body.intro-phase).
  // Typewriter "Hello", 5s pause, typewriter the philosophical question,
  // 10s pause, fade in rain (body.intro-phase-rain), then advance to
  // pill choice. Skippable any time via button or keypress.
  const INTRO_TEXT_1 = "Hello";
  const INTRO_TEXT_2 = "Have you ever felt that there's something strange about this world?";

  let introCancelled = false;
  const introTimers = [];

  function cancelIntro() {
    introCancelled = true;
    introTimers.forEach(clearTimeout);
  }

  function typeInto(el, text, charDelay = 80) {
    return new Promise((resolve) => {
      if (introCancelled) return resolve();
      el.classList.add("visible");
      el.firstChild; // noop, just to keep lint happy
      // Build: <span class="typed"></span><span class="intro-caret">█</span>
      el.innerHTML = `<span class="typed"></span><span class="intro-caret">&#9608;</span>`;
      const typed = el.querySelector(".typed");
      let i = 0;
      function step() {
        if (introCancelled) return resolve();
        if (i <= text.length) {
          typed.textContent = text.slice(0, i);
          i++;
          const t = setTimeout(step, charDelay + Math.random() * 40);
          introTimers.push(t);
        } else {
          resolve();
        }
      }
      step();
    });
  }

  function wait(ms) {
    return new Promise((resolve) => {
      if (introCancelled) return resolve();
      const t = setTimeout(resolve, ms);
      introTimers.push(t);
    });
  }

  async function runIntro() {
    document.body.classList.add("intro-phase");
    const helloEl = document.getElementById("intro-hello");
    const questionEl = document.getElementById("intro-question");

    if (helloEl) {
      helloEl.classList.add("size-hello");
      helloEl.innerHTML = "";
    }
    if (questionEl) {
      questionEl.classList.add("size-question");
      questionEl.innerHTML = "";
      questionEl.classList.remove("visible");
    }

    // Phase 1: Hello
    if (helloEl) await typeInto(helloEl, INTRO_TEXT_1, 180);
    if (introCancelled) return finishIntro();

    // 5 second pause
    await wait(5000);
    if (introCancelled) return finishIntro();

    // Phase 2: the question
    if (questionEl) await typeInto(questionEl, INTRO_TEXT_2, 55);
    if (introCancelled) return finishIntro();

    // 10 second pause, during which we start swelling the rain in
    document.body.classList.add("intro-phase-rain");
    await wait(10000);
    if (introCancelled) return finishIntro();

    finishIntro();
  }

  function finishIntro() {
    document.body.classList.remove("intro-phase");
    document.body.classList.remove("intro-phase-rain");
    localStorage.setItem("stoix.introSeen", "1");
    routeAfterIntro();
  }

  // Skip button + keypress
  document.getElementById("skip-intro").addEventListener("click", () => {
    if (!introCancelled) {
      cancelIntro();
      finishIntro();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (screens.intro.classList.contains("active") && !introCancelled) {
      // Any key except modifiers
      if (!["Control", "Shift", "Meta", "Alt"].includes(e.key)) {
        cancelIntro();
        finishIntro();
      }
    }
  });

  // ---------- ENTRY-POINT ROUTING ----------
  //
  // First visit → intro → pill choice
  // Returning with an active plan → straight to planner
  // Returning without plan → pill choice (skip intro)
  function bootstrap() {
    const introSeen = localStorage.getItem("stoix.introSeen") === "1";
    const activePlan = loadActivePlan();

    if (activePlan) {
      restoreActivePlan(activePlan);
      show("schedule");
      return;
    }

    if (!introSeen) {
      show("intro");
      runIntro();
      return;
    }

    // Returning user, no active plan → pill choice
    show("choice");
  }

  function routeAfterIntro() {
    // After intro completes, always go to pill choice
    show("choice");
  }

  // ---------- PILL CHOICE wiring ----------
  document.getElementById("pill-red").addEventListener("click", () => {
    // Red Pill = the existing goal → timeline → protocol flow
    show("goal");
  });
  document.getElementById("pill-blue").addEventListener("click", () => {
    show("blue");
  });
  document.getElementById("blue-back").addEventListener("click", () => {
    show("choice");
  });

  // ---------- Active plan persistence ----------
  //
  // Saves the most recent plan to localStorage so returning users
  // jump straight back into their active protocol.
  const ACTIVE_PLAN_KEY = "stoix.activePlan";

  function saveActivePlan() {
    try {
      const payload = {
        goal: state.goal,
        startDate: state.startDate ? state.startDate.toISOString() : null,
        endDate: state.endDate ? state.endDate.toISOString() : null,
        dailyMinutes: state.dailyMinutes,
        startTime: state.startTime,
        source: state.source,
        research: state.research || "",
        decomposition: state.decomposition || null,
        tasks: state.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          phase: t.phase,
          milestone: t.milestone || "",
          scheduledTime: t.scheduledTime || "",
          scheduleNote: t.scheduleNote || "",
          date: t.date.toISOString(),
          durationMin: t.durationMin,
          dayNumber: t.dayNumber,
          totalDays: t.totalDays,
        })),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save active plan:", e);
    }
  }

  function loadActivePlan() {
    try {
      const raw = localStorage.getItem(ACTIVE_PLAN_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || !Array.isArray(p.tasks) || !p.tasks.length) return null;
      return p;
    } catch {
      return null;
    }
  }

  function restoreActivePlan(p) {
    state.goal = p.goal || "";
    state.startDate = p.startDate ? new Date(p.startDate) : null;
    state.endDate = p.endDate ? new Date(p.endDate) : null;
    state.dailyMinutes = p.dailyMinutes || 30;
    state.startTime = p.startTime || "09:00";
    state.source = p.source || "ai";
    state.research = p.research || "";
    state.decomposition = p.decomposition || null;
    state.tasks = (p.tasks || []).map((t) => ({
      ...t,
      date: new Date(t.date),
    }));
    renderSchedule();
  }

  function clearActivePlan() {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
  }

  // Kick off bootstrap on load
  window.addEventListener("DOMContentLoaded", bootstrap);

  // ---------- Defaults ----------
  const today = new Date();
  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(today.getDate() + 14);
  document.getElementById("start-date").value = toDateInput(today);
  document.getElementById("end-date").value = toDateInput(inTwoWeeks);

  function toDateInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---------- Step 1: Goal ----------
  document.getElementById("goal-next").addEventListener("click", () => {
    const goal = document.getElementById("goal-input").value.trim();
    if (!goal) {
      alert("Define your goal to continue.");
      return;
    }
    state.goal = goal;
    show("timeline");
  });

  // ---------- Step 2: Timeline ----------
  document.getElementById("timeline-back").addEventListener("click", () => show("goal"));

  document.getElementById("timeline-next").addEventListener("click", async () => {
    const sd = document.getElementById("start-date").value;
    const ed = document.getElementById("end-date").value;
    const dm = parseInt(document.getElementById("daily-time").value, 10);
    const st = document.getElementById("start-time").value;

    if (!sd || !ed) return alert("Set both start and end dates.");
    const start = new Date(sd + "T00:00:00");
    const end = new Date(ed + "T00:00:00");
    if (end < start) return alert("End date must be after start date.");
    if (!dm || dm < 5 || dm > 60) return alert("Daily time must be between 5 and 60 minutes.");

    state.startDate = start;
    state.endDate = end;
    state.dailyMinutes = dm;
    state.startTime = st;

    // Package the calendar input (if any) for the backend
    state.calendar = await collectCalendarInput();

    await runProtocolPipeline();
  });

  // ---------- Calendar upload UI ----------
  const calState = {
    mode: "images",     // 'images' | 'ics' | 'skip'
    images: [],         // [{ name, mime, dataURL }]
    ics: null,          // { name, text }
  };

  // --- Shared file intake (used by both goal-screen attach and timeline block) ---
  async function ingestFile(file) {
    if (!file) return;

    const isImage = file.type && file.type.startsWith("image/");
    const isICS = /\.ics$/i.test(file.name) || file.type === "text/calendar";

    if (isImage) {
      if (calState.images.length >= 5) {
        alert("Maximum 5 images.");
        return;
      }
      const dataURL = await fileToDataURL(file);
      calState.images.push({ name: file.name || "pasted.png", mime: file.type || "image/png", dataURL });
      calState.mode = "images";
      syncCalendarUI();
    } else if (isICS) {
      const text = await file.text();
      calState.ics = { name: file.name || "calendar.ics", text, size: file.size || text.length };
      calState.mode = "ics";
      syncCalendarUI();
    } else {
      alert("Only images or .ics calendar files are supported.");
    }
  }

  // Keep the goal-screen preview + timeline-screen UI in sync
  function syncCalendarUI() {
    // Goal-screen preview strip
    renderAttachPreview();
    // Timeline-screen previews
    renderImagePreviews();
    renderICSPreview();
    // Timeline tab reflects current mode
    document.querySelectorAll(".cal-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.caltab === calState.mode);
    });
    document.querySelectorAll(".cal-pane").forEach((p) => {
      p.classList.toggle("active", p.dataset.calpane === calState.mode);
    });
  }

  // Goal-screen attach: click-to-browse + paste + drag-drop
  const attachBtn = document.getElementById("attach-btn");
  const attachInput = document.getElementById("attach-file-input");
  const goalTextarea = document.getElementById("goal-input");
  const goalBox = goalTextarea && goalTextarea.closest(".goal-box");

  if (attachBtn && attachInput) {
    attachBtn.addEventListener("click", () => attachInput.click());
    attachInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) await ingestFile(f);
      e.target.value = "";
    });
  }

  // Paste handler — supports screenshot clipboard and file clipboard
  if (goalTextarea) {
    goalTextarea.addEventListener("paste", async (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      let handledAny = false;
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            handledAny = true;
            await ingestFile(file);
          }
        }
      }
      // If we attached something, prevent the default text paste (empty anyway)
      if (handledAny) e.preventDefault();
    });
  }

  // Drag-and-drop onto the goal box
  if (goalBox) {
    ["dragenter", "dragover"].forEach((evt) => {
      goalBox.addEventListener(evt, (e) => {
        e.preventDefault();
        goalBox.classList.add("drag-active");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      goalBox.addEventListener(evt, (e) => {
        if (evt === "drop") e.preventDefault();
        // leave only fires when actually leaving — use relatedTarget check
        if (evt === "dragleave" && goalBox.contains(e.relatedTarget)) return;
        goalBox.classList.remove("drag-active");
      });
    });
    goalBox.addEventListener("drop", async (e) => {
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      for (const f of files) await ingestFile(f);
    });
  }

  // Render the attached-file chip strip under the goal textarea
  function renderAttachPreview() {
    const wrap = document.getElementById("attach-preview");
    if (!wrap) return;
    const chips = [];

    calState.images.forEach((img, idx) => {
      chips.push(`
        <div class="attach-chip" data-kind="image" data-idx="${idx}">
          <span class="thumb"><img src="${img.dataURL}" alt="" /></span>
          <span class="name">${escapeHTML(img.name || "image")}</span>
          <button type="button" class="remove" aria-label="Remove">&times;</button>
        </div>
      `);
    });

    if (calState.ics) {
      chips.push(`
        <div class="attach-chip" data-kind="ics">
          <span class="thumb">&#128197;</span>
          <span class="name">${escapeHTML(calState.ics.name)}</span>
          <button type="button" class="remove" aria-label="Remove">&times;</button>
        </div>
      `);
    }

    if (!chips.length) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }

    wrap.hidden = false;
    wrap.innerHTML = chips.join("");

    wrap.querySelectorAll(".attach-chip").forEach((chip) => {
      chip.querySelector(".remove").addEventListener("click", () => {
        if (chip.dataset.kind === "image") {
          calState.images.splice(parseInt(chip.dataset.idx, 10), 1);
        } else if (chip.dataset.kind === "ics") {
          calState.ics = null;
        }
        syncCalendarUI();
      });
    });
  }

  // Tab switching
  document.querySelectorAll(".cal-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.caltab;
      calState.mode = mode;
      document
        .querySelectorAll(".cal-tab")
        .forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".cal-pane").forEach((p) => {
        p.classList.toggle("active", p.dataset.calpane === mode);
      });
    });
  });

  // Image input — additive, capped at 5
  document
    .getElementById("cal-images")
    .addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        if (calState.images.length >= 5) break;
        await ingestFile(f);
      }
      e.target.value = "";
    });

  // ICS input
  document.getElementById("cal-ics").addEventListener("change", async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    await ingestFile(file);
    e.target.value = "";
  });

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderImagePreviews() {
    const wrap = document.getElementById("cal-image-preview");
    wrap.innerHTML = "";
    if (!calState.images.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    calState.images.forEach((img, idx) => {
      const el = document.createElement("div");
      el.className = "cal-preview-item";
      el.innerHTML = `
        <img src="${img.dataURL}" alt="${escapeHTML(img.name)}" />
        <button type="button" class="cal-preview-remove" aria-label="Remove">&times;</button>
      `;
      el.querySelector(".cal-preview-remove").addEventListener("click", () => {
        calState.images.splice(idx, 1);
        renderImagePreviews();
      });
      wrap.appendChild(el);
    });
  }

  function renderICSPreview() {
    const wrap = document.getElementById("cal-ics-preview");
    if (!calState.ics) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    const kb = Math.max(1, Math.round(calState.ics.size / 1024));
    wrap.innerHTML = `
      <div class="cal-ics-item">
        <span>&#128197;</span>
        <span class="ics-name">${escapeHTML(calState.ics.name)}</span>
        <span class="ics-size">${kb} KB</span>
        <button type="button" class="cal-preview-remove" aria-label="Remove">&times;</button>
      </div>
    `;
    wrap.querySelector(".cal-preview-remove").addEventListener("click", () => {
      calState.ics = null;
      renderICSPreview();
    });
  }

  async function collectCalendarInput() {
    if (calState.mode === "images" && calState.images.length) {
      // Strip the data: prefix — backend expects raw base64
      return {
        type: "images",
        images: calState.images.map((i) => ({
          name: i.name,
          mime: i.mime || "image/png",
          base64: i.dataURL.split(",")[1] || "",
        })),
      };
    }
    if (calState.mode === "ics" && calState.ics) {
      return { type: "ics", name: calState.ics.name, text: calState.ics.text };
    }
    return { type: "none" };
  }

  async function runProtocolPipeline() {
    const days = daysBetween(state.startDate, state.endDate) + 1;

    show("loading");
    runPipelineAnimation();

    let errorCode = "UNKNOWN";
    let errorMessage = "";

    try {
      const resp = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: state.goal,
          days,
          dailyMinutes: state.dailyMinutes,
          startTime: state.startTime,
          startDate: toDateInput(state.startDate),
          calendar: state.calendar || { type: "none" },
        }),
      });

      if (!resp.ok) {
        errorCode = `HTTP ${resp.status}`;
        try {
          const data = await resp.json();
          errorMessage = data.error || `Server returned ${resp.status}.`;
        } catch {
          errorMessage = `Server returned ${resp.status}.`;
        }
        return showPipelineError(errorCode, errorMessage);
      }

      const data = await resp.json();
      if (!data.ok || !Array.isArray(data.tasks) || !data.tasks.length) {
        errorCode = "NO_TASKS";
        errorMessage =
          data.error ||
          "The AI returned a response but no usable tasks were produced.";
        return showPipelineError(errorCode, errorMessage);
      }

      // Success — real AI-generated, research-backed tasks
      state.tasks = buildTasksFromAI(
        data.tasks,
        state.startDate,
        state.dailyMinutes,
        days
      );
      state.research = data.research || "";
      state.decomposition =
        (data.tasks[0] && data.tasks[0]._decomposition) || null;
      state.source = "ai";

      completePipeline();
      // Let the final ✓ breathe for a moment before transitioning
      await new Promise((r) => setTimeout(r, 500));

      renderSchedule();
      saveActivePlan();
      show("schedule");
    } catch (err) {
      // Network failure, server offline, CORS, JSON parse, etc.
      errorCode = "NETWORK";
      errorMessage =
        (err && err.message) ||
        "Could not reach the STOIX research engine. Is the Python server running?";
      return showPipelineError(errorCode, errorMessage);
    }
  }

  function showPipelineError(code, message) {
    // Cancel any in-flight pipeline animation
    pipelineTimers.forEach(clearTimeout);
    pipelineTimers = [];

    document.getElementById("error-code").textContent = code;
    document.getElementById("error-message").textContent =
      message || "Unknown error.";
    show("error");
  }

  // Error screen wiring
  document
    .getElementById("error-back")
    .addEventListener("click", () => show("goal"));
  document
    .getElementById("error-retry")
    .addEventListener("click", () => runProtocolPipeline());

  // Convert AI task objects into the shape the planner expects
  function buildTasksFromAI(aiTasks, startDate, dailyMinutes, days) {
    // Sort by day, trim to exactly `days`
    const sorted = aiTasks.slice().sort((a, b) => (a.day || 0) - (b.day || 0));
    const trimmed = sorted.slice(0, days);

    return trimmed.map((t, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const phase = normalizePhase(t.phase, i, days);
      // AI may return a per-task "scheduled_time" (HH:MM) informed by
      // the user's calendar. Fall back to the generic preferred start time.
      const scheduledTime =
        (t.scheduled_time && /^\d{2}:\d{2}$/.test(t.scheduled_time))
          ? t.scheduled_time
          : state.startTime;
      return {
        title: String(t.title || `Day ${i + 1}`).trim(),
        description: String(t.description || "").trim(),
        phase,
        milestone: t.milestone ? String(t.milestone).trim() : "",
        scheduledTime,
        scheduleNote: t.schedule_note ? String(t.schedule_note).trim() : "",
        date,
        durationMin: dailyMinutes,
        dayNumber: i + 1,
        totalDays: days,
      };
    });
  }

  function normalizePhase(phase, idx, total) {
    const valid = ["Foundation", "Build", "Push", "Mastery"];
    if (phase && valid.includes(phase)) return phase;
    const pct = idx / total;
    if (pct < 0.25) return "Foundation";
    if (pct < 0.5) return "Build";
    if (pct < 0.75) return "Push";
    return "Mastery";
  }

  // Pipeline progress animation: advances through the 3 steps on a timer
  // so the user sees steady progress during the long AI call.
  let pipelineTimers = [];
  function runPipelineAnimation() {
    const items = document.querySelectorAll("#pipeline li");
    const status = document.getElementById("loading-status");
    items.forEach((li) => li.classList.remove("active", "done"));

    // Step 1 — Research
    items[0].classList.add("active");
    if (status) status.textContent = "Searching the web for evidence-based methods...";

    pipelineTimers.push(
      setTimeout(() => {
        items[0].classList.remove("active");
        items[0].classList.add("done");
        items[1].classList.add("active");
        if (status)
          status.textContent =
            "Decomposing the goal into prerequisites and milestones...";
      }, 9000)
    );

    pipelineTimers.push(
      setTimeout(() => {
        items[1].classList.remove("active");
        items[1].classList.add("done");
        items[2].classList.add("active");
        if (status)
          status.textContent = "Sequencing daily micro-actions into your protocol...";
      }, 18000)
    );
  }

  function completePipeline() {
    pipelineTimers.forEach(clearTimeout);
    pipelineTimers = [];
    const items = document.querySelectorAll("#pipeline li");
    items.forEach((li) => {
      li.classList.remove("active");
      li.classList.add("done");
    });
    const status = document.getElementById("loading-status");
    if (status) status.textContent = "Protocol ready.";
  }

  // ---------- Step 3: Schedule ----------
  document.getElementById("schedule-new").addEventListener("click", () => {
    const confirmNew = confirm(
      "Start a new protocol? Your current plan will be cleared from this device."
    );
    if (!confirmNew) return;
    clearActivePlan();
    // Reset in-memory state as well so the goal screen is clean
    state.goal = "";
    state.tasks = [];
    state.completion = {};
    document.getElementById("goal-input").value = "";
    // Also clear any uploaded calendar attachments
    calState.images = [];
    calState.ics = null;
    if (typeof syncCalendarUI === "function") syncCalendarUI();
    show("choice");
  });
  document.getElementById("export-ics").addEventListener("click", exportICS);


  function daysBetween(a, b) {
    const ms = 24 * 60 * 60 * 1000;
    return Math.round((b - a) / ms);
  }

  // ---------- Planner state ----------
  // Persistent completion + view state keyed by a stable plan ID
  const PLAN_KEY = "stoix.redpill.plan";
  let currentView = "week"; // 'week' | 'today' | 'list'
  let weekOffset = 0; // 0 = first week, 1 = second, etc.

  function planId() {
    // Stable signature so reopening the same plan restores completion state
    return (
      "p::" +
      btoa(unescape(encodeURIComponent(state.goal))).slice(0, 16) +
      "::" +
      toDateInput(state.startDate) +
      "::" +
      state.tasks.length
    );
  }

  function loadCompletion() {
    try {
      const all = JSON.parse(localStorage.getItem(PLAN_KEY) || "{}");
      return all[planId()] || {};
    } catch {
      return {};
    }
  }
  function saveCompletion(map) {
    try {
      const all = JSON.parse(localStorage.getItem(PLAN_KEY) || "{}");
      all[planId()] = map;
      localStorage.setItem(PLAN_KEY, JSON.stringify(all));
    } catch {}
  }

  function isDone(i) {
    return !!state.completion[i];
  }
  function toggleDone(i) {
    state.completion[i] = !state.completion[i];
    saveCompletion(state.completion);
    updateProgress();
    // Re-render the currently active view so changes propagate everywhere
    renderCurrentView();
  }

  // ---------- Render schedule (top-level) ----------
  function renderSchedule() {
    const sourceBadge =
      state.source === "ai"
        ? '  ·  <span class="source-badge ai">AI-researched</span>'
        : '  ·  <span class="source-badge offline">Offline template</span>';
    document.getElementById("schedule-summary").innerHTML =
      `${state.tasks.length} tasks · ${state.dailyMinutes} min/day · ${escapeHTML(
        formatDate(state.startDate)
      )} → ${escapeHTML(formatDate(state.endDate))}${sourceBadge}`;

    state.completion = loadCompletion();

    // Jump to the week containing "today" if it falls inside the plan
    weekOffset = defaultWeekOffset();

    updateProgress();
    renderCurrentView();
  }

  function renderCurrentView() {
    document.querySelectorAll(".view-panel").forEach((p) => p.classList.remove("active"));
    document.getElementById("view-" + currentView).classList.add("active");

    document.querySelectorAll(".view-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === currentView)
    );

    // Week nav only visible in week view
    document.getElementById("week-nav").style.display =
      currentView === "week" ? "flex" : "none";

    if (currentView === "week") renderWeekView();
    if (currentView === "today") renderTodayView();
    if (currentView === "list") renderListView();
  }

  // ---------- Progress ----------
  function updateProgress() {
    const total = state.tasks.length;
    const done = state.tasks.reduce((n, _, i) => n + (isDone(i) ? 1 : 0), 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById("progress-count").textContent = `${done} / ${total} completed`;
    document.getElementById("progress-percent").textContent = `${pct}%`;
    document.getElementById("progress-fill").style.width = pct + "%";
  }

  // ---------- Week helpers ----------
  function startOfWeek(d) {
    // Monday as first day of week
    const day = d.getDay(); // 0=Sun..6=Sat
    const delta = (day + 6) % 7; // Mon->0, Sun->6
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - delta);
    return s;
  }

  function planWeekStart(offset) {
    const base = startOfWeek(state.startDate);
    const s = new Date(base);
    s.setDate(base.getDate() + offset * 7);
    return s;
  }

  function totalWeeks() {
    const first = startOfWeek(state.startDate);
    const last = startOfWeek(state.endDate);
    return Math.round((last - first) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  function defaultWeekOffset() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < state.startDate) return 0;
    if (today > state.endDate) return totalWeeks() - 1;
    const first = startOfWeek(state.startDate);
    return Math.floor((startOfWeek(today) - first) / (7 * 24 * 60 * 60 * 1000));
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // ---------- Week view ----------
  function renderWeekView() {
    const board = document.getElementById("week-board");
    board.innerHTML = "";

    const weekStart = planWeekStart(weekOffset);
    const label = document.getElementById("week-label");
    const total = totalWeeks();
    label.textContent = `Week ${weekOffset + 1} / ${total}`;

    document.getElementById("week-prev").disabled = weekOffset <= 0;
    document.getElementById("week-next").disabled = weekOffset >= total - 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);

      const col = document.createElement("div");
      col.className = "day-column";
      if (sameDay(day, today)) col.classList.add("is-today");
      if (day < today && !sameDay(day, today)) col.classList.add("is-past");

      const inPlan =
        day >= stripTime(state.startDate) && day <= stripTime(state.endDate);

      const dayTasks = state.tasks
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => sameDay(t.date, day));

      if (dayTasks.length === 0) col.classList.add("is-empty");

      col.innerHTML = `
        <div class="day-header">
          <span class="dow">${DOW[i]}</span>
          <span class="dnum">${day.getDate()}</span>
        </div>
        <div class="day-body"></div>
      `;

      const body = col.querySelector(".day-body");
      dayTasks.forEach(({ t, idx }) => {
        body.appendChild(buildTaskCard(t, idx));
      });

      if (!inPlan) col.style.visibility = "hidden"; // keep grid shape but hide
      board.appendChild(col);
    }
  }

  function stripTime(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function buildTaskCard(t, idx) {
    const card = document.createElement("div");
    card.className = "task-card" + (isDone(idx) ? " is-done" : "");
    const phaseClass = (t.phase || "Build").toLowerCase();
    card.innerHTML = `
      <div class="card-top">
        <button class="check ${isDone(idx) ? "checked" : ""}" aria-label="Complete task"></button>
        <div class="card-title">${escapeHTML(t.title)}</div>
      </div>
      <div class="card-meta">
        <span><span class="phase-dot ${phaseClass}"></span> ${escapeHTML(t.phase)}</span>
        <span>${t.scheduledTime || state.startTime} · ${t.durationMin}m</span>
      </div>
    `;
    card.querySelector(".check").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDone(idx);
    });
    card.addEventListener("click", () => openDrawer(idx));
    return card;
  }

  // ---------- Today / grouped view (Any.do-inspired) ----------
  function renderTodayView() {
    const today = stripTime(new Date());
    const groups = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      upcoming: [],
      past: [],
      completed: [],
    };

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    state.tasks.forEach((t, idx) => {
      const d = stripTime(t.date);
      if (isDone(idx)) return groups.completed.push({ t, idx });
      if (sameDay(d, today)) return groups.today.push({ t, idx });
      if (sameDay(d, tomorrow)) return groups.tomorrow.push({ t, idx });
      if (d < today) return groups.past.push({ t, idx });
      if (d <= weekEnd) return groups.thisWeek.push({ t, idx });
      return groups.upcoming.push({ t, idx });
    });

    const panel = document.getElementById("today-panel");
    panel.innerHTML = "";

    addGroup(panel, "Today", groups.today);
    addGroup(panel, "Tomorrow", groups.tomorrow);
    addGroup(panel, "This Week", groups.thisWeek);
    addGroup(panel, "Upcoming", groups.upcoming);
    addGroup(panel, "Missed", groups.past);
    addGroup(panel, "Completed", groups.completed);

    if (!panel.children.length) {
      panel.innerHTML = `<p class="hint">No tasks scheduled yet.</p>`;
    }
  }

  function addGroup(parent, label, items) {
    if (!items.length) return;
    const h = document.createElement("div");
    h.className = "group-header";
    h.innerHTML = `${label}<span class="group-count">${items.length}</span>`;
    parent.appendChild(h);
    items.forEach(({ t, idx }) => parent.appendChild(buildRow(t, idx)));
  }

  function buildRow(t, idx) {
    const row = document.createElement("div");
    row.className = "row-task" + (isDone(idx) ? " is-done" : "");
    const phaseClass = (t.phase || "Build").toLowerCase();
    row.innerHTML = `
      <button class="check ${isDone(idx) ? "checked" : ""}" aria-label="Complete task"></button>
      <div class="row-body">
        <div class="row-title">${escapeHTML(t.title)}</div>
        <div class="row-meta">
          <span><span class="phase-dot ${phaseClass}"></span> ${escapeHTML(t.phase)}</span>
          <span>${formatDate(t.date)}</span>
          <span>${t.scheduledTime || state.startTime} · ${t.durationMin}m</span>
        </div>
      </div>
    `;
    row.querySelector(".check").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDone(idx);
    });
    row.addEventListener("click", () => openDrawer(idx));
    return row;
  }

  // ---------- List view (detailed, kept from previous) ----------
  function renderListView() {
    const list = document.getElementById("task-list");
    list.innerHTML = "";
    state.tasks.forEach((t, i) => {
      const row = document.createElement("div");
      row.className = "task-item" + (isDone(i) ? " is-done" : "");
      row.innerHTML = `
        <div class="idx">${String(i + 1).padStart(2, "0")}</div>
        <div class="when">${formatDate(t.date)} · ${t.scheduledTime || state.startTime} · ${t.durationMin} min</div>
        <div class="body">
          <div class="title-line">
            <span class="phase-tag">${escapeHTML(t.phase)}</span>${escapeHTML(t.title)}
          </div>
          <div class="desc">${escapeHTML(t.description)}</div>
        </div>
      `;
      row.addEventListener("click", () => openDrawer(i));
      list.appendChild(row);
    });
  }

  // ---------- Drawer (Google Tasks-inspired detail panel) ----------
  function openDrawer(idx) {
    const t = state.tasks[idx];
    const drawer = document.getElementById("task-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    const content = document.getElementById("drawer-content");
    const phaseClass = (t.phase || "Build").toLowerCase();

    const milestoneHTML = t.milestone
      ? `<div class="drawer-milestone">
           <span class="drawer-ml-label">Milestone</span>
           <span class="drawer-ml-text">${escapeHTML(t.milestone)}</span>
         </div>`
      : "";

    content.innerHTML = `
      <div class="drawer-kicker">[ TASK BRIEF ]</div>
      <h3>${escapeHTML(t.title)}</h3>
      <div class="drawer-meta">
        <span class="chip"><span class="phase-dot ${phaseClass}"></span>${escapeHTML(t.phase)}</span>
        <span class="chip">DAY ${t.dayNumber} / ${t.totalDays}</span>
        <span class="chip">${escapeHTML(formatDate(t.date))}</span>
        <span class="chip">${t.scheduledTime || state.startTime} &middot; ${t.durationMin}M</span>
      </div>
      ${milestoneHTML}
      ${t.scheduleNote ? `<div class="drawer-schedule-note"><span>Scheduling:</span> ${escapeHTML(t.scheduleNote)}</div>` : ""}
      <div class="drawer-desc">${escapeHTML(t.description)}</div>
      <div class="drawer-divider"></div>
      <div class="drawer-actions">
        <button class="primary" id="drawer-toggle">
          ${isDone(idx) ? "&#x21ba; Mark Incomplete" : "&#10003; Mark Complete"}
        </button>
      </div>
    `;

    content.querySelector("#drawer-toggle").addEventListener("click", () => {
      toggleDone(idx);
      openDrawer(idx); // refresh drawer button state
    });

    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
  }

  function closeDrawer() {
    document.getElementById("task-drawer").classList.remove("open");
    document.getElementById("task-drawer").setAttribute("aria-hidden", "true");
    document.getElementById("drawer-backdrop").hidden = true;
  }

  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // ---------- View toggle + week nav wiring ----------
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      renderCurrentView();
    });
  });

  document.getElementById("week-prev").addEventListener("click", () => {
    if (weekOffset > 0) {
      weekOffset--;
      renderWeekView();
    }
  });
  document.getElementById("week-next").addEventListener("click", () => {
    if (weekOffset < totalWeeks() - 1) {
      weekOffset++;
      renderWeekView();
    }
  });
  document.getElementById("week-today").addEventListener("click", () => {
    weekOffset = defaultWeekOffset();
    renderWeekView();
  });

  function formatDate(d) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  // ---------- .ics export ----------
  function exportICS() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//STOIX//Red Pill//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:STOIX Red Pill — ${sanitize(state.goal).slice(0, 60)}`,
    ];

    state.tasks.forEach((t, i) => {
      const time = t.scheduledTime || state.startTime || "09:00";
      const [sh, sm] = time.split(":").map(Number);
      const start = new Date(t.date);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(start.getTime() + state.dailyMinutes * 60 * 1000);

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:stoix-redpill-${Date.now()}-${i}@stoix.local`);
      lines.push(`DTSTAMP:${toICSDate(new Date())}`);
      lines.push(`DTSTART:${toICSDate(start)}`);
      lines.push(`DTEND:${toICSDate(end)}`);
      lines.push(`SUMMARY:[${sanitize(t.phase)}] ${sanitize(t.title)}`);
      lines.push(
        `DESCRIPTION:Goal: ${sanitize(state.goal)}\\n` +
          `Phase: ${sanitize(t.phase)} · Day ${t.dayNumber} of ${t.totalDays} · ${t.durationMin} min\\n\\n` +
          `${sanitize(t.description)}\\n\\n— STOIX // Red Pill Protocol`
      );
      lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stoix-redpill-${Date.now()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toICSDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      "Z"
    );
  }

  function sanitize(s) {
    return String(s).replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }
})();
