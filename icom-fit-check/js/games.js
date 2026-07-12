/* ============================================================
   מנוע המשחקים — לכל אחד משבעת הקורסים: 2 שאלות + משחק סיום קצר
   ------------------------------------------------------------
   כל קורס מוגדר כאובייקט:
     rounds        — מספר שאלות (תמיד 2)
     renderRound   — בונה את השאלה הנוכחית בתוך ה־stage
     finalMission  — משחק הסיום האינטראקטיבי: 3 סבבים קצרים.
                     render(stage, mctx).
   חוקי המשחק:
   - טעות בשאלה לא מקדמת ולא חושפת את התשובה: המשתמש מקבל
     "הזדמנות נוספת" (האפשרות השגויה ננעלת) עד שעונים נכון.
   - הדיווח: ctx.answer({correct, action, text}).
   - משחק סיום: mctx.round({correct, action, rtMs}) לכל סבב,
     mctx.complete({text}) בסיום, mctx.feedback(kind, text) לפידבק.
   - אי אפשר להיתקע: אחרי שתי החטאות הסבב מסתיים אוטומטית
     או שהמטרה נשארת זמינה עד הצלחה.
   ============================================================ */

(function () {
  'use strict';

  const C = window.CONFIG;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const retry = () => C.texts.retryFeedback[Math.floor(Math.random() * C.texts.retryFeedback.length)];
  const buzz = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

  /* טיימרים עם ניקוי אוטומטי כשעוזבים את המסך */
  function makeLater(mctx) {
    const ids = [];
    mctx.onCleanup(() => ids.forEach(clearTimeout));
    return (fn, ms) => ids.push(setTimeout(fn, ms));
  }

  /* ---------- אלמנט תחתון מתחת לשאלה: תמונת סטודנט/ית אם קיימת, אחרת טבעת דקורטיבית ---------- */

  function buildStageAmbient(ctx, stage) {
    const amb = ctx.h('div', 'stage-ambient');
    const art = C.QUESTION_ART;
    if (art && art.ready && art.images && art.images.length) {
      const src = art.images[ctx.round % art.images.length];
      const img = new Image();
      img.alt = '';
      img.className = 'stage-figure-img';
      img.decoding = 'async';
      img.onload = () => amb.appendChild(img);
      img.src = src;
    } else {
      amb.innerHTML = '<span class="stage-ambient-ring"></span>';
    }
    stage.appendChild(amb);
  }

  /* ---------- שאלה עם אפשרויות — טעות מקבלת הזדמנות נוספת ---------- */

  function buildQuestion(ctx, stage, { question, sub, options, goodText }) {
    const card = ctx.h('div', 'qcard');
    if (question) card.appendChild(ctx.h('div', 'game-q', question));
    if (sub) card.appendChild(ctx.h('div', 'game-q-sub', sub));
    const grid = ctx.h('div', 'option-grid cols-1');
    let solved = false;

    shuffle(options).forEach((opt, i) => {
      const btn = ctx.h('button', 'option-btn' + (opt.mono ? ' mono' : ''));
      btn.type = 'button';
      btn.innerHTML = `<span class="key-hint">${i + 1}</span>` + opt.html;
      btn.dataset.key = String(i + 1);
      btn.addEventListener('click', () => {
        if (solved || btn.disabled) return;
        if (opt.correct) {
          solved = true;
          grid.querySelectorAll('.option-btn').forEach((b) => (b.disabled = true));
          btn.classList.add('correct');
          ctx.answer({ correct: true, action: opt.action, text: goodText });
        } else {
          // טעות: נועלים רק את האפשרות השגויה — יש הזדמנות נוספת
          btn.disabled = true;
          btn.classList.add('wrong');
          ctx.answer({ correct: false, action: opt.action, text: retry() });
        }
      });
      grid.appendChild(btn);
    });
    card.appendChild(grid);
    stage.appendChild(card);
    buildStageAmbient(ctx, stage);
    return grid;
  }

  const GOOD = ['חשיבה מדויקת! 🎯', 'החלטה נכונה!', 'מדויק!', 'יפה מאוד!'];
  const g = () => GOOD[Math.floor(Math.random() * GOOD.length)];

  /* ============================================================
     סייבר — 2 שאלות + "חסמו את האיום"
     ============================================================ */

  const cyberGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'איזו סיסמה נחשבת לחזקה ביותר?',
          options: [
            { html: 'Dg#8kQ!2v', mono: true, correct: true, action: 'cyber_strong_pw' },
            { html: '123456', mono: true, correct: false, action: 'cyber_weak_pw1' },
            { html: 'shalom123', mono: true, correct: false, action: 'cyber_weak_pw2' },
          ],
        },
        {
          question: 'איזו הודעה נראית כמו ניסיון גניבה?',
          options: [
            { html: '"החשבון שלך נחסם! היכנס מיד: bank-secure4u.co"', correct: true, action: 'cyber_phishing' },
            { html: '"ההזמנה שלך יצאה למשלוח, מספר מעקב 4412"', correct: false, action: 'cyber_legit1' },
            { html: '"תזכורת: פגישה מחר בשעה 10:00"', correct: false, action: 'cyber_legit2' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'חסמו את האיום',
      sub: 'לחצו על האיום לפני שהוא מגיע למערכת',
      render(stage, mctx) {
        const later = makeLater(mctx);
        // משך התנועה עד המערכת — מהיר יותר בכל סבב
        const DURATIONS = reducedMotion ? [3400, 3000, 2600] : [2600, 2200, 1800];
        const SIDES = shuffle(['top', 'right', 'left']);
        let round = 0;
        let attempts = 0;
        let roundStart = 0;
        let rafId = null;
        let moving = false;

        const arena = mctx.h('div', 'g-arena cyb-arena');
        const core = mctx.h('div', 'cyb-core', '🛡️');
        const threat = mctx.h('button', 'cyb-threat', '👾');
        threat.type = 'button';
        threat.setAttribute('aria-label', 'איום');
        arena.append(core, threat);
        stage.appendChild(arena);
        mctx.onCleanup(() => { moving = false; if (rafId) cancelAnimationFrame(rafId); });

        function spawnPoint(side, rect) {
          const m = 36; // חצי גודל האיום
          if (side === 'top') return { x: rect.width * (0.2 + Math.random() * 0.6), y: -m };
          if (side === 'right') return { x: rect.width + m, y: rect.height * (0.15 + Math.random() * 0.5) };
          return { x: -m, y: rect.height * (0.15 + Math.random() * 0.5) };
        }

        function burst() {
          for (let i = 0; i < 7; i++) {
            const s = mctx.h('span', 'cyb-spark');
            const ang = (i / 7) * Math.PI * 2;
            s.style.left = threat.style.left;
            s.style.top = threat.style.top;
            s.style.setProperty('--dx', Math.cos(ang) * 46 + 'px');
            s.style.setProperty('--dy', Math.sin(ang) * 46 + 'px');
            arena.appendChild(s);
            later(() => s.remove(), 550);
          }
        }

        function launch() {
          const rect = arena.getBoundingClientRect();
          const from = spawnPoint(SIDES[round % SIDES.length], rect);
          const to = { x: rect.width / 2, y: rect.height / 2 };
          const dur = DURATIONS[round];
          const t0 = performance.now();
          threat.classList.remove('hit');
          threat.style.opacity = '1';
          threat.disabled = false;
          moving = true;
          (function step(now) {
            if (!moving) return;
            const t = Math.min(1, (now - t0) / dur);
            threat.style.left = from.x + (to.x - from.x) * t + 'px';
            threat.style.top = from.y + (to.y - from.y) * t + 'px';
            if (t >= 1) { onReachCore(); return; }
            rafId = requestAnimationFrame(step);
          })(t0);
        }

        function onReachCore() {
          moving = false;
          attempts++;
          if (attempts < 2) {
            core.classList.add('danger');
            later(() => core.classList.remove('danger'), 350);
            mctx.feedback('bad', 'כמעט! נסו שוב');
            buzz(24);
            threat.style.opacity = '0';
            later(launch, 550);
          } else {
            // חסימה אוטומטית אחרי שתי החטאות — ממשיכים הלאה
            threat.disabled = true;
            core.classList.add('glow');
            burst();
            threat.classList.add('hit');
            mctx.feedback('good', 'האיום נחסם');
            finishRound(false, 'cyber_block_auto');
          }
        }

        threat.addEventListener('pointerdown', () => {
          if (!moving || threat.disabled) return;
          moving = false;
          if (rafId) cancelAnimationFrame(rafId);
          threat.disabled = true;
          if (!reducedMotion) burst();
          threat.classList.add('hit');
          core.classList.add('glow');
          mctx.feedback('good', 'האיום נחסם');
          buzz([14, 40, 14]);
          finishRound(true, 'cyber_block_hit');
        });

        function finishRound(correct, action) {
          mctx.round({ correct, action, rtMs: Math.round(performance.now() - roundStart) });
          later(() => {
            core.classList.remove('glow');
            round++;
            if (round >= 3) {
              mctx.complete({ text: 'כל האיומים נוטרלו' });
            } else {
              startRound();
            }
          }, 650);
        }

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          attempts = 0;
          roundStart = performance.now();
          launch();
        }

        startRound();
      },
    },
  };

  /* ============================================================
     AI — 2 שאלות + "הזינו את המודל"
     ============================================================ */

  const aiGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'איזו מערכת מוכרת קשורה לעולם ה־AI?',
          options: [
            { html: 'Google Docs', correct: false, action: 'ai_docs' },
            { html: 'ChatGPT', correct: true, action: 'ai_chatgpt' },
            { html: 'Canva', correct: false, action: 'ai_canva' },
          ],
        },
        {
          question: 'במה AI יכול לעזור ביום־יום?',
          options: [
            { html: 'לכבות את המחשב בלי חשמל', correct: false, action: 'ai_no_power' },
            { html: 'להחליף את כל האינטרנט', correct: false, action: 'ai_replace_web' },
            { html: 'לענות על שאלות ולסכם מידע', correct: true, action: 'ai_answers' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: 'חשיבה של מודל! 🧠' });
    },
    finalMission: {
      title: 'הזינו את המודל',
      sub: 'לחצו על חלקיקי הדאטה הזוהרים',
      render(stage, mctx) {
        const later = makeLater(mctx);
        // נקודות מיקום בטוחות סביב הכדור המרכזי (באחוזים מגודל הזירה)
        const SPOTS = [
          { x: 18, y: 22 }, { x: 78, y: 18 }, { x: 15, y: 68 },
          { x: 80, y: 66 }, { x: 50, y: 10 }, { x: 30, y: 82 }, { x: 70, y: 84 },
        ];
        let round = 0;
        let roundStart = 0;
        let locked = false;
        let lastSpot = -1;

        const arena = mctx.h('div', 'g-arena aif-arena');
        const core = mctx.h('div', 'aif-core', '<span class="aif-core-ico">🧠</span>');
        arena.appendChild(core);
        stage.appendChild(arena);

        function pickSpots(count) {
          const pool = shuffle(SPOTS.map((_, i) => i).filter((i) => i !== lastSpot));
          return pool.slice(0, count);
        }

        function flyToCore(p, cb) {
          const ar = arena.getBoundingClientRect();
          const pr = p.getBoundingClientRect();
          const dx = ar.left + ar.width / 2 - (pr.left + pr.width / 2);
          const dy = ar.top + ar.height / 2 - (pr.top + pr.height / 2);
          p.style.transition = reducedMotion ? 'opacity 0.2s' : 'transform 0.45s cubic-bezier(0.3,0,0.4,1), opacity 0.2s 0.3s';
          p.style.transform = `translate(${dx}px, ${dy}px) scale(0.25)`;
          p.style.opacity = '0';
          later(cb, reducedMotion ? 220 : 480);
        }

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          locked = false;
          arena.querySelectorAll('.aif-particle').forEach((p) => p.remove());
          const isMulti = round === 2;
          const idxs = pickSpots(isMulti ? 3 : 1);
          const brightIdx = idxs[0];
          lastSpot = brightIdx;
          idxs.forEach((spotIdx) => {
            const spot = SPOTS[spotIdx];
            const bright = spotIdx === brightIdx;
            const p = mctx.h('button', 'aif-particle' + (bright ? ' bright' : ' dim'), '✦');
            p.type = 'button';
            p.setAttribute('aria-label', bright ? 'חלקיק דאטה זוהר' : 'חלקיק דאטה');
            p.style.left = spot.x + '%';
            p.style.top = spot.y + '%';
            p.addEventListener('pointerdown', () => {
              if (locked) return;
              if (!bright) {
                // חלקיק עמום — לא נכון, רק ננער קלות. אי אפשר להיתקע.
                p.classList.add('nudge');
                later(() => p.classList.remove('nudge'), 350);
                return;
              }
              locked = true;
              buzz([14, 40, 14]);
              flyToCore(p, () => {
                core.classList.add('lvl-' + (round + 1));
                core.classList.add('pulse');
                later(() => core.classList.remove('pulse'), 450);
                mctx.feedback('good', 'המודל קיבל דאטה חדש');
                mctx.round({ correct: true, action: 'ai_feed_hit', rtMs: Math.round(performance.now() - roundStart) });
                later(() => {
                  round++;
                  if (round >= 3) mctx.complete({ text: 'המודל אומן בהצלחה' });
                  else startRound();
                }, 600);
              });
            });
            arena.appendChild(p);
          });
          roundStart = performance.now();
        }

        startRound();
      },
    },
  };

  /* ============================================================
     QA — 2 שאלות + "תפסו את הבאג"
     ============================================================ */

  const qaGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'מה מחפשים כשבודקים אם אתר או אפליקציה עובדים כמו שצריך?',
          options: [
            { html: 'תקלות ובעיות שימוש', correct: true, action: 'qa_find_issues' },
            { html: 'רק צבעים יפים', correct: false, action: 'qa_colors' },
            { html: 'כמה מהר המחשב נדלק', correct: false, action: 'qa_boot_speed' },
          ],
        },
        {
          question: 'כפתור באתר אמור להוביל לעמוד הרשמה, אבל לא קורה כלום כשלוחצים עליו. מה זה כנראה?',
          options: [
            { html: 'עיצוב חדש', correct: false, action: 'qa_new_design' },
            { html: 'באג שצריך לבדוק', correct: true, action: 'qa_bug_check' },
            { html: 'עדכון של הסוללה', correct: false, action: 'qa_battery' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'תפסו את הבאג',
      sub: 'לחצו על הבאג ברגע שהוא מופיע',
      render(stage, mctx) {
        const later = makeLater(mctx);
        // מיקומי הופעה בתוך המסך המדומה (באחוזים) — שונה בכל סבב
        const SPOT_SETS = shuffle([
          { x: 22, y: 30 }, { x: 74, y: 26 }, { x: 30, y: 72 },
          { x: 70, y: 68 }, { x: 50, y: 46 },
        ]);
        const WINDOWS = reducedMotion ? [3000, 2800, 2600] : [2300, 2000, 1900];
        let round = 0;
        let attempts = 0;
        let roundStart = 0;
        let hideTimer = null;
        let solvedRound = false;

        const mock = mctx.h('div', 'qa-mock qa-hunt');
        const titlebar = mctx.h('div', 'qa-mock-titlebar', '<span></span><span></span><span></span>');
        titlebar.appendChild(mctx.h('div', 'qa-mock-url', '🔒 shop.ecom-college.co.il'));
        mock.appendChild(titlebar);
        // שלד של דף — שורות תוכן דקורטיביות בלבד
        mock.appendChild(mctx.h('div', 'qa-skel wide'));
        mock.appendChild(mctx.h('div', 'qa-skel'));
        mock.appendChild(mctx.h('div', 'qa-skel'));
        mock.appendChild(mctx.h('div', 'qa-skel short'));
        mock.appendChild(mctx.h('div', 'qa-skel cta'));
        const bug = mctx.h('button', 'qa-bug', '🐛');
        bug.type = 'button';
        bug.setAttribute('aria-label', 'באג');
        mock.appendChild(bug);
        stage.appendChild(mock);
        mctx.onCleanup(() => { if (hideTimer) clearTimeout(hideTimer); });

        function showBug(persist) {
          const spot = SPOT_SETS[(round + attempts) % SPOT_SETS.length];
          bug.style.left = spot.x + '%';
          bug.style.top = spot.y + '%';
          bug.classList.remove('pop');
          bug.classList.add('show');
          bug.classList.toggle('drift', round === 2 && !reducedMotion);
          bug.disabled = false;
          if (!persist) {
            hideTimer = setTimeout(() => {
              bug.classList.remove('show', 'drift');
              bug.disabled = true;
              attempts++;
              mctx.feedback('bad', 'הבאג ברח — נסו שוב');
              buzz(24);
              // אחרי החטאה נוספת הבאג נשאר גלוי עד שלוחצים עליו
              later(() => showBug(attempts >= 2), 500);
            }, WINDOWS[round]);
          }
        }

        bug.addEventListener('pointerdown', () => {
          if (bug.disabled || solvedRound) return;
          solvedRound = true;
          if (hideTimer) clearTimeout(hideTimer);
          bug.disabled = true;
          bug.classList.remove('drift');
          bug.classList.add('pop');
          mctx.feedback('good', 'הבאג אותר');
          buzz([14, 40, 14]);
          mctx.round({ correct: attempts < 2, action: attempts < 2 ? 'qa_bug_caught' : 'qa_bug_caught_late', rtMs: Math.round(performance.now() - roundStart) });
          later(() => {
            bug.classList.remove('show', 'pop');
            round++;
            if (round >= 3) {
              mctx.complete({ text: 'כל הבאגים נמצאו' });
            } else {
              startRound();
            }
          }, 650);
        });

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          attempts = 0;
          solvedRound = false;
          roundStart = performance.now();
          later(() => showBug(false), 400 + Math.random() * 500);
        }

        startRound();
      },
    },
  };

  /* ============================================================
     פיתוח Full Stack — 2 שאלות + "חברו את המערכת"
     ============================================================ */

  const fullstackGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'מה אפשר לבנות בעזרת תכנות?',
          options: [
            { html: 'מצגת PowerPoint בלבד', correct: false, action: 'fs_ppt' },
            { html: 'אתר, אפליקציה או מערכת', correct: true, action: 'fs_build_all' },
            { html: 'רק עיצוב של לוגו', correct: false, action: 'fs_logo' },
          ],
        },
        {
          question: 'כדי לבנות אתר שעובד טוב, מה בדרך כלל חשוב לעשות?',
          options: [
            { html: 'לעבוד לפי שלבים מסודרים', correct: true, action: 'fs_steps' },
            { html: 'להתחיל בלי לבדוק כלום', correct: false, action: 'fs_no_check' },
            { html: 'לשנות דברים בלי להבין למה', correct: false, action: 'fs_random_changes' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'חברו את המערכת',
      sub: 'החליקו לאורך הקו הזוהר וחברו בין הרכיבים',
      render(stage, mctx) {
        const later = makeLater(mctx);
        const VW = 320, VH = 190; // מערכת קואורדינטות של ה־SVG
        const ROUNDS = [
          { d: 'M 44 95 L 276 95', a: { x: 44, y: 95, ico: '🖥️', label: 'מסך' }, b: { x: 276, y: 95, ico: '🗄️', label: 'שרת' } },
          { d: 'M 44 45 L 276 45 L 276 148', a: { x: 44, y: 45, ico: '🗄️', label: 'שרת' }, b: { x: 276, y: 148, ico: '🛢️', label: 'מסד נתונים' } },
          { d: 'M 44 145 Q 160 15 276 145', a: { x: 44, y: 145, ico: '📱', label: 'אפליקציה' }, b: { x: 276, y: 145, ico: '☁️', label: 'ענן' } },
        ];
        const TOL = 52;          // סובלנות נדיבה למרחק מהקו (בפיקסלים על המסך)
        let round = 0;
        let roundStart = 0;
        let attempts = 0;
        let locked = false;
        let points = [];         // נקודות הדגימה של המסלול בקואורדינטות מסך
        let progressIdx = 0;
        let totalLen = 0;
        let tracing = false;

        const arena = mctx.h('div', 'g-arena fsc-arena');
        arena.innerHTML = `
          <svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none" aria-hidden="true">
            <path class="fsc-path-base" d=""></path>
            <path class="fsc-path-lit" d=""></path>
          </svg>`;
        const basePath = arena.querySelector('.fsc-path-base');
        const litPath = arena.querySelector('.fsc-path-lit');
        const compA = mctx.h('button', 'fsc-comp');
        const compB = mctx.h('button', 'fsc-comp');
        compA.type = 'button';
        compB.type = 'button';
        arena.append(compA, compB);
        stage.appendChild(arena);

        function samplePath() {
          totalLen = basePath.getTotalLength();
          const rect = arena.getBoundingClientRect();
          const sx = rect.width / VW, sy = rect.height / VH;
          points = [];
          const N = 60;
          for (let i = 0; i <= N; i++) {
            const pt = basePath.getPointAtLength((totalLen * i) / N);
            points.push({ x: rect.left + pt.x * sx, y: rect.top + pt.y * sy });
          }
        }

        function paintProgress() {
          const shown = totalLen * (progressIdx / (points.length - 1));
          litPath.style.strokeDasharray = totalLen;
          litPath.style.strokeDashoffset = totalLen - shown;
        }

        function placeComp(el, def) {
          el.innerHTML = `<span class="fsc-ico">${def.ico}</span><span class="fsc-label">${def.label}</span>`;
          el.style.left = (def.x / VW) * 100 + '%';
          el.style.top = (def.y / VH) * 100 + '%';
          el.classList.remove('lit');
        }

        function completeRound(action) {
          if (locked) return;
          locked = true;
          tracing = false;
          progressIdx = points.length - 1;
          litPath.style.transition = 'stroke-dashoffset 0.45s ease';
          paintProgress();
          compA.classList.add('lit');
          compB.classList.add('lit');
          mctx.feedback('good', 'החיבור הושלם');
          buzz([14, 40, 14]);
          mctx.round({ correct: true, action, rtMs: Math.round(performance.now() - roundStart) });
          later(() => {
            round++;
            if (round >= 3) mctx.complete({ text: 'כל חלקי המערכת מחוברים' });
            else startRound();
          }, 800);
        }

        function nearIdx(x, y, fromIdx) {
          // מחפשים את הנקודה הקרובה בהמשך המסלול, עם קפיצה קדימה מותרת
          const maxAhead = Math.min(points.length - 1, fromIdx + 7);
          for (let i = maxAhead; i >= fromIdx; i--) {
            const dx = points[i].x - x, dy = points[i].y - y;
            if (dx * dx + dy * dy <= TOL * TOL) return i;
          }
          return -1;
        }

        arena.addEventListener('pointerdown', (e) => {
          if (locked) return;
          const idx = nearIdx(e.clientX, e.clientY, 0);
          if (idx >= 0 && idx <= 8) {
            tracing = true;
            progressIdx = Math.max(progressIdx, idx);
            paintProgress();
          }
        });
        arena.addEventListener('pointermove', (e) => {
          if (!tracing || locked) return;
          const idx = nearIdx(e.clientX, e.clientY, progressIdx);
          if (idx > progressIdx) {
            progressIdx = idx;
            litPath.style.transition = '';
            paintProgress();
            if (progressIdx >= points.length - 3) completeRound('fs_connect_trace');
          }
        });
        const stopTrace = () => {
          if (!tracing || locked) return;
          tracing = false;
          if (progressIdx < points.length - 3) attempts++;
          // ההתקדמות נשמרת — אפשר להמשיך מאותה נקודה או להשלים בלחיצה
        };
        arena.addEventListener('pointerup', stopTrace);
        arena.addEventListener('pointercancel', stopTrace);

        // Fallback בלחיצה: הקשה על אחד הרכיבים משלימה את החיבור
        [compA, compB].forEach((el) => el.addEventListener('click', () => {
          if (!locked) completeRound('fs_connect_tap');
        }));

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          locked = false;
          attempts = 0;
          progressIdx = 0;
          const def = ROUNDS[round];
          basePath.setAttribute('d', def.d);
          litPath.setAttribute('d', def.d);
          litPath.style.transition = '';
          placeComp(compA, def.a);
          placeComp(compB, def.b);
          requestAnimationFrame(() => { samplePath(); paintProgress(); });
          roundStart = performance.now();
        }

        startRound();
      },
    },
  };

  /* ============================================================
     שיווק דיגיטלי ודאטה — 2 שאלות + "תפסו את השיא"
     ============================================================ */

  const marketingGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'איפה בדרך כלל פוגשים פרסום דיגיטלי?',
          options: [
            { html: 'רק בשלטי חוצות ברחוב', correct: false, action: 'mk_billboards' },
            { html: 'רק בעיתון מודפס', correct: false, action: 'mk_newspaper' },
            { html: 'בגוגל, פייסבוק, אינסטגרם וטיקטוק', correct: true, action: 'mk_digital' },
          ],
        },
        {
          question: 'מה המטרה של פרסום דיגיטלי טוב?',
          options: [
            { html: 'לגרום לאנשים הנכונים להתעניין', correct: true, action: 'mk_right_people' },
            { html: 'להראות מודעה לכמה שיותר אנשים בלי קשר', correct: false, action: 'mk_spray' },
            { html: 'להסתיר מה הלקוח צריך לעשות', correct: false, action: 'mk_hide_cta' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'תפסו את השיא',
      sub: 'לחצו כשהמד מגיע לאזור הירוק',
      render(stage, mctx) {
        const later = makeLater(mctx);
        const ROUNDS = [
          { zone: { left: 55, width: 30 }, sweep: 1500 },
          { zone: { left: 14, width: 30 }, sweep: 1250 },
          { zone: { left: 60, width: 28 }, sweep: 1050 },
        ];
        let round = 0;
        let attempts = 0;
        let roundStart = 0;
        let rafId = null;
        let running = false;
        let t0 = 0;
        let sweep = 0;
        let zone = null;

        const wrap = mctx.h('div', 'mk-wrap');
        const meter = mctx.h('div', 'mk-meter');
        const zoneEl = mctx.h('div', 'mk-zone');
        const pointer = mctx.h('div', 'mk-pointer');
        meter.append(zoneEl, pointer);
        const tapBtn = mctx.h('button', 'btn btn--primary mk-tap-btn', 'לחצו! 🎯');
        tapBtn.type = 'button';
        wrap.append(meter, tapBtn);
        stage.appendChild(wrap);
        mctx.onCleanup(() => { running = false; if (rafId) cancelAnimationFrame(rafId); });

        function pos(now) {
          const el = (now - t0) % (sweep * 2);
          const t = el / sweep;
          return (t <= 1 ? t : 2 - t) * 100;
        }

        function paint(now) {
          pointer.style.left = pos(now) + '%';
          if (running) rafId = requestAnimationFrame(paint);
        }

        function applyZone() {
          zoneEl.style.left = zone.left + '%';
          zoneEl.style.width = zone.width + '%';
        }

        function tap() {
          if (!running) return;
          const p = pos(performance.now());
          if (p >= zone.left && p <= zone.left + zone.width) {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            pointer.style.left = p + '%';
            zoneEl.classList.add('hit');
            mctx.feedback('good', 'תזמון מצוין');
            buzz([14, 40, 14]);
            mctx.round({ correct: attempts < 2, action: attempts < 2 ? 'mk_peak_hit' : 'mk_peak_hit_late', rtMs: Math.round(performance.now() - roundStart) });
            later(() => {
              zoneEl.classList.remove('hit');
              round++;
              if (round >= 3) mctx.complete({ text: 'תפסתם את רגע השיא' });
              else startRound();
            }, 700);
          } else {
            attempts++;
            mctx.feedback('bad', 'כמעט! נסו שוב');
            buzz(24);
            meter.classList.add('nudge');
            later(() => meter.classList.remove('nudge'), 300);
            if (attempts === 2) {
              // מקלים: מאטים את המחוג ומרחיבים את האזור הירוק
              sweep = Math.round(sweep * 1.6);
              zone = { left: Math.max(4, zone.left - 8), width: Math.min(50, zone.width + 16) };
              applyZone();
              t0 = performance.now();
            }
          }
        }

        tapBtn.addEventListener('pointerdown', tap);
        meter.addEventListener('pointerdown', tap);

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          attempts = 0;
          const def = ROUNDS[round];
          zone = { ...def.zone };
          sweep = reducedMotion ? Math.round(def.sweep * 1.5) : def.sweep;
          applyZone();
          t0 = performance.now();
          roundStart = performance.now();
          running = true;
          rafId = requestAnimationFrame(paint);
        }

        startRound();
      },
    },
  };

  /* ============================================================
     עיצוב UX/UI — 2 שאלות + "השלימו את המסך"
     ============================================================ */

  const uxuiGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'איזה מסך יהיה בדרך כלל נוח יותר למשתמש?',
          options: [
            { html: 'מסך עם הרבה כפתורים דומים', correct: false, action: 'ux_many_buttons' },
            { html: 'מסך ברור עם פעולה מרכזית אחת', correct: true, action: 'ux_clear_action' },
            { html: 'מסך שבו צריך לנחש איפה ללחוץ', correct: false, action: 'ux_guess' },
          ],
        },
        {
          question: 'מה עוזר למשתמש להבין מהר מה לעשות באפליקציה?',
          options: [
            { html: 'טקסט קטן וצפוף', correct: false, action: 'ux_tiny_text' },
            { html: 'כמה שיותר אפשרויות במסך אחד', correct: false, action: 'ux_too_many' },
            { html: 'כפתור ברור והסבר קצר', correct: true, action: 'ux_clear_btn' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'השלימו את המסך',
      sub: 'גררו את הרכיב למקום המסומן',
      render(stage, mctx) {
        const later = makeLater(mctx);
        const ROUNDS = [
          { slot: 'top', pieceClass: 'p-title', pieceHTML: '<i class="uxp-mini-bar"></i> כותרת' },
          { slot: 'mid', pieceClass: 'p-image', pieceHTML: '🖼️ תמונה' },
          { slot: 'bottom', pieceClass: 'p-button', pieceHTML: '⬜ כפתור' },
        ];
        let round = 0;
        let attempts = 0;
        let roundStart = 0;
        let locked = false;
        let selected = false;

        const wrap = mctx.h('div', 'uxp-wrap');
        const frame = mctx.h('div', 'uxp-frame');
        const slotTop = mctx.h('button', 'uxp-slot s-top');
        const slotMid = mctx.h('button', 'uxp-slot s-mid');
        const slotBottom = mctx.h('button', 'uxp-slot s-bottom');
        [slotTop, slotMid, slotBottom].forEach((s) => { s.type = 'button'; s.disabled = true; });
        frame.append(
          slotTop,
          mctx.h('div', 'uxp-skel'),
          slotMid,
          mctx.h('div', 'uxp-skel short'),
          slotBottom
        );
        const tray = mctx.h('div', 'uxp-tray');
        wrap.append(frame, tray);
        stage.appendChild(wrap);

        const slotOf = { top: slotTop, mid: slotMid, bottom: slotBottom };
        let piece = null;
        let targetSlot = null;

        function place() {
          if (locked) return;
          locked = true;
          targetSlot.classList.remove('open');
          targetSlot.classList.add('filled', ROUNDS[round].pieceClass);
          targetSlot.innerHTML = ROUNDS[round].pieceHTML;
          targetSlot.disabled = true;
          if (piece) { piece.remove(); piece = null; }
          mctx.feedback('good', 'הרכיב במקום');
          buzz([14, 40, 14]);
          mctx.round({ correct: attempts < 2, action: 'ux_place_' + ROUNDS[round].slot, rtMs: Math.round(performance.now() - roundStart) });
          later(() => {
            round++;
            if (round >= 3) {
              frame.classList.add('done');
              mctx.complete({ text: 'המסך הושלם' });
            } else {
              startRound();
            }
          }, 650);
        }

        function makePiece(def) {
          const p = mctx.h('button', 'uxp-piece ' + def.pieceClass);
          p.type = 'button';
          p.innerHTML = def.pieceHTML;

          // גרירה עם Pointer Events + Fallback בלחיצה
          p.addEventListener('pointerdown', (e) => {
            if (locked) return;
            let moved = false;
            p.setPointerCapture(e.pointerId);
            p.classList.add('dragging');
            const startX = e.clientX, startY = e.clientY;
            const move = (ev) => {
              const dx = ev.clientX - startX, dy = ev.clientY - startY;
              if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
              p.style.transform = `translate(${dx}px, ${dy}px)`;
            };
            const up = (ev) => {
              p.classList.remove('dragging');
              p.removeEventListener('pointermove', move);
              p.removeEventListener('pointerup', up);
              p.removeEventListener('pointercancel', up);
              if (!moved) {
                // לחיצה קצרה — בחירת הרכיב; לחיצה על היעד תניח אותו
                selected = !selected;
                p.classList.toggle('selected', selected);
                p.style.transform = '';
                return;
              }
              const sr = targetSlot.getBoundingClientRect();
              const pad = 34; // סובלנות נדיבה
              if (ev.clientX >= sr.left - pad && ev.clientX <= sr.right + pad &&
                  ev.clientY >= sr.top - pad && ev.clientY <= sr.bottom + pad) {
                place();
              } else {
                attempts++;
                p.style.transition = 'transform 0.3s ease';
                p.style.transform = '';
                later(() => (p.style.transition = ''), 320);
              }
            };
            p.addEventListener('pointermove', move);
            p.addEventListener('pointerup', up);
            p.addEventListener('pointercancel', up);
          });
          return p;
        }

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          attempts = 0;
          locked = false;
          selected = false;
          const def = ROUNDS[round];
          targetSlot = slotOf[def.slot];
          targetSlot.classList.add('open');
          targetSlot.disabled = false;
          targetSlot.innerHTML = '<span class="uxp-slot-hint">כאן</span>';
          // לחיצה על היעד המסומן מניחה את הרכיב — Fallback שלא מצריך גרירה
          targetSlot.onclick = () => { if (!locked) place(); };
          tray.innerHTML = '';
          piece = makePiece(def);
          tray.appendChild(piece);
          roundStart = performance.now();
        }

        startRound();
      },
    },
  };

  /* ============================================================
     DevOps — 2 שאלות + "הפעילו את התהליך"
     ============================================================ */

  const devopsGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'מה חשוב באתר או אפליקציה שאנשים משתמשים בהם?',
          options: [
            { html: 'שהמערכת תעבוד בצורה יציבה', correct: true, action: 'devops_stable' },
            { html: 'שהיא תקרוס לפעמים', correct: false, action: 'devops_crash_ok' },
            { html: 'שיהיה קשה להבין אם היא עובדת', correct: false, action: 'devops_opaque' },
          ],
        },
        {
          question: 'אם הרבה אנשים נכנסים לאתר באותו זמן, מה עדיף שיקרה?',
          options: [
            { html: 'שהאתר ייסגר מיד', correct: false, action: 'devops_close' },
            { html: 'שהאתר ימשיך לעבוד בצורה תקינה', correct: true, action: 'devops_keep_working' },
            { html: 'שהעמוד ייעלם מהמסך', correct: false, action: 'devops_vanish' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: 'קור רוח של DevOps! 🧊' });
    },
    finalMission: {
      title: 'הפעילו את התהליך',
      sub: 'לחצו על התחנה כשהיא נדלקת',
      render(stage, mctx) {
        const later = makeLater(mctx);
        const STATIONS = [
          { id: 'code', label: 'Code', ico: '⌨️' },
          { id: 'build', label: 'Build', ico: '🧱' },
          { id: 'test', label: 'Test', ico: '🧪' },
          { id: 'deploy', label: 'Deploy', ico: '🚀' },
        ];
        const SEQ = shuffle([0, 1, 2, 3]).slice(0, 3);
        let round = 0;
        let roundStart = 0;
        let litIdx = -1;
        let locked = true;

        const pipe = mctx.h('div', 'dv-pipe');
        const nodes = [];
        const links = [];
        STATIONS.forEach((s, i) => {
          const n = mctx.h('button', 'dv-station');
          n.type = 'button';
          n.innerHTML = `<span class="dv-ico">${s.ico}</span><span class="dv-label">${s.label}</span>`;
          n.addEventListener('pointerdown', () => {
            if (locked) return;
            if (i !== litIdx) {
              // תחנה כבויה — ניעור קטן, בלי עונש. אי אפשר להיתקע.
              n.classList.add('nudge');
              later(() => n.classList.remove('nudge'), 300);
              return;
            }
            locked = true;
            n.classList.remove('lit');
            n.classList.add('done');
            // אנרגיה זורמת אל התחנה הבאה
            if (!reducedMotion && links[i]) {
              links[i].classList.add('flow');
              later(() => links[i].classList.remove('flow'), 700);
            }
            mctx.feedback('good', 'השלב הושלם');
            buzz([14, 40, 14]);
            mctx.round({ correct: true, action: 'devops_step_' + STATIONS[i].id, rtMs: Math.round(performance.now() - roundStart) });
            later(() => {
              round++;
              if (round >= 3) mctx.complete({ text: 'התהליך הושלם בהצלחה' });
              else startRound();
            }, 700);
          });
          nodes.push(n);
          pipe.appendChild(n);
          if (i < STATIONS.length - 1) {
            const link = mctx.h('div', 'dv-link');
            links.push(link);
            pipe.appendChild(link);
          }
        });
        stage.appendChild(pipe);

        function startRound() {
          mctx.progress(`${round + 1} מתוך 3`);
          nodes.forEach((n) => n.classList.remove('lit'));
          litIdx = SEQ[round];
          // הדלקה אחרי השהיה קצרה — כדי שיהיה רגע של ציפייה
          locked = true;
          later(() => {
            nodes[litIdx].classList.add('lit');
            locked = false;
            roundStart = performance.now();
          }, 450 + Math.random() * 400);
        }

        startRound();
      },
    },
  };

  /* ---------- מיפוי משחק לכל קורס ---------- */

  window.GAMES = {
    cyber: cyberGame,
    ai: aiGame,
    qa: qaGame,
    fullstack: fullstackGame,
    marketing: marketingGame,
    uxui: uxuiGame,
    devops: devopsGame,
  };
})();
