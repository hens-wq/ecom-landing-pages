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
      const linkDist = 125;

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
            const alpha = (1 - Math.sqrt(d) / linkDist) * 0.12;
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
    window.scrollTo(0, 0);
  }

  /* ============================================================
     מצב הבדיקה הנוכחית (session)
     ============================================================ */

  let session = null;
  let retryCount = 0;

  function newSession(track) {
    session = {
      track: track.id,
      trackName: track.name,
      game: track.gameTitle,
      startedAt: new Date().toISOString(),
      attempts: [],       // { round, correct, action, rtMs }
      correctCount: 0,
      retries: retryCount,
      score: null,
      finishedAt: null,
    };
  }

  /* ============================================================
     אתחול טקסטים מ־CONFIG
     ============================================================ */

  function initTexts() {
    $('#intro-title').textContent = C.texts.introTitle;
    $('#intro-subtitle').textContent = C.texts.introSubtitle;
    $('#btn-start-label').textContent = C.texts.introCta;

    const steps = $('#intro-steps');
    C.texts.introSteps.forEach((s, i) => {
      const step = h('span', 'intro-step', s);
      steps.appendChild(step);
      if (i < C.texts.introSteps.length - 1) {
        steps.appendChild(h('span', 'intro-step-sep', '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>'));
      }
    });

    $('#tracks-title').textContent = C.texts.tracksTitle;
    $('#tracks-subtitle').textContent = C.texts.tracksSubtitle;
    $('#analysis-title').textContent = C.texts.analysisTitle;
    $('#result-title').textContent = C.texts.resultTitle;
    $('#score-label').textContent = C.texts.resultScoreLabel;
    $('#result-disclaimer').textContent = C.texts.resultDisclaimer;
    $('#btn-advisor').textContent = C.texts.resultAdvisorCta;
    $('#btn-again').textContent = C.texts.resultCta;

    $('#thanks-title').textContent = C.thanks.title;
    $('#thanks-text').textContent = C.thanks.text;

    $('#game-intro-btn').textContent = C.texts.gameIntroCta;
    $('#game-timeout-title').textContent = C.texts.timeoutTitle;
    $('#game-timeout-text').textContent = C.texts.timeoutText;
    $('#game-timeout-btn').textContent = C.texts.timeoutCta;
  }

  /* ============================================================
     Hero — קומפוזיציה הולוגרפית, שבבים ופרלקסה
     ============================================================ */

  function initHeroTerminal() {
    const body = $('#hero-terminal-body');
    const lines = C.hero.terminal;

    if (reducedMotion) {
      lines.forEach((l) => body.appendChild(h('div', 'term-line', l)));
      return;
    }

    let li = 0;
    function typeLine() {
      if (li >= lines.length) {
        // השהיה ואתחול הלולאה
        setTimeout(() => {
          body.innerHTML = '';
          li = 0;
          typeLine();
        }, 3200);
        return;
      }
      const line = h('div', 'term-line');
      const cursor = h('span', 'term-cursor');
      body.appendChild(line);
      line.appendChild(cursor);
      const text = lines[li];
      let ci = 0;
      (function typeChar() {
        if (ci < text.length) {
          cursor.insertAdjacentText('beforebegin', text[ci]);
          ci++;
          setTimeout(typeChar, 26 + Math.random() * 30);
        } else {
          cursor.remove();
          if (li === lines.length - 1) line.classList.add('term-line--ok');
          li++;
          setTimeout(typeLine, 420);
        }
      })();
    }
    typeLine();
  }

  function initHeroPoly() {
    const canvas = $('#hero-poly');
    const ctx2d = canvas.getContext('2d');

    // איקוסהדרון — 12 קודקודים, 30 צלעות
    const t = (1 + Math.sqrt(5)) / 2;
    const V = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map((v) => {
      const len = Math.hypot(...v);
      return v.map((x) => x / len);
    });
    const E = [];
    for (let i = 0; i < V.length; i++) {
      for (let j = i + 1; j < V.length; j++) {
        const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
        if (d < 1.1) E.push([i, j]);
      }
    }

    let w = 0, hh = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      w = r.width; hh = r.height;
      canvas.width = w * dpr;
      canvas.height = hh * dpr;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let rx = 0.4, ry = 0.2;

    function draw() {
      ctx2d.clearRect(0, 0, w, hh);
      const scale = Math.min(w, hh) * 0.36;
      const cx = w / 2, cy = hh / 2;

      const pts = V.map(([x, y, z]) => {
        // סיבוב סביב X ו־Y
        let y1 = y * Math.cos(rx) - z * Math.sin(rx);
        let z1 = y * Math.sin(rx) + z * Math.cos(rx);
        let x1 = x * Math.cos(ry) + z1 * Math.sin(ry);
        let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
        const p = 2.6 / (2.6 - z2 * 0.9);
        return { x: cx + x1 * scale * p, y: cy + y1 * scale * p, z: z2 };
      });

      for (const [i, j] of E) {
        const a = pts[i], b = pts[j];
        const depth = (a.z + b.z) / 2;                 // -1..1
        const alpha = 0.18 + (depth + 1) * 0.26;
        ctx2d.beginPath();
        ctx2d.moveTo(a.x, a.y);
        ctx2d.lineTo(b.x, b.y);
        ctx2d.strokeStyle = depth > 0
          ? `rgba(52,209,195,${alpha})`
          : `rgba(104,54,255,${alpha})`;
        ctx2d.lineWidth = 1.1;
        ctx2d.stroke();
      }
      for (const p of pts) {
        const r = 1.4 + (p.z + 1) * 1.1;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx2d.fillStyle = p.z > 0.3 ? 'rgba(133,237,114,0.95)' : 'rgba(52,209,195,0.65)';
        ctx2d.fill();
      }
    }

    if (reducedMotion) {
      draw();
      return;
    }
    (function frame() {
      rx += 0.0038;
      ry += 0.0052;
      draw();
      requestAnimationFrame(frame);
    })();
  }

  function initHero() {
    if (C.hero.ART_READY && C.hero.art) {
      // דמות ה־Nano Banana מחליפה את הקומפוזיציה ההולוגרפית
      const portal = $('#hero-portal');
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = () => {
        const holo = $('#hero-holo');
        if (holo) holo.remove();
        portal.prepend(img);

        // וריאציה עדינה במסך הקורסים — אותה דמות כרקע אווירה מטושטש
        const ambient = h('div', 'tracks-ambient');
        ambient.style.backgroundImage = `url("${C.hero.art}")`;
        $('#screen-tracks').prepend(ambient);
      };
      img.src = C.hero.art;
    } else {
      initHeroTerminal();
      initHeroPoly();
    }

    // פרלקסה עדינה בעכבר — דסקטופ בלבד, לא ב־Reduced Motion
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const visual = $('#hero-visual');
    const portal = $('#hero-portal');
    let raf = null;

    $('#screen-intro').addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const r = visual.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        portal.style.transform = `translate(${dx * -8}px, ${dy * -6}px)`;
      });
    });
  }

  /* ============================================================
     מסך 2 — כרטיסי הקורסים
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
        img.decoding = 'async';
        img.onload = () => { icon.innerHTML = ''; icon.appendChild(img); };
        img.src = track.art;
      }

      const info = h('div', 'track-info');
      info.append(
        h('div', 'track-name', track.name),
        h('div', 'track-desc', track.desc),
        h('div', 'track-salary', `<span>${C.texts.salaryLabel}</span> ${track.salary}`)
      );
      card.append(
        icon,
        info,
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

  let currentTrack = null;

  function prepareGameScreen(track, gameDef) {
    $('#game-chip').innerHTML = `<span class="chip-dot"></span>${track.name}`;
    $('#game-chip').style.setProperty('--chip-color', track.color);
    $('#game-title').textContent = track.gameTitle;
    // ההוראה הכללית כבר הוצגה במסך הפתיחה שלפני המשחק — כאן לא חוזרים עליה
    $('#game-instruction').textContent = '';
    $('#game-stage').style.setProperty('--tc', track.color);
    $('#game-stage').style.setProperty('--tc2', track.color2 || track.color);

    const roundsEl = $('#game-rounds');
    roundsEl.innerHTML = '';
    for (let i = 0; i < gameDef.rounds; i++) roundsEl.appendChild(h('span', 'round-dot' + (i === 0 ? ' current' : '')));
    roundsEl.appendChild(h('span', 'round-dot speed')); // נקודת משימת הסיום
    $('#game-progress').textContent = 'שאלה 1 מתוך ' + gameDef.rounds;

    $('#game-stage').innerHTML = '';
    $('#game-feedback').className = 'game-feedback';
    $('#game-timer-fill').style.transform = 'scaleX(1)';
  }

  function startGame(track) {
    retryCount = 0;
    currentTrack = track;
    newSession(track);
    const gameDef = window.GAMES[track.id];
    prepareGameScreen(track, gameDef);
    goTo('screen-game');

    // מסך הוראות: המשתמש לוחץ כשהוא מוכן, בזמנו הפנוי
    $('#game-intro-icon').innerHTML = track.gameIcon || '🎮';
    $('#game-intro-title').textContent = track.gameTitle;
    $('#game-intro-text').textContent = track.gameInstruction;
    $('#game-intro-btn').textContent = track.gameCta || C.texts.gameIntroCta;
    $('#game-intro').classList.add('show');
  }

  function beginPlay() {
    const track = currentTrack;
    const gameDef = window.GAMES[track.id];
    runCountdown(() => {
      A.track(A.events.GAME_START, { track: track.id, game: track.gameTitle, retry: retryCount });
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
      void num.offsetWidth; // reflow לאיפוס האנימציה
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
      answered: false,
      roundStart: performance.now(),
      timerRaf: null,
    };

    // טיימר כללי — כשהזמן נגמר לפני סיום: מסך "נסו שוב" במקום ציון
    const t0 = performance.now();
    function timerFrame(now) {
      if (runtime.finished) return;
      const left = 1 - (now - t0) / C.timing.gameDurationMs;
      timerFill.style.transform = `scaleX(${Math.max(0, left)})`;
      if (left <= 0) {
        gameTimeout();
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

    function gameTimeout() {
      runtime.finished = true;
      cancelAnimationFrame(runtime.timerRaf);
      cleanupRound();
      A.track(A.events.GAME_TIMEOUT, { track: track.id, round: runtime.round });
      $('#game-timeout').classList.add('show');
      Sound.bad();
      vibrate(40);
    }

    const ctx = {
      h,
      track,
      get round() { return runtime.round; },
      onCleanup(fn) { runtime.cleanups.push(fn); },

      /** דיווח תשובה — פעם אחת לסבב. נכונה או לא, ממשיכים הלאה. */
      answer({ correct, action, text }) {
        if (runtime.finished || runtime.answered) return;
        runtime.answered = true;
        const rtMs = Math.round(performance.now() - runtime.roundStart);
        session.attempts.push({ round: runtime.round, correct, action, rtMs });

        const dot = dots[runtime.round];
        if (!correct) {
          // טעות: פידבק "הזדמנות נוספת" — נשארים באותה שאלה
          runtime.answered = false;
          Sound.bad();
          vibrate(28);
          showFeedback('bad', text);
          return;
        }

        session.correctCount++;
        Sound.good();
        vibrate([14, 40, 14]);
        showFeedback('good', text);
        document.body.classList.add('flash-good');
        setTimeout(() => document.body.classList.remove('flash-good'), 520);
        if (dot) { dot.classList.remove('current'); dot.classList.add('done'); }

        const isLast = runtime.round >= gameDef.rounds - 1;
        setTimeout(() => {
          if (runtime.finished) return;
          if (isLast) {
            runFinalMission();
          } else {
            runtime.round++;
            runtime.answered = false;
            if (dots[runtime.round]) dots[runtime.round].classList.add('current');
            $('#game-progress').textContent = 'שאלה ' + (runtime.round + 1) + ' מתוך ' + gameDef.rounds;
            cleanupRound();
            stage.innerHTML = '';
            feedbackEl.className = 'game-feedback';
            runtime.roundStart = performance.now();
            gameDef.renderRound(stage, ctx);
          }
        }, 900);
      },
    };

    /* משימת סיום ייעודית של הקורס (games.js) — יכולה לכלול כמה סבבים פנימיים */
    function runFinalMission() {
      cleanupRound();
      stage.innerHTML = '';
      feedbackEl.className = 'game-feedback';
      $('#game-progress').textContent = C.texts.missionLabel;
      if (gameDef.finalMission.title) $('#game-title').textContent = gameDef.finalMission.title;
      // הוראת המשחק — שורה קצרה שמוצגת לפני הסבב הראשון ולאורך המשחק
      $('#game-instruction').textContent = gameDef.finalMission.sub || '';
      const missionDot = dots[gameDef.rounds];
      if (missionDot) missionDot.classList.add('current');
      const mStart = performance.now();
      let missionRoundSeq = 0;

      const mctx = {
        h,
        track,
        onCleanup(fn) { runtime.cleanups.push(fn); },
        progress(text) { $('#game-progress').textContent = text; },
        feedback(kind, text) { showFeedback(kind, text); if (kind === 'bad') { Sound.bad(); vibrate(24); } else { Sound.good(); } },
        /** מדווח על תוצאת סבב פנימי אחד בתוך משימה מרובת-סבבים, בלי לסיים את המשימה. */
        round({ correct, action, rtMs }) {
          if (runtime.finished) return;
          missionRoundSeq++;
          session.attempts.push({ round: 'mission-' + missionRoundSeq, correct, action, rtMs: rtMs != null ? rtMs : Math.round(performance.now() - mStart) });
          if (correct) session.correctCount++;
        },
        complete({ correct, action, text }) {
          if (runtime.finished) return;
          if (typeof correct === 'boolean') {
            session.attempts.push({ round: 'mission', correct, action, rtMs: Math.round(performance.now() - mStart) });
            if (correct) session.correctCount++;
          }
          if (missionDot) { missionDot.classList.remove('current'); missionDot.classList.add('done'); }
          showFeedback('good', text);
          Sound.good();
          vibrate([14, 40, 14]);
          setTimeout(finishGame, 1300);
        },
      };
      // רגע נשימה קצר: "משימת סיום" + כותרת + הוראה מוצגות לפני שהסבב הראשון מתחיל
      const introDelay = setTimeout(() => {
        if (!runtime.finished) gameDef.finalMission.render(stage, mctx);
      }, 900);
      runtime.cleanups.push(() => clearTimeout(introDelay));
    }

    function finishGame() {
      if (runtime.finished) return;
      runtime.finished = true;
      cancelAnimationFrame(runtime.timerRaf);
      cleanupRound();

      session.finishedAt = new Date().toISOString();
      A.track(A.events.GAME_COMPLETE, {
        track: track.id,
        game: track.gameTitle,
        correct: session.correctCount,
        attempts: session.attempts.length,
        retries: retryCount,
      });
      setTimeout(() => runAnalysis(track), 450);
    }

    runtime.roundStart = performance.now();
    gameDef.renderRound(stage, ctx);
  }

  /* ניסיון נוסף אחרי שהזמן נגמר */
  function retryGame() {
    retryCount++;
    A.track(A.events.GAME_RETRY, { track: currentTrack.id, retry: retryCount });
    newSession(currentTrack);
    const gameDef = window.GAMES[currentTrack.id];
    prepareGameScreen(currentTrack, gameDef);
    $('#game-timeout').classList.remove('show');
    beginPlay();
  }

  /* ============================================================
     חישוב הציון — 100 כברירת מחדל, מינוס 3 נקודות על כל
     שאלה/סבב שבו הייתה טעות (בלי קשר לכמה ניסיונות שגויים בו היו)
     ============================================================ */

  function computeScore() {
    const roundsWithMistake = new Set();
    session.attempts.forEach((a) => {
      if (!a.correct) roundsWithMistake.add(a.round);
    });
    const score = C.score.base - roundsWithMistake.size * C.score.penaltyPerMistake;
    return Math.max(0, score);
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

    $('#result-course').textContent = `${C.texts.resultCoursePrefix} ${track.name}`;
    $('#result-course').style.setProperty('--tc', track.color);
    $('#result-line').textContent = track.resultLine;

    // תמונת "עברתי!" (Nano Banana) — נטענת פעם אחת כשהנכס זמין
    if (C.RESULT_ART && C.RESULT_ART.ready && !$('#result-figure')) {
      const fig = h('div', 'result-figure');
      fig.id = 'result-figure';
      const img = new Image();
      img.alt = '';
      img.onload = () => fig.appendChild(img);
      img.src = C.RESULT_ART.src;
      $('#result-title').before(fig);
    }

    // כפתור ראשי לפי הגדרת הקורס: וואטסאפ (QA) או יועץ לימודים
    const waBtn = $('#btn-whatsapp');
    const advBtn = $('#btn-advisor');
    if (track.resultMode === 'whatsapp') {
      waBtn.hidden = false;
      advBtn.hidden = true;
      $('#btn-whatsapp-label').textContent = track.resultWhatsappCta || 'להמשך התהליך בוואטסאפ';
      waBtn.href = C.WHATSAPP_RETURN_URL;
    } else {
      waBtn.hidden = true;
      advBtn.hidden = false;
    }

    goTo('screen-result');
    Sound.win();
    vibrate([20, 60, 20, 60, 40]);

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
      retries: session.retries,
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
     מקלדת — 1‑3 לבחירת אפשרות בדסקטופ
     ============================================================ */

  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const gameActive = $('#screen-game').classList.contains('screen--active');
      if (!gameActive || $('#countdown').classList.contains('show')) return;
      if ($('#game-intro').classList.contains('show') || $('#game-timeout').classList.contains('show')) return;
      if (e.repeat) return;

      const stage = $('#game-stage');
      if (e.key >= '1' && e.key <= '9') {
        const btn = stage.querySelector(`[data-key="${e.key}"]`);
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

    $('#game-intro-btn').addEventListener('click', () => {
      Sound.click();
      $('#game-intro').classList.remove('show');
      beginPlay();
    });

    $('#game-timeout-btn').addEventListener('click', () => {
      Sound.click();
      retryGame();
    });

    $('#btn-again').addEventListener('click', () => {
      Sound.click();
      resetTrackCards();
      $('#score-value').textContent = '0';
      $('#ring-fill').style.strokeDashoffset = RING_CIRC;
      goTo('screen-tracks');
    });

    $('#btn-advisor').addEventListener('click', () => {
      Sound.click();
      A.track(A.events.ADVISOR_CLICK, { track: session ? session.track : null });
      showAdvisor();
    });

    $('#btn-whatsapp').addEventListener('click', () => {
      A.track(A.events.WHATSAPP_CLICK, { track: session ? session.track : null, score: session ? session.score : null });
    });

    const soundBtn = $('#sound-toggle');
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
     אשף יועץ הלימודים — שלב אחד בכל מסך + דף תודה
     ============================================================ */

  const advisorAnswers = {};
  let advisorStep = 0;

  function advisorGoTo(step) {
    advisorStep = step;
    const steps = document.querySelectorAll('.adv-step');
    steps.forEach((s, i) => s.classList.toggle('active', i === step));
    const prog = $('#adv-progress');
    if (step >= 1 && step <= C.advisor.questions.length) {
      prog.hidden = false;
      prog.textContent = `שאלה ${step} מתוך ${C.advisor.questions.length}`;
    } else {
      prog.hidden = true;
    }
    $('#screen-advisor').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function buildAdvisor() {
    const wrap = $('#adv-steps');

    /* --- שלב פתיחה --- */
    const intro = h('div', 'adv-step adv-step--intro');
    if (C.advisor.art && C.advisor.art.ready) {
      const fig = h('div', 'result-figure advisor-art');
      const img = new Image();
      img.alt = '';
      img.onload = () => fig.appendChild(img);
      img.src = C.advisor.art.src;
      intro.appendChild(fig);
    }
    intro.appendChild(h('h2', 'adv-welcome-title', C.advisor.welcomeTitle));
    intro.appendChild(h('p', 'adv-text', C.advisor.introText));
    const aboutBox = h('div', 'adv-about-box');
    aboutBox.appendChild(h('div', 'adv-about-title', C.advisor.aboutBoxTitle));
    C.advisor.aboutBoxText.forEach((line) => aboutBox.appendChild(h('p', 'adv-about-line', line)));
    intro.appendChild(aboutBox);
    const points = h('div', 'advisor-points');
    C.advisor.about.forEach((p) => {
      points.appendChild(h('div', 'advisor-point', `<span class="advisor-point-ico">✓</span><span>${p}</span>`));
    });
    intro.appendChild(points);
    const contBtn = h('button', 'btn btn--primary btn--xl', C.advisor.introCta);
    contBtn.type = 'button';
    contBtn.id = 'adv-continue';
    contBtn.addEventListener('click', () => { Sound.click(); advisorGoTo(1); });
    intro.appendChild(contBtn);
    wrap.appendChild(intro);

    /* --- שלבי השאלות: שאלה אחת בכל מסך --- */
    C.advisor.questions.forEach((qDef, qi) => {
      const step = h('div', 'adv-step');
      const card = h('div', 'adv-card');
      card.appendChild(h('h3', 'adv-q-title', qDef.q));
      if (qDef.sub) card.appendChild(h('p', 'adv-q-sub', qDef.sub));

      const isCourses = qDef.options === 'tracks';
      const opts = h('div', 'adv-opts' + (isCourses ? ' adv-opts--grid' : ''));
      const options = isCourses ? C.tracks.map((t) => t.name) : qDef.options;
      options.forEach((opt) => {
        const btn = h('button', 'adv-opt', opt);
        btn.type = 'button';
        btn.addEventListener('click', () => {
          if (btn.classList.contains('selected')) return;
          opts.querySelectorAll('.adv-opt').forEach((o) => o.classList.remove('selected'));
          btn.classList.add('selected');
          advisorAnswers[qDef.key] = opt;
          Sound.click();
          vibrate(10);
          // הדגשה קצרה ואז מעבר אוטומטי לשלב הבא
          setTimeout(() => {
            if (qi < C.advisor.questions.length - 1) advisorGoTo(qi + 2);
            else submitAdvisor();
          }, 320);
        });
        opts.appendChild(btn);
      });
      card.appendChild(opts);
      step.appendChild(card);

      const art = C.QUESTION_ART;
      if (art && art.ready && art.images && art.images.length) {
        const amb = h('div', 'adv-step-figure');
        const img = new Image();
        img.alt = '';
        img.className = 'stage-figure-img';
        img.decoding = 'async';
        img.onload = () => {
          amb.appendChild(img);
          // הוספת התמונה יכולה להזיז את גובה השלב אחרי שכבר גללנו לראש המסך
          if (step.classList.contains('active')) window.scrollTo(0, 0);
        };
        img.src = art.images[qi % art.images.length];
        step.appendChild(amb);
      }

      wrap.appendChild(step);
    });
  }

  function showAdvisor() {
    // איפוס בחירות קודמות
    Object.keys(advisorAnswers).forEach((k) => delete advisorAnswers[k]);
    document.querySelectorAll('.adv-opt.selected').forEach((o) => o.classList.remove('selected'));
    advisorGoTo(0);
    goTo('screen-advisor');
    A.track(A.events.ADVISOR_SHOWN, { track: session ? session.track : null });
  }

  function submitAdvisor() {
    Sound.win();
    vibrate([20, 50, 20]);
    A.track(A.events.ADVISOR_SUBMIT, { ...advisorAnswers, track: session ? session.track : null });
    try {
      localStorage.setItem(C.storage.advisorKey, JSON.stringify({
        ...advisorAnswers,
        track: session ? session.track : null,
        score: session ? session.score : null,
        submittedAt: new Date().toISOString(),
      }));
    } catch (e) { /* אין אחסון */ }
    if (session) sendAssessmentResult({ ...buildPayload(), advisor: { ...advisorAnswers } });
    goTo('screen-thanks');
    A.track(A.events.THANKS_SHOWN);
  }

  /* ============================================================
     הפעלה
     ============================================================ */

  function init() {
    // רקע האווירה הגלובלי (Nano Banana) — מתחת לחלקיקים ולהילות
    if (C.ASSETS_READY && C.AMBIENT_BG) {
      const amb = h('div', 'bg-ambient-img');
      amb.setAttribute('aria-hidden', 'true');
      amb.style.backgroundImage = `url("${C.AMBIENT_BG}")`;
      document.body.insertBefore(amb, $('#bg-particles'));
    }

    initTexts();
    initHero();
    buildTrackCards();
    buildAdvisor();
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
