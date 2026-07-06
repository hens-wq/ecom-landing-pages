/* ============================================================
   בקר האפליקציה — ניהול מסכים, משחק, ציון, נתונים וסאונד
   ============================================================ */

(function () {
  'use strict';

  const C = window.CONFIG;
  const A = window.Analytics;

  /* ---------- עזרים ---------- */

  const $ = (sel) => document.querySelector(sel);

  function h(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  /* ============================================================
     סאונד — סינתיסייזר WebAudio קטן. כבוי כברירת מחדל.
     ============================================================ */

  const Sound = {
    ctx: null,
    enabled: false,

    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    tone(freq, dur = 0.12, type = 'sine', gain = 0.06, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },

    click() { this.tone(520, 0.07, 'sine', 0.04); },
    good()  { this.tone(740, 0.1); this.tone(1108, 0.16, 'sine', 0.05, 0.08); },
    bad()   { this.tone(220, 0.16, 'triangle', 0.05); },
    tick()  { this.tone(660, 0.08, 'sine', 0.045); },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.055, i * 0.11));
    },
  };

  /* ============================================================
     רקע חלקיקים חי
     ============================================================ */

  function initParticles() {
    if (reducedMotion) return;
    const canvas = $('#bg-particles');
    const ctx2d = canvas.getContext('2d');
    const colors = ['rgba(104,54,255,', 'rgba(52,209,195,', 'rgba(133,237,114,'];
    let particles = [];
    let w, h2, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h2 = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h2 * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h2 + 'px';
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(70, Math.floor((w * h2) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h2,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.8 + Math.random() * 1.6,
        c: colors[Math.floor(Math.random() * colors.length)],
        a: 0.25 + Math.random() * 0.4,
      }));
    }

    function frame() {
      ctx2d.clearRect(0, 0, w, h2);
      const linkDist = 110;

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h2 + 10; if (p.y > h2 + 10) p.y = -10;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2d.fillStyle = p.c + p.a + ')';
        ctx2d.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = dx * dx + dy * dy;
          if (d < linkDist * linkDist) {
            const alpha = (1 - Math.sqrt(d) / linkDist) * 0.09;
            ctx2d.beginPath();
            ctx2d.moveTo(a.x, a.y);
            ctx2d.lineTo(b.x, b.y);
            ctx2d.strokeStyle = 'rgba(120,140,255,' + alpha + ')';
            ctx2d.lineWidth = 1;
            ctx2d.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  /* ============================================================
     ניהול מסכים
     ============================================================ */

  function goTo(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('screen--active'));
    $('#' + id).classList.add('screen--active');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ============================================================
     מצב הבדיקה הנוכחית (session)
     ============================================================ */

  let session = null;

  function newSession(track) {
    session = {
      track: track.id,
      trackName: track.name,
      game: track.gameTitle,
      startedAt: new Date().toISOString(),
      attempts: [],       // { round, correct, action, rtMs }
      correctCount: 0,
      score: null,
      finishedAt: null,
    };
  }

  /* ============================================================
     אתחול טקסטים מ־CONFIG
     ============================================================ */

  function initTexts() {
    $('#intro-badge').textContent = C.texts.badge;
    $('#intro-title').textContent = C.texts.introTitle;
    $('#intro-subtitle').textContent = C.texts.introSubtitle;
    $('#btn-start-label').textContent = C.texts.introCta;
    $('#intro-hint').textContent = '⏱ ' + C.texts.introHint;

    const steps = $('#intro-steps');
    C.texts.introSteps.forEach((s, i) => {
      const step = h('span', 'intro-step', `<span class="step-num">${i + 1}</span>${s}`);
      steps.appendChild(step);
      if (i < C.texts.introSteps.length - 1) steps.appendChild(h('span', 'intro-step-sep', '›'));
    });

    $('#tracks-title').textContent = C.texts.tracksTitle;
    $('#tracks-subtitle').textContent = C.texts.tracksSubtitle;
    $('#analysis-title').textContent = C.texts.analysisTitle;
    $('#result-title').textContent = C.texts.resultTitle;
    $('#score-label').textContent = C.texts.resultScoreLabel;
    $('#result-disclaimer').textContent = C.texts.resultDisclaimer;
    $('#btn-whatsapp-label').textContent = C.texts.resultCta;
    $('#btn-again').textContent = C.texts.resultSecondary;
    $('#btn-whatsapp').href = C.WHATSAPP_RETURN_URL;
  }

  /* ============================================================
     מסך 2 — כרטיסי המסלולים
     ============================================================ */

  /* אייקוני SVG בגרדיאנט מותג — ברירת המחדל של הכרטיסים.
     כשנכסי ה־Nano Banana יורדים לתיקייה ו־ASSETS_READY=true, הם מחליפים אותם. */
  function trackSvg(id, inner) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <defs>
        <linearGradient id="tg-${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6836FF"/><stop offset="0.55" stop-color="#34D1C3"/><stop offset="1" stop-color="#85ED72"/>
        </linearGradient>
        <linearGradient id="tg2-${id}" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34D1C3"/><stop offset="1" stop-color="#85ED72"/>
        </linearGradient>
      </defs>${inner}</svg>`;
  }

  const TRACK_SVG = {
    cyber: trackSvg('cyber', `<path d="M12 2 4 5.5v5.7c0 4.9 3.4 8.4 8 10.3 4.6-1.9 8-5.4 8-10.3V5.5z" stroke="url(#tg-cyber)" stroke-width="1.7"/><path d="m9 12 2 2 4-4.5" stroke="url(#tg2-cyber)" stroke-width="1.9"/>`),
    ai: trackSvg('ai', `<circle cx="12" cy="12" r="2.4" stroke="url(#tg-ai)" stroke-width="1.6"/><circle cx="5" cy="7" r="1.7" stroke="url(#tg-ai)" stroke-width="1.6"/><circle cx="19" cy="7" r="1.7" stroke="url(#tg-ai)" stroke-width="1.6"/><circle cx="5" cy="17" r="1.7" stroke="url(#tg-ai)" stroke-width="1.6"/><circle cx="19" cy="17" r="1.7" stroke="url(#tg-ai)" stroke-width="1.6"/><path d="M6.6 7.9 10 10.6M17.4 7.9 14 10.6M6.6 16.1 10 13.4M17.4 16.1 14 13.4" stroke="url(#tg2-ai)" stroke-width="1.4"/>`),
    qa: trackSvg('qa', `<circle cx="10.5" cy="10.5" r="6.5" stroke="url(#tg-qa)" stroke-width="1.7"/><path d="m20 20-4.9-4.9" stroke="url(#tg-qa)" stroke-width="1.9"/><path d="M8 10.5h5M10.5 8v5" stroke="url(#tg2-qa)" stroke-width="1.6"/>`),
    fullstack: trackSvg('fullstack', `<path d="m8 7-4 5 4 5M16 7l4 5-4 5" stroke="url(#tg-fullstack)" stroke-width="1.8"/><path d="m13.5 5-3 14" stroke="url(#tg2-fullstack)" stroke-width="1.6"/>`),
    marketing: trackSvg('marketing', `<path d="M4 20V12M10 20V6M16 20v-4" stroke="url(#tg-marketing)" stroke-width="1.9"/><path d="m15 8 4-4m0 0h-3.4M19 4v3.4" stroke="url(#tg2-marketing)" stroke-width="1.7"/>`),
    uxui: trackSvg('uxui', `<rect x="3" y="4" width="18" height="14" rx="3" stroke="url(#tg-uxui)" stroke-width="1.6"/><path d="M3 9h18" stroke="url(#tg-uxui)" stroke-width="1.4"/><path d="m12 13 2.5 4.5 1-2.5 2.5-1z" stroke="url(#tg2-uxui)" stroke-width="1.6"/>`),
    devops: trackSvg('devops', `<path d="M8 12a4 4 0 1 1 4-4" stroke="url(#tg-devops)" stroke-width="1.8"/><path d="M16 12a4 4 0 1 1-4 4" stroke="url(#tg-devops)" stroke-width="1.8"/><path d="m12 4.5 1.8 1.4L12 7.6M12 19.5l-1.8-1.4 1.8-1.7" stroke="url(#tg2-devops)" stroke-width="1.5"/>`),
  };

  function buildTrackCards() {
    const grid = $('#track-grid');
    C.tracks.forEach((track) => {
      const card = h('button', 'track-card');
      card.type = 'button';
      card.setAttribute('role', 'listitem');
      card.style.setProperty('--tc', track.color);
      card.style.setProperty('--tc2', track.color2);

      const icon = h('div', 'track-icon');
      icon.innerHTML = TRACK_SVG[track.id] || '';
      if (C.ASSETS_READY && track.art) {
        const img = new Image();
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onload = () => { icon.innerHTML = ''; icon.appendChild(img); };
        img.src = track.art;
      }

      card.append(
        icon,
        h('div', 'track-name', track.name),
        h('div', 'track-tagline', track.tagline),
        h('span', 'track-check', '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5L20 6.5"/></svg>')
      );

      card.addEventListener('click', () => selectTrack(track, card));
      grid.appendChild(card);
    });
  }

  function selectTrack(track, card) {
    if (card.classList.contains('selected')) return;
    document.querySelectorAll('.track-card').forEach((el) => {
      el.classList.toggle('selected', el === card);
      el.classList.toggle('dimmed', el !== card);
      el.disabled = el !== card;
    });
    Sound.click();
    vibrate(12);
    A.track(A.events.TRACK_SELECTED, { track: track.id, track_name: track.name });
    setTimeout(() => startGame(track), C.timing.autoAdvanceAfterPickMs);
  }

  function resetTrackCards() {
    document.querySelectorAll('.track-card').forEach((el) => {
      el.classList.remove('selected', 'dimmed');
      el.disabled = false;
    });
  }

  /* ============================================================
     מסך 3 — מעטפת המשחק
     ============================================================ */

  let gameRuntime = null; // מצב ריצה של המשחק הפעיל

  function startGame(track) {
    newSession(track);
    const gameDef = window.GAMES[track.id];

    // כותרות ושבב מסלול
    $('#game-chip').innerHTML = `<span class="chip-dot"></span>${track.name}`;
    $('#game-chip').style.setProperty('--chip-color', track.color);
    $('#game-title').textContent = track.gameTitle;
    $('#game-instruction').textContent = track.gameInstruction;

    // נקודות סבבים
    const roundsEl = $('#game-rounds');
    roundsEl.innerHTML = '';
    for (let i = 0; i < gameDef.rounds; i++) roundsEl.appendChild(h('span', 'round-dot' + (i === 0 ? ' current' : '')));

    $('#game-stage').innerHTML = '';
    $('#game-feedback').className = 'game-feedback';
    $('#game-timer-fill').style.transform = 'scaleX(1)';

    goTo('screen-game');
    runCountdown(() => {
      A.track(A.events.GAME_START, { track: track.id, game: track.gameTitle });
      launchRounds(track, gameDef);
    });
  }

  function runCountdown(done) {
    const overlay = $('#countdown');
    const num = $('#countdown-num');
    overlay.classList.add('show');
    let n = C.timing.countdownFrom;

    function step() {
      num.classList.remove('tick', 'go');
      // reflow כדי לאפס את האנימציה
      void num.offsetWidth;
      if (n > 0) {
        num.textContent = n;
        num.classList.add('tick');
        Sound.tick();
        n--;
        setTimeout(step, reducedMotion ? 350 : 820);
      } else {
        num.textContent = C.texts.countdownGo;
        num.classList.add('tick', 'go');
        Sound.good();
        setTimeout(() => {
          overlay.classList.remove('show');
          done();
        }, reducedMotion ? 250 : 620);
      }
    }
    step();
  }

  function launchRounds(track, gameDef) {
    const stage = $('#game-stage');
    const feedbackEl = $('#game-feedback');
    const timerFill = $('#game-timer-fill');
    const dots = Array.from(document.querySelectorAll('.round-dot'));

    const runtime = {
      round: 0,
      cleanups: [],
      finished: false,
      roundStart: performance.now(),
      timerRaf: null,
    };
    gameRuntime = runtime;

    // טיימר כללי של המשחק
    const t0 = performance.now();
    function timerFrame(now) {
      const left = 1 - (now - t0) / C.timing.gameDurationMs;
      timerFill.style.transform = `scaleX(${Math.max(0, left)})`;
      if (left <= 0) {
        finish('timeout');
        return;
      }
      runtime.timerRaf = requestAnimationFrame(timerFrame);
    }
    runtime.timerRaf = requestAnimationFrame(timerFrame);

    function cleanupRound() {
      runtime.cleanups.forEach((fn) => fn());
      runtime.cleanups = [];
    }

    function showFeedback(kind, text) {
      if (!text) return;
      feedbackEl.textContent = text;
      feedbackEl.className = 'game-feedback show ' + kind;
    }

    const ctx = {
      h,
      track,
      get round() { return runtime.round; },
      onCleanup(fn) { runtime.cleanups.push(fn); },
      attempt({ correct, action, text }) {
        if (runtime.finished) return;
        const rtMs = Math.round(performance.now() - runtime.roundStart);
        session.attempts.push({ round: runtime.round, correct, action, rtMs });

        if (correct) {
          session.correctCount++;
          Sound.good();
          vibrate([14, 40, 14]);
          showFeedback('good', text);
          document.body.classList.add('flash-good');
          setTimeout(() => document.body.classList.remove('flash-good'), 520);

          if (dots[runtime.round]) {
            dots[runtime.round].classList.remove('current');
            dots[runtime.round].classList.add('done');
          }

          const isLast = runtime.round >= gameDef.rounds - 1;
          setTimeout(() => {
            if (runtime.finished) return;
            if (isLast) {
              finish('completed');
            } else {
              runtime.round++;
              if (dots[runtime.round]) dots[runtime.round].classList.add('current');
              cleanupRound();
              stage.innerHTML = '';
              feedbackEl.className = 'game-feedback';
              runtime.roundStart = performance.now();
              gameDef.renderRound(stage, ctx);
            }
          }, 850);
        } else {
          Sound.bad();
          vibrate(28);
          showFeedback('bad', text);
        }
      },
    };

    function finish(reason) {
      if (runtime.finished) return;
      runtime.finished = true;
      cancelAnimationFrame(runtime.timerRaf);
      cleanupRound();
      dots.forEach((d) => { d.classList.remove('current'); d.classList.add('done'); });

      session.finishedAt = new Date().toISOString();
      A.track(A.events.GAME_COMPLETE, {
        track: track.id,
        game: track.gameTitle,
        reason,
        correct: session.correctCount,
        attempts: session.attempts.length,
      });
      setTimeout(() => runAnalysis(track), reason === 'completed' ? 500 : 250);
    }

    runtime.roundStart = performance.now();
    gameDef.renderRound(stage, ctx);
  }

  /* ============================================================
     חישוב הציון — תמיד בטווח שנקבע ב־CONFIG (ברירת מחדל 90–100)
     ============================================================ */

  function computeScore() {
    const correct = session.attempts.filter((a) => a.correct);
    const avgRt = correct.length
      ? correct.reduce((s, a) => s + a.rtMs, 0) / correct.length
      : 4000;
    const accuracy = session.attempts.length
      ? correct.length / session.attempts.length
      : 0.5;

    // בסיס + בונוס דיוק + בונוס מהירות → ממופה למאגר הציונים
    let idx = 0;
    idx += accuracy >= 1 ? 3 : accuracy >= 0.75 ? 2 : accuracy >= 0.5 ? 1 : 0;
    idx += avgRt < 1200 ? 3 : avgRt < 2200 ? 2 : avgRt < 3500 ? 1 : 0;
    idx += Math.floor(Math.random() * 2); // גיוון קטן
    const pool = C.score.pool;
    const score = pool[Math.min(idx, pool.length - 1)];

    // 100 רק בביצוע מושלם, מהיר — ובהסתברות נמוכה
    if (accuracy === 1 && avgRt < 1100 && Math.random() < C.score.perfectScoreChance) {
      return C.score.max;
    }
    return Math.max(C.score.min, Math.min(score, C.score.max));
  }

  /* ============================================================
     מסך ניתוח — "המערכת מנתחת את הביצועים"
     ============================================================ */

  function runAnalysis(track) {
    goTo('screen-analysis');
    const lineEl = $('#analysis-line');
    const coreEl = $('#scanner-core');
    const lines = C.texts.analysisLines;
    const dur = C.timing.analysisDurationMs;

    let li = 0;
    lineEl.textContent = lines[0];
    const lineTimer = setInterval(() => {
      li++;
      if (li >= lines.length) { clearInterval(lineTimer); return; }
      lineEl.classList.add('swap');
      setTimeout(() => {
        lineEl.textContent = lines[li];
        lineEl.classList.remove('swap');
      }, 180);
    }, dur / lines.length);

    const t0 = performance.now();
    (function count(now) {
      const p = Math.min(1, (now - t0) / dur);
      coreEl.textContent = Math.round(p * 100) + '%';
      if (p < 1) requestAnimationFrame(count);
    })(performance.now());

    setTimeout(() => {
      clearInterval(lineTimer);
      showResult(track);
    }, dur + 150);
  }

  /* ============================================================
     מסך 4 — תוצאה
     ============================================================ */

  const RING_CIRC = 2 * Math.PI * 86; // היקף טבעת הציון

  function showResult(track) {
    session.score = computeScore();

    const chip = $('#result-track-chip');
    chip.innerHTML = `<span class="chip-dot"></span>מסלול ${track.name}`;
    chip.style.setProperty('--chip-color', track.color);
    $('#result-line').textContent = track.resultLine;

    goTo('screen-result');
    Sound.win();
    vibrate([20, 60, 20, 60, 40]);

    // אנימציית ספירת הציון + מילוי הטבעת
    const scoreEl = $('#score-value');
    const ring = $('#ring-fill');
    const target = session.score;
    const dur = reducedMotion ? 200 : 1500;
    const t0 = performance.now();

    (function count(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(eased * target);
      scoreEl.textContent = val;
      ring.style.strokeDashoffset = RING_CIRC * (1 - (eased * target) / 100);
      if (p < 1) requestAnimationFrame(count);
    })(performance.now());

    if (!reducedMotion) setTimeout(launchConfetti, 350);

    // שמירה + שליחה + מדידה
    saveResult();
    sendAssessmentResult(buildPayload());
    A.track(A.events.RESULT_SHOWN, { track: track.id, score: session.score });
  }

  /* ---------- קונפטי בצבעי המותג ---------- */

  function launchConfetti() {
    const canvas = $('#confetti-canvas');
    const ctx2d = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = [C.brand.purple, C.brand.teal, C.brand.green, '#FFFFFF'];
    const parts = Array.from({ length: 110 }, () => ({
      x: rect.width / 2 + (Math.random() - 0.5) * 120,
      y: rect.height * 0.3,
      vx: (Math.random() - 0.5) * 9,
      vy: -4 - Math.random() * 7,
      s: 4 + Math.random() * 5,
      c: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      circle: Math.random() < 0.35,
    }));

    const t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 1000;
      ctx2d.clearRect(0, 0, rect.width, rect.height);
      if (t > 2.6) return;

      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.rot += p.vr;
        const alpha = Math.max(0, 1 - t / 2.4);
        ctx2d.save();
        ctx2d.translate(p.x, p.y);
        ctx2d.rotate(p.rot);
        ctx2d.globalAlpha = alpha;
        ctx2d.fillStyle = p.c;
        if (p.circle) {
          ctx2d.beginPath();
          ctx2d.arc(0, 0, p.s / 2, 0, Math.PI * 2);
          ctx2d.fill();
        } else {
          ctx2d.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        }
        ctx2d.restore();
      }
      requestAnimationFrame(frame);
    })(performance.now());
  }

  /* ============================================================
     שמירת נתונים ושליחה עתידית ל־Webhook
     ============================================================ */

  function buildPayload() {
    const correct = session.attempts.filter((a) => a.correct);
    return {
      source: 'icom-fit-check',
      track: session.track,
      trackName: session.trackName,
      game: session.game,
      score: session.score,
      correctCount: session.correctCount,
      totalAttempts: session.attempts.length,
      actions: session.attempts.map((a) => a.action),
      reactionTimesMs: correct.map((a) => a.rtMs),
      avgReactionMs: correct.length
        ? Math.round(correct.reduce((s, a) => s + a.rtMs, 0) / correct.length)
        : null,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      completedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
  }

  function saveResult() {
    try {
      const payload = buildPayload();
      localStorage.setItem(C.storage.resultKey, JSON.stringify(payload));
      const history = JSON.parse(localStorage.getItem(C.storage.historyKey) || '[]');
      history.push(payload);
      localStorage.setItem(C.storage.historyKey, JSON.stringify(history.slice(-20)));
    } catch (e) {
      /* Local Storage לא זמין (למשל גלישה פרטית) — ממשיכים כרגיל */
    }
  }

  /**
   * שליחת תוצאת הבדיקה למערכת חיצונית (Make Webhook / CRM).
   * כרגע: אם לא הוגדר CONFIG.WEBHOOK_URL — הנתונים מודפסים ל־Console בלבד.
   * לחיבור: הזינו את כתובת ה־Webhook ב־js/config.js תחת WEBHOOK_URL.
   */
  function sendAssessmentResult(payload) {
    if (C.WEBHOOK_URL) {
      fetch(C.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => console.warn('[Webhook] שליחה נכשלה:', err));
    } else {
      console.info('[Webhook מנוטרל — הנתונים שהיו נשלחים]:', payload);
    }
    return payload;
  }
  window.sendAssessmentResult = sendAssessmentResult;

  /* ============================================================
     מקלדת — 1‑3 לבחירת אפשרות, רווח לפעולה (משחק הסייבר)
     ============================================================ */

  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const gameActive = $('#screen-game').classList.contains('screen--active');
      if (!gameActive || $('#countdown').classList.contains('show')) return;
      if (e.repeat) return;

      const stage = $('#game-stage');
      if (e.key >= '1' && e.key <= '9') {
        const btn = stage.querySelector(`[data-key="${e.key}"]`);
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      } else if (e.key === ' ') {
        const btn = stage.querySelector('[data-space]');
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      }
    });
  }

  /* ============================================================
     חיבורי אירועים כלליים
     ============================================================ */

  function initEvents() {
    $('#btn-start').addEventListener('click', () => {
      Sound.init();
      Sound.click();
      A.track(A.events.START_CLICK);
      goTo('screen-tracks');
    });

    $('#btn-whatsapp').addEventListener('click', () => {
      A.track(A.events.WHATSAPP_CLICK, { track: session ? session.track : null, score: session ? session.score : null });
    });

    $('#btn-again').addEventListener('click', () => {
      Sound.click();
      resetTrackCards();
      $('#score-value').textContent = '0';
      $('#ring-fill').style.strokeDashoffset = RING_CIRC;
      goTo('screen-tracks');
    });

    const soundBtn = $('#sound-toggle');
    // שחזור העדפת סאונד
    let saved = null;
    try { saved = localStorage.getItem(C.storage.soundKey); } catch (e) { /* אין אחסון */ }
    if (saved === 'on') {
      Sound.enabled = true;
      soundBtn.setAttribute('aria-pressed', 'true');
      soundBtn.setAttribute('aria-label', C.texts.soundOff);
    }

    soundBtn.addEventListener('click', () => {
      Sound.enabled = !Sound.enabled;
      if (Sound.enabled) Sound.init();
      soundBtn.setAttribute('aria-pressed', String(Sound.enabled));
      soundBtn.setAttribute('aria-label', Sound.enabled ? C.texts.soundOff : C.texts.soundOn);
      try { localStorage.setItem(C.storage.soundKey, Sound.enabled ? 'on' : 'off'); } catch (e) { /* אין אחסון */ }
      if (Sound.enabled) Sound.click();
    });
  }

  /* ============================================================
     הפעלה
     ============================================================ */

  function init() {
    initTexts();
    buildTrackCards();
    initEvents();
    initKeyboard();
    initParticles();
    $('#ring-fill').style.strokeDashoffset = RING_CIRC;
    A.track(A.events.PAGE_VIEW);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
