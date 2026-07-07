/* ============================================================
   מנוע המשחקים — אתגר ייעודי לכל אחד משבעת הקורסים
   ------------------------------------------------------------
   כל משחק מוגדר כאובייקט:
     rounds        — מספר שאלות
     renderRound   — בונה את השאלה הנוכחית בתוך ה־stage
     finalMission  — (אופציונלי) משימת סיום אינטראקטיבית במקום
                     סיבוב המהירות הגנרי. render(stage, mctx).
   חוקי המשחק:
   - טעות לא מקדמת ולא חושפת את התשובה: המשתמש מקבל
     "הזדמנות נוספת" (האפשרות השגויה ננעלת) עד שעונים נכון.
   - הדיווח: ctx.answer({correct, action, text}).
   - משימת סיום: mctx.complete({correct, action, text}) מסיימת,
     mctx.feedback(kind, text) לפידבק ביניים.
   ============================================================ */

(function () {
  'use strict';

  const C = window.CONFIG;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const retry = () => C.texts.retryFeedback[Math.floor(Math.random() * C.texts.retryFeedback.length)];

  /* ---------- שאלה עם אפשרויות — טעות מקבלת הזדמנות נוספת ---------- */

  function buildQuestion(ctx, stage, { question, sub, options, goodText }) {
    if (question) stage.appendChild(ctx.h('div', 'game-q', question));
    if (sub) stage.appendChild(ctx.h('div', 'game-q-sub', sub));
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
    stage.appendChild(grid);
    return grid;
  }

  const GOOD = ['חשיבה מדויקת! 🎯', 'החלטה נכונה!', 'מדויק!', 'יפה מאוד!'];
  const g = () => GOOD[Math.floor(Math.random() * GOOD.length)];

  /* טיימר קטן למשימות סיום — פס שמתרוקן; מחזיר עצירה */
  function missionTimer(mctx, stage, seconds, onExpire) {
    const bar = mctx.h('div', 'mission-timer', '<div class="mission-timer-fill"></div>');
    stage.appendChild(bar);
    const fill = bar.querySelector('.mission-timer-fill');
    const t0 = performance.now();
    let raf = null;
    let stopped = false;
    (function frame(now) {
      if (stopped) return;
      const left = 1 - (now - t0) / (seconds * 1000);
      fill.style.transform = `scaleX(${Math.max(0, left)})`;
      if (left <= 0) { onExpire(); return; }
      raf = requestAnimationFrame(frame);
    })(performance.now());
    mctx.onCleanup(() => { stopped = true; cancelAnimationFrame(raf); });
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  /* ============================================================
     סייבר — 3 שאלות (משימת הסיום: סיבוב המהירות הגנרי)
     ============================================================ */

  const cyberGame = {
    rounds: 3,
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
        {
          question: 'מצאתם פרצת אבטחה בשרת של החברה. מה הצעד הראשון?',
          options: [
            { html: 'מדווחים מיד לצוות האבטחה ופועלים לפי הנהלים', correct: true, action: 'cyber_report' },
            { html: 'מתעלמים – זו לא אחריותי', correct: false, action: 'cyber_ignore' },
            { html: 'מנסים לטפל לבד בלי לדווח לאף אחד', correct: false, action: 'cyber_solo' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
  };

  /* ============================================================
     AI — 3 שאלות (משימת הסיום: סיבוב המהירות הגנרי)
     ============================================================ */

  const aiGame = {
    rounds: 3,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'מודל AI אומן לזהות עצמים בתמונות שצולמו ביום, אבל מתקשה בתמונות לילה. מה הסיבה הסבירה ביותר?',
          options: [
            { html: 'המודל קיבל דוגמאות שלא היו מגוונות מספיק', correct: true, action: 'ai_data_diversity' },
            { html: 'המחשב שעליו הוא פועל איטי מדי', correct: false, action: 'ai_slow_pc' },
            { html: 'צריך להציג לו כל תמונה פעמיים', correct: false, action: 'ai_twice' },
          ],
        },
        {
          question: 'מערכת AI סיכמה מסמך, אך הוסיפה פרט שלא הופיע בו. מה נכון לעשות?',
          options: [
            { html: 'לבדוק את התשובה מול המסמך ולבקש ממנה להסתמך רק עליו', correct: true, action: 'ai_verify' },
            { html: 'לסמוך עליה כי התשובה נוסחה בביטחון', correct: false, action: 'ai_trust' },
            { html: 'לבקש ממנה לכתוב תשובה ארוכה יותר', correct: false, action: 'ai_longer' },
          ],
        },
        {
          question: 'המודל קיבל את הדוגמאות: 2 הופך ל־4, 3 ל־6 ו־5 ל־10. איזה חוק הוא למד?',
          options: [
            { html: 'כפול 2', correct: true, action: 'ai_double' },
            { html: 'ועוד 2', correct: false, action: 'ai_plus2' },
            { html: 'מספר אקראי', correct: false, action: 'ai_random' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: 'חשיבה של מודל! 🧠' });
    },
  };

  /* ============================================================
     QA — 2 שלבי באגים + משימת סיום: "מצאו את הבאג" עם טיימר
     ============================================================ */

  function buildBugScreen(ctx, stage, data, { onBug, onWrong }) {
    const mock = ctx.h('div', 'qa-mock');
    mock.appendChild(ctx.h('div', 'qa-mock-titlebar', '<span></span><span></span><span></span>'));
    mock.appendChild(ctx.h('div', 'qa-mock-title', data.title));
    data.elements.forEach((elDef) => {
      const el = ctx.h('button', 'qa-el');
      el.type = 'button';
      el.innerHTML = elDef.html;
      el.addEventListener('click', () => {
        if (el.disabled) return;
        if (elDef.bug) {
          mock.querySelectorAll('.qa-el').forEach((btn) => (btn.disabled = true));
          el.classList.add('found');
          if (elDef.fix) el.innerHTML = elDef.fix + ' <span class="qa-fixed">✓ תוקן</span>';
          onBug(elDef);
        } else {
          el.disabled = true;
          el.classList.add('wrong-el');
          onWrong();
        }
      });
      mock.appendChild(el);
    });
    stage.appendChild(mock);
    return mock;
  }

  const QA_MISSIONS = [
    {
      title: 'סיכום הזמנה',
      elements: [
        { html: '2 × חולצה — 50 ש"ח ליחידה' },
        { html: 'משלוח — 20 ש"ח' },
        { html: 'סה"כ לתשלום: 140 ש"ח', bug: true, action: 'qa_wrong_total', fix: 'סה"כ לתשלום: 120 ש"ח' },
        { html: 'תשלום מאובטח בכרטיס אשראי' },
      ],
    },
    {
      title: 'פרטים אישיים',
      elements: [
        { html: 'שם מלא: דנה לוי' },
        { html: 'אימייל: dana@gmail.com' },
        { html: 'תאריך לידה: 31.02.1999', bug: true, action: 'qa_impossible_date', fix: 'תאריך לידה: 28.02.1999' },
        { html: 'טלפון: 050-1234567' },
      ],
    },
    {
      title: 'טופס הרשמה',
      elements: [
        { html: 'שם משתמש: dana88' },
        { html: 'אימייל: dana@gmail.com' },
        { html: 'טלפון: abc12345', bug: true, action: 'qa_invalid_phone', fix: 'טלפון: 050-1234567' },
        { html: 'כפתור שליחה פעיל' },
      ],
    },
  ];

  const QA_GOOD = ['זיהוי מעולה! 🐞', 'באג אותר!', 'חשיבה חדה!'];

  const qaGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const data = QA_MISSIONS[ctx.round % 2]; // שני השלבים הראשונים
      stage.appendChild(ctx.h('div', 'game-q', 'איפה הבאג? לחצו על השורה הבעייתית'));
      buildBugScreen(ctx, stage, data, {
        onBug: (elDef) => ctx.answer({ correct: true, action: elDef.action, text: QA_GOOD[Math.floor(Math.random() * QA_GOOD.length)] }),
        onWrong: () => ctx.answer({ correct: false, action: 'qa_wrong_element', text: retry() }),
      });
    },
    finalMission: {
      title: 'משימת סיום: מצאו את הבאג',
      sub: 'יש לכם כמה שניות לזהות את הטעות במסך שלפניכם. לחצו על השורה הבעייתית.',
      render(stage, mctx) {
        // וריאציה אקראית מתוך שלוש
        const data = QA_MISSIONS[Math.floor(Math.random() * QA_MISSIONS.length)];

        let done = false;
        const stopTimer = missionTimer(mctx, stage, 9, () => {
          if (done) return;
          done = true;
          // הזמן נגמר — חושפים את הבאג וממשיכים בעדינות
          const idx = data.elements.findIndex((e) => e.bug);
          const rows = stage.querySelectorAll('.qa-el');
          rows.forEach((r) => (r.disabled = true));
          if (rows[idx]) rows[idx].classList.add('found');
          mctx.complete({ correct: false, action: 'qa_mission_timeout', text: 'הזמן נגמר — הנה הבאג! ממשיכים לתוצאה' });
        });

        buildBugScreen(mctx, stage, data, {
          onBug: (elDef) => {
            if (done) return;
            done = true;
            stopTimer();
            mctx.complete({ correct: true, action: elDef.action, text: QA_GOOD[Math.floor(Math.random() * QA_GOOD.length)] });
          },
          onWrong: () => { if (!done) mctx.feedback('bad', retry()); },
        });
      },
    },
  };

  /* ============================================================
     פיתוח Full Stack — לוגיקה כללית + משימת "תכננו את הדרך"
     ============================================================ */

  const fullstackGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'המערכת מתחילה במספר 3, מוסיפה 2 ואז מכפילה את התוצאה ב־2. מה התוצאה הסופית?',
          options: [
            { html: '10', correct: true, action: 'fs_math_10' },
            { html: '8', correct: false, action: 'fs_math_8' },
            { html: '12', correct: false, action: 'fs_math_12' },
          ],
        },
        {
          question: 'כפתור "המשך" פועל רק אם הוזנו גם אימייל תקין וגם סיסמה של לפחות 8 תווים. האימייל תקין, אבל הסיסמה כוללת 6 תווים. מה יקרה?',
          options: [
            { html: 'הכפתור יישאר לא פעיל', correct: true, action: 'fs_cond_disabled' },
            { html: 'הכפתור יפעל', correct: false, action: 'fs_cond_active' },
            { html: 'המערכת תמחק את האימייל', correct: false, action: 'fs_cond_delete' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'משימת סיום: תכננו את הדרך',
      sub: 'בחרו את הפקודות בסדר הנכון והובילו את הדמות אל היעד',
      render(stage, mctx) {
        const SIZE = 3;
        const start = { r: 0, c: 0 };          // פינה שמאלית-עליונה (פיזית)
        const target = { r: 2, c: 2 };         // פינה ימנית-תחתונה
        const correctPath = ['right', 'right', 'down', 'down'];

        const wrap = mctx.h('div', 'path-wrap');
        const grid = mctx.h('div', 'path-grid');
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            const cell = mctx.h('div', 'path-cell');
            if (r === target.r && c === target.c) { cell.classList.add('target'); cell.textContent = '🎯'; }
            grid.appendChild(cell);
          }
        }
        const char = mctx.h('div', 'path-char', '🤖');
        grid.appendChild(char);
        wrap.appendChild(grid);

        const seq = mctx.h('div', 'path-seq');
        const cmds = mctx.h('div', 'path-cmds');
        const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
        const chosen = [];

        function placeChar(r, c) {
          char.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
        }
        placeChar(start.r, start.c);

        function refreshSeq() {
          seq.innerHTML = '';
          chosen.forEach((d) => seq.appendChild(mctx.h('span', 'seq-chip', ARROWS[d])));
          if (!chosen.length) seq.appendChild(mctx.h('span', 'seq-chip empty', 'בחרו פקודות…'));
          runBtn.disabled = chosen.length === 0;
          undoBtn.disabled = chosen.length === 0;
          Object.values(arrowBtns).forEach((b) => (b.disabled = chosen.length >= 4 || locked));
        }

        let locked = false;
        const arrowBtns = {};
        ['up', 'down', 'right', 'left'].forEach((dir) => {
          const b = mctx.h('button', 'cmd-btn', ARROWS[dir]);
          b.type = 'button';
          b.setAttribute('aria-label', dir);
          b.addEventListener('click', () => {
            if (locked || chosen.length >= 4) return;
            chosen.push(dir);
            refreshSeq();
          });
          arrowBtns[dir] = b;
          cmds.appendChild(b);
        });

        const actions = mctx.h('div', 'path-actions');
        const undoBtn = mctx.h('button', 'cmd-btn undo', '⌫');
        undoBtn.type = 'button';
        undoBtn.addEventListener('click', () => { if (!locked) { chosen.pop(); refreshSeq(); } });
        const runBtn = mctx.h('button', 'cmd-btn run', '▶ הפעלה');
        runBtn.type = 'button';
        actions.append(undoBtn, runBtn);

        const timeouts = [];
        const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
        mctx.onCleanup(() => timeouts.forEach(clearTimeout));

        function animatePath(path, from, cb) {
          let pos = { ...from };
          placeChar(pos.r, pos.c);
          path.forEach((dir, i) => {
            later(() => {
              if (dir === 'up') pos.r = Math.max(0, pos.r - 1);
              if (dir === 'down') pos.r = Math.min(SIZE - 1, pos.r + 1);
              if (dir === 'left') pos.c = Math.max(0, pos.c - 1);
              if (dir === 'right') pos.c = Math.min(SIZE - 1, pos.c + 1);
              placeChar(pos.r, pos.c);
              if (i === path.length - 1) later(() => cb(pos), 340);
            }, 340 * (i + 1));
          });
        }

        runBtn.addEventListener('click', () => {
          if (locked || !chosen.length) return;
          locked = true;
          refreshSeq();
          runBtn.disabled = true;
          animatePath(chosen, start, (end) => {
            if (end.r === target.r && end.c === target.c) {
              mctx.complete({ correct: true, action: 'fs_path_' + chosen.join('_'), text: 'רצף נכון! חשיבה לוגית מעולה 🤖' });
            } else {
              mctx.feedback('bad', 'כמעט! בואו נראה את המסלול הנכון');
              later(() => {
                animatePath(correctPath, start, () => {
                  mctx.complete({ correct: false, action: 'fs_path_wrong', text: 'זה המסלול הנכון — ממשיכים לתוצאה' });
                });
              }, 900);
            }
          });
        });

        wrap.append(seq, cmds, actions);
        stage.appendChild(wrap);
        refreshSeq();
      },
    },
  };

  /* ============================================================
     שיווק דיגיטלי ודאטה — החלטות + משימת "לאן מעבירים את התקציב?"
     ============================================================ */

  const marketingGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'מודעה א׳ קיבלה 1,000 קליקים והביאה 20 רכישות. מודעה ב׳ קיבלה 600 קליקים והביאה 30 רכישות. איזו מודעה יעילה יותר?',
          options: [
            { html: 'מודעה ב׳ – כי הפכה יותר גולשים ללקוחות', correct: true, action: 'mk_conversion' },
            { html: 'מודעה א׳ – כי קיבלה יותר קליקים', correct: false, action: 'mk_clicks' },
            { html: 'שתיהן יעילות באותה מידה', correct: false, action: 'mk_equal' },
          ],
        },
        {
          question: 'עסק משיק אפליקציה חדשה לאימוני כושר בבית. עם איזה קהל הכי הגיוני להתחיל?',
          options: [
            { html: 'אנשים שמתעניינים בכושר, בריאות ואימונים ביתיים', correct: true, action: 'mk_target_fit' },
            { html: 'כל האנשים בישראל', correct: false, action: 'mk_everyone' },
            { html: 'אנשים שמתעניינים בגינון ובישול', correct: false, action: 'mk_wrong_aud' },
          ],
        },
      ];
      buildQuestion(ctx, stage, { ...rounds[ctx.round % rounds.length], goodText: g() });
    },
    finalMission: {
      title: 'משימת סיום: לאן מעבירים את התקציב?',
      sub: 'בדקו את התוצאות וגררו את תקציב ההמשך לקמפיין שהכי כדאי לחזק (אפשר גם בלחיצה)',
      render(stage, mctx) {
        const CAMPS = [
          { id: 'A', clicks: '1,000 קליקים', leads: '20 לידים', cpl: 'עלות לליד: 80 ₪', correct: false },
          { id: 'B', clicks: '600 קליקים', leads: '30 לידים', cpl: 'עלות לליד: 45 ₪', correct: true },
          { id: 'C', clicks: '400 קליקים', leads: '12 לידים', cpl: 'עלות לליד: 65 ₪', correct: false },
        ];

        const grid = mctx.h('div', 'camp-grid');
        const cardEls = {};
        CAMPS.forEach((c) => {
          const card = mctx.h('button', 'camp-card');
          card.type = 'button';
          card.innerHTML = `<strong>קמפיין ${c.id}</strong><span>${c.clicks}</span><span>${c.leads}</span><em>${c.cpl}</em>`;
          cardEls[c.id] = card;
          grid.appendChild(card);
        });
        stage.appendChild(grid);

        const token = mctx.h('div', 'budget-token', '💰 תקציב המשך');
        stage.appendChild(token);

        let done = false;
        const timeouts = [];
        const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
        mctx.onCleanup(() => timeouts.forEach(clearTimeout));

        function assign(campId) {
          if (done) return;
          done = true;
          const camp = CAMPS.find((c) => c.id === campId);
          const card = cardEls[campId];
          // אנימציית מעבר התקציב אל הכרטיס
          const cr = card.getBoundingClientRect();
          const tr = token.getBoundingClientRect();
          token.style.transition = 'transform 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.3s 0.4s';
          token.style.transform = `translate(${cr.left + cr.width / 2 - (tr.left + tr.width / 2)}px, ${cr.top + cr.height / 2 - (tr.top + tr.height / 2)}px) scale(0.6)`;
          later(() => (token.style.opacity = '0'), 400);
          card.classList.add('assigned');

          if (camp.correct) {
            later(() => mctx.complete({ correct: true, action: 'mk_budget_B', text: 'החלטה חכמה! זיהיתם את הקמפיין היעיל ביותר 📈' }), 550);
          } else {
            later(() => {
              mctx.feedback('bad', 'כמעט! כדאי לבדוק גם כמה תוצאות התקבלו ומה הייתה העלות שלהן');
              cardEls.B.classList.add('reveal');
              later(() => mctx.complete({ correct: false, action: 'mk_budget_' + campId, text: 'קמפיין B הביא הכי הרבה לידים בעלות הנמוכה ביותר' }), 1600);
            }, 550);
          }
        }

        // לחיצה על כרטיס = הקצאה (Fallback נוח למובייל)
        Object.entries(cardEls).forEach(([id, card]) => card.addEventListener('click', () => assign(id)));

        // גרירה עם Pointer Events
        let dragging = false;
        token.addEventListener('pointerdown', (e) => {
          if (done) return;
          dragging = true;
          token.setPointerCapture(e.pointerId);
          token.classList.add('dragging');
          const base = token.getBoundingClientRect();
          const ox = e.clientX - (base.left + base.width / 2);
          const oy = e.clientY - (base.top + base.height / 2);
          const move = (ev) => {
            if (!dragging) return;
            token.style.transform = `translate(${ev.clientX - (base.left + base.width / 2) - ox}px, ${ev.clientY - (base.top + base.height / 2) - oy}px)`;
          };
          const up = (ev) => {
            dragging = false;
            token.classList.remove('dragging');
            token.removeEventListener('pointermove', move);
            token.removeEventListener('pointerup', up);
            token.style.pointerEvents = 'none';
            const under = document.elementFromPoint(ev.clientX, ev.clientY);
            token.style.pointerEvents = '';
            const card = under && under.closest('.camp-card');
            if (card) {
              const id = Object.keys(cardEls).find((k) => cardEls[k] === card);
              if (id) { assign(id); return; }
            }
            token.style.transition = 'transform 0.3s ease';
            token.style.transform = 'translate(0, 0)';
          };
          token.addEventListener('pointermove', move);
          token.addEventListener('pointerup', up);
        });
      },
    },
  };

  /* ============================================================
     עיצוב UX/UI — שאלת מסכים + משימת "בנו את המסך"
     ============================================================ */

  function miniMock(mctx, variant) {
    // תצוגות מיניאטוריות של מסכי מובייל, בנויות מבלוקים
    if (variant === 1) {
      return `<span class="mm-row"><i class="mm-btn"></i><i class="mm-btn"></i></span>
              <span class="mm-row"><i class="mm-btn"></i><i class="mm-btn"></i></span>
              <span class="mm-row"><i class="mm-btn"></i><i class="mm-btn"></i></span>`;
    }
    if (variant === 2) {
      return `<i class="mm-title"></i><i class="mm-field"></i><i class="mm-field"></i><i class="mm-cta"></i>`;
    }
    return `<i class="mm-hero"></i><i class="mm-line"></i><i class="mm-line"></i><i class="mm-line short"></i><i class="mm-tiny-btn"></i>`;
  }

  const uxuiGame = {
    rounds: 1,
    renderRound(stage, ctx) {
      stage.appendChild(ctx.h('div', 'game-q', 'משתמש נכנס לאפליקציה כדי לקבוע פגישה במהירות. איזה מסך יעזור לו להשלים את הפעולה בצורה הקלה ביותר?'));
      const grid = ctx.h('div', 'mini-grid');
      let solved = false;

      shuffle([
        { v: 1, correct: false, action: 'ux_screen_buttons' },
        { v: 2, correct: true, action: 'ux_screen_clear' },
        { v: 3, correct: false, action: 'ux_screen_hero' },
      ]).forEach((opt, i) => {
        const btn = ctx.h('button', 'mini-mock');
        btn.type = 'button';
        btn.dataset.key = String(i + 1);
        btn.innerHTML = `<span class="mm-label">מסך ${i + 1}</span><span class="mm-screen">${miniMock(ctx, opt.v)}</span>`;
        btn.addEventListener('click', () => {
          if (solved || btn.disabled) return;
          if (opt.correct) {
            solved = true;
            grid.querySelectorAll('.mini-mock').forEach((b) => (b.disabled = true));
            btn.classList.add('correct');
            ctx.answer({ correct: true, action: opt.action, text: 'בחירה מצוינת — המסך מוביל את המשתמש ישירות למטרה ✨' });
          } else {
            btn.disabled = true;
            btn.classList.add('wrong');
            ctx.answer({ correct: false, action: opt.action, text: retry() });
          }
        });
        grid.appendChild(btn);
      });
      stage.appendChild(grid);
    },
    finalMission: {
      title: 'משימת סיום: בנו את המסך',
      sub: 'בחרו וסדרו את הרכיבים החשובים ביותר למסך קביעת פגישה — לחיצה על רכיב מוסיפה אותו',
      render(stage, mctx) {
        const COMPS = [
          { id: 'title', label: 'כותרת ברורה' },
          { id: 'service', label: 'בחירת שירות' },
          { id: 'time', label: 'בחירת מועד' },
          { id: 'cta', label: 'כפתור קביעת פגישה' },
          { id: 'banner', label: 'באנר פרסומי' },
          { id: 'about', label: 'פסקה ארוכה על החברה' },
        ];
        const CORRECT = ['title', 'service', 'time', 'cta'];

        const wrap = mctx.h('div', 'builder-wrap');
        const phone = mctx.h('div', 'phone-frame');
        const slots = [];
        for (let i = 0; i < 4; i++) {
          const s = mctx.h('button', 'ph-slot empty');
          s.type = 'button';
          s.textContent = 'אזור ' + (i + 1);
          slots.push(s);
          phone.appendChild(s);
        }
        const tray = mctx.h('div', 'comp-tray');
        const chips = {};
        shuffle(COMPS).forEach((cDef) => {
          const chip = mctx.h('button', 'comp-chip', cDef.label);
          chip.type = 'button';
          chip.dataset.comp = cDef.id;
          chips[cDef.id] = chip;
          tray.appendChild(chip);
        });
        wrap.append(phone, tray);
        stage.appendChild(wrap);

        const placed = []; // מזהי רכיבים לפי סדר האזורים
        let locked = false;
        const timeouts = [];
        const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
        mctx.onCleanup(() => timeouts.forEach(clearTimeout));

        function fillSlot(slot, compId) {
          slot.classList.remove('empty');
          slot.dataset.comp = compId;
          slot.textContent = COMPS.find((c) => c.id === compId).label;
        }
        function emptySlot(slot) {
          slot.classList.add('empty');
          delete slot.dataset.comp;
          slot.textContent = 'אזור ' + (slots.indexOf(slot) + 1);
        }

        function evaluate() {
          locked = true;
          Object.values(chips).forEach((c) => (c.disabled = true));
          slots.forEach((s) => (s.disabled = true));
          const ok = placed.length === 4 && placed.every((id, i) => id === CORRECT[i]);
          if (ok) {
            phone.classList.add('built-ok');
            mctx.complete({ correct: true, action: 'ux_build_correct', text: 'מסך ברור וממוקד — היררכיה מצוינת ✨' });
          } else {
            mctx.feedback('bad', 'כמעט! בחוויית משתמש טובה נותנים עדיפות לפעולה המרכזית');
            // סידור נכון באנימציה קצרה
            later(() => {
              slots.forEach((s, i) => {
                later(() => { fillSlot(s, CORRECT[i]); s.classList.add('fixed'); }, i * 260);
              });
              later(() => {
                phone.classList.add('built-ok');
                mctx.complete({ correct: false, action: 'ux_build_fixed', text: 'זה הסדר המומלץ — ממשיכים לתוצאה' });
              }, 4 * 260 + 500);
            }, 1100);
          }
        }

        Object.entries(chips).forEach(([id, chip]) => {
          chip.addEventListener('click', () => {
            if (locked || chip.disabled) return;
            const slot = slots.find((s) => s.classList.contains('empty'));
            if (!slot) return;
            chip.disabled = true;
            fillSlot(slot, id);
            placed[slots.indexOf(slot)] = id;
            if (placed.filter(Boolean).length === 4) later(evaluate, 250);
          });
        });
        slots.forEach((slot) => {
          slot.addEventListener('click', () => {
            if (locked || slot.classList.contains('empty')) return;
            const id = slot.dataset.comp;
            placed[slots.indexOf(slot)] = undefined;
            emptySlot(slot);
            if (chips[id]) chips[id].disabled = false;
          });
        });
      },
    },
  };

  /* ============================================================
     DevOps — שאלת Rollback ויזואלית + משימת "אזנו את העומס"
     ============================================================ */

  function pipeNode(ctx, label, state, icon) {
    const el = ctx.h('div', 'pipe-node ' + state);
    el.innerHTML = `<span class="pipe-ico">${icon}</span><span>${label}</span>`;
    return el;
  }

  const devopsGame = {
    rounds: 1,
    renderRound(stage, ctx) {
      // התהליך: הכל ירוק עד ה-Deploy — ואז המערכת קרסה
      const pipe = ctx.h('div', 'pipeline');
      const nodes = [
        pipeNode(ctx, 'Code', 'ok', '✓'),
        pipeNode(ctx, 'Build', 'ok', '✓'),
        pipeNode(ctx, 'Test', 'ok', '✓'),
        pipeNode(ctx, 'Deploy', 'fail', '✕'),
      ];
      nodes.forEach((n, i) => {
        pipe.appendChild(n);
        if (i < nodes.length - 1) pipe.appendChild(ctx.h('div', 'pipe-link lit'));
      });
      stage.appendChild(pipe);

      buildQuestion(ctx, stage, {
        question: 'עדכון חדש עלה לאתר ומיד אחריו המערכת הפסיקה לעבוד. מה הפעולה ההגיונית הראשונה?',
        options: [
          { html: 'להחזיר זמנית את הגרסה הקודמת שעבדה', correct: true, action: 'devops_rollback' },
          { html: 'להמשיך להעלות שינויים נוספים', correct: false, action: 'devops_push_more' },
          { html: 'להמתין ולראות אם התקלה תסתדר לבד', correct: false, action: 'devops_wait' },
        ],
        goodText: 'קור רוח של DevOps! 🧊',
      });
    },
    finalMission: {
      title: 'משימת סיום: אזנו את העומס',
      sub: 'נתבו את הבקשות בין שני השרתים ושמרו על שניהם מחוץ לאזור האדום',
      render(stage, mctx) {
        const wrap = mctx.h('div', 'srv-wrap');
        const packetZone = mctx.h('div', 'packet-zone');
        const servers = [0, 1].map((i) => {
          const card = mctx.h('button', 'srv-card');
          card.type = 'button';
          card.dataset.key = String(i + 1);
          card.innerHTML = `
            <span class="srv-ico">🖥️</span>
            <span class="srv-name">שרת ${i === 0 ? 'א' : 'ב'}</span>
            <span class="srv-bar"><span class="srv-fill"></span></span>
            <span class="srv-pct">0%</span>`;
          return card;
        });
        wrap.append(servers[0], servers[1]);
        stage.append(packetZone, wrap);

        const load = [0, 0];
        const TOTAL = 8;
        let sent = 0;
        let done = false;
        let packet = null;
        const timeouts = [];
        const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
        mctx.onCleanup(() => { done = true; timeouts.forEach(clearTimeout); });

        function paint(i) {
          const fill = servers[i].querySelector('.srv-fill');
          const pct = servers[i].querySelector('.srv-pct');
          fill.style.height = load[i] + '%';
          pct.textContent = load[i] + '%';
          const state = load[i] >= 85 ? 'red' : load[i] >= 60 ? 'yellow' : 'green';
          servers[i].dataset.load = state;
        }

        function finish(ok) {
          if (done) return;
          done = true;
          servers.forEach((s) => (s.disabled = true));
          if (ok) {
            mctx.complete({ correct: true, action: 'devops_balanced', text: 'המערכת נשארה יציבה — איזון מצוין 🖥️' });
          } else {
            mctx.feedback('bad', 'כמעט! חלוקה מאוזנת יותר שומרת על המערכת יציבה');
            later(() => {
              load[0] = 55; load[1] = 55;
              paint(0); paint(1);
              later(() => mctx.complete({ correct: false, action: 'devops_overload', text: 'העומס אוזן — ממשיכים לתוצאה' }), 900);
            }, 900);
          }
        }

        function spawnPacket() {
          if (done) return;
          if (sent >= TOTAL) {
            finish(true);
            return;
          }
          packetZone.innerHTML = '';
          packet = mctx.h('div', 'packet', '📦 בקשה נכנסת — בחרו שרת');
          packetZone.appendChild(packet);
          // אם אין בחירה תוך 4 שניות — מנתבים אוטומטית לשרת הפנוי
          later(() => {
            if (!done && packet && packet.isConnected) route(load[0] <= load[1] ? 0 : 1, true);
          }, 4000);
        }

        function route(i, auto) {
          if (done || !packet || !packet.isConnected) return;
          const p = packet;
          packet = null;
          p.classList.add('fly-' + i);
          later(() => p.remove(), 380);
          sent++;
          load[i] = Math.min(100, load[i] + 15);
          paint(i);
          servers[i].classList.add('pulse');
          later(() => servers[i].classList.remove('pulse'), 300);
          if (load[i] >= 85) {
            finish(false);
            return;
          }
          later(spawnPacket, auto ? 250 : 550);
        }

        servers.forEach((card, i) => card.addEventListener('click', () => route(i, false)));
        paint(0); paint(1);
        later(spawnPacket, 600);
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
