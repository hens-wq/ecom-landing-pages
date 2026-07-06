/* ============================================================
   מנוע המשחקים — משחק ייעודי לכל אחד משבעת המסלולים
   ------------------------------------------------------------
   כל משחק מוגדר כאובייקט:
     rounds       — מספר סבבים
     renderRound  — בונה את הסבב הנוכחי בתוך ה־stage
   ה־ctx שמגיע מ־app.js מספק:
     ctx.round            — אינדקס הסבב הנוכחי
     ctx.attempt({...})   — דיווח פעולה (נכונה/שגויה) + פידבק אוטומטי
     ctx.onCleanup(fn)    — רישום ניקוי (עצירת אנימציות) במעבר סבב/מסך
     ctx.h(tag, cls, html)— יצירת אלמנט מהירה
   מקלדת: לחצנים עם data-key="1..3" נלחצים עם המקשים 1–3,
   ולחצן עם data-space נלחץ עם מקש הרווח (מטופל גלובלית ב־app.js).
   ============================================================ */

(function () {
  'use strict';

  /* ---------- עזרים ---------- */

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* צורות SVG למשחק ה־AI */
  const SHAPES = {
    triangle: (c) => `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 3 22 20H2z" /></svg>`,
    circle:   (c) => `<svg viewBox="0 0 24 24" fill="${c}"><circle cx="12" cy="12" r="9"/></svg>`,
    square:   (c) => `<svg viewBox="0 0 24 24" fill="${c}"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`,
    diamond:  (c) => `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2l9 10-9 10L3 12z"/></svg>`,
    dots: (n, c) => {
      const pos = [[12,12],[8,8],[16,16],[8,16],[16,8],[12,4],[12,20]];
      let out = '';
      for (let i = 0; i < n; i++) out += `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="2.8" fill="${c}"/>`;
      return `<svg viewBox="0 0 24 24">${out}</svg>`;
    },
  };

  const PURPLE = '#6836FF', TEAL = '#34D1C3', GREEN = '#85ED72';

  /* בניית לחצני אפשרויות אחידה */
  function buildOptions(ctx, stage, options, { cols = 3, goodText, badText, onCorrect } = {}) {
    const grid = ctx.h('div', 'option-grid' + (cols === 2 ? ' cols-2' : cols === 1 ? ' cols-1' : ''));
    shuffle(options).forEach((opt, i) => {
      const btn = ctx.h('button', 'option-btn');
      btn.type = 'button';
      btn.innerHTML = `<span class="key-hint">${i + 1}</span>` + opt.html;
      btn.dataset.key = String(i + 1);
      btn.addEventListener('click', () => {
        if (opt.correct) {
          grid.querySelectorAll('.option-btn').forEach((b) => (b.disabled = true));
          btn.classList.add('correct');
          if (onCorrect) onCorrect(btn);
          ctx.attempt({ correct: true, action: opt.action, text: goodText });
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          ctx.attempt({ correct: false, action: opt.action, text: badText });
          setTimeout(() => btn.classList.remove('wrong'), 450);
        }
      });
      grid.appendChild(btn);
    });
    stage.appendChild(grid);
    return grid;
  }

  /* ============================================================
     סייבר התקפי — "פריצה מתוזמנת"
     קו סריקה נע; יש ללחוץ כשהוא בתוך אזור הפריצה.
     ============================================================ */

  const cyberGame = {
    rounds: 3,
    renderRound(stage, ctx) {
      const round = ctx.round;
      // האזור מצטמצם מעט מסבב לסבב
      const zoneWidth = [22, 17, 13][round] || 13;               // באחוזים
      const zoneStart = 12 + Math.random() * (76 - zoneWidth);   // מיקום אקראי

      const wrap = ctx.h('div', 'cyber-game');
      const track = ctx.h('div', 'scan-track');
      const zone = ctx.h('div', 'scan-zone');
      zone.style.left = zoneStart + '%';
      zone.style.width = zoneWidth + '%';
      const line = ctx.h('div', 'scan-line');
      track.append(zone, line);

      const btn = ctx.h('button', 'tap-btn');
      btn.type = 'button';
      btn.textContent = 'לפרוץ עכשיו';
      btn.dataset.space = '1';

      const hint = ctx.h('div', 'tap-hint');
      hint.textContent = 'בדסקטופ: מקש רווח';

      wrap.append(track, btn, hint);
      stage.appendChild(wrap);

      // תנועת קו הסריקה — הלוך ושוב, מהירות עולה עם הסבבים
      const period = [1500, 1300, 1150][round] || 1150;
      let raf = null;
      let pos = 0;
      const t0 = performance.now();

      function frame(now) {
        const t = ((now - t0) % (period * 2)) / period; // 0..2
        pos = t <= 1 ? t * 100 : (2 - t) * 100;
        line.style.transform = `translateX(${(pos / 100) * track.clientWidth}px)`;
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      ctx.onCleanup(() => cancelAnimationFrame(raf));

      let locked = false;
      btn.addEventListener('click', () => {
        if (locked) return;
        const inZone = pos >= zoneStart && pos <= zoneStart + zoneWidth;

        // סימון נקודת הפגיעה על המסילה
        const marker = ctx.h('span', 'scan-hit-marker ' + (inZone ? 'hit' : 'miss'));
        marker.style.left = pos + '%';
        track.appendChild(marker);
        setTimeout(() => marker.remove(), 700);

        if (inZone) {
          locked = true;
          cancelAnimationFrame(raf);
          line.style.background = 'linear-gradient(180deg, transparent, #85ED72 25%, #fff 50%, #85ED72 75%, transparent)';
          line.style.boxShadow = '0 0 20px #85ED72';
          ctx.attempt({ correct: true, action: 'breach_hit@' + Math.round(pos), text: 'פריצה מדויקת! 🎯' });
        } else {
          ctx.attempt({ correct: false, action: 'breach_miss@' + Math.round(pos), text: 'קרוב מאוד — נסו לתזמן שוב' });
        }
      });
    },
  };

  /* ============================================================
     AI — "השלמת הדפוס"
     ============================================================ */

  const aiGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          seq: [SHAPES.triangle(PURPLE), SHAPES.circle(TEAL), SHAPES.triangle(PURPLE), SHAPES.circle(TEAL)],
          options: [
            { html: SHAPES.triangle(PURPLE), correct: true,  action: 'pattern_triangle' },
            { html: SHAPES.square(TEAL),     correct: false, action: 'pattern_square' },
            { html: SHAPES.circle(GREEN),    correct: false, action: 'pattern_circle' },
          ],
          answer: SHAPES.triangle(PURPLE),
        },
        {
          seq: [SHAPES.dots(1, TEAL), SHAPES.dots(2, TEAL), SHAPES.dots(3, TEAL), SHAPES.dots(4, TEAL)],
          options: [
            { html: SHAPES.dots(5, TEAL),  correct: true,  action: 'series_5' },
            { html: SHAPES.dots(3, GREEN), correct: false, action: 'series_3' },
            { html: SHAPES.dots(7, PURPLE),correct: false, action: 'series_7' },
          ],
          answer: SHAPES.dots(5, TEAL),
        },
      ];
      const data = rounds[ctx.round % rounds.length];

      const row = ctx.h('div', 'seq-row');
      data.seq.forEach((s) => {
        const cell = ctx.h('div', 'seq-cell');
        cell.innerHTML = s;
        row.appendChild(cell);
      });
      const mystery = ctx.h('div', 'seq-cell mystery', '?');
      row.appendChild(mystery);
      stage.appendChild(row);

      buildOptions(ctx, stage, data.options, {
        goodText: 'זיהוי דפוס מושלם! 🧠',
        badText: 'לא בדיוק — הסתכלו שוב על הסדרה',
        onCorrect: () => {
          mystery.classList.remove('mystery');
          mystery.classList.add('filled');
          mystery.innerHTML = data.answer;
        },
      });
    },
  };

  /* ============================================================
     QA ואוטומציה — "ציד הבאגים"
     ============================================================ */

  const qaGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          elements: [
            { html: 'טופס הרשמה', cls: '' },
            { html: 'אימייל: name@mail.com', cls: '' },
            { html: 'סיסמה: ••••••••', cls: '' },
            { html: 'הרשמה', cls: 'qa-btn-el bug-offset', bug: true, action: 'bug_misaligned_button' },
          ],
        },
        {
          elements: [
            { html: 'השיר הבא ▶ פלייליסט', cls: '' },
            { html: 'ןגנ', cls: 'qa-btn-el bug-flipped', bug: true, action: 'bug_flipped_button' },
            { html: 'עוצמת קול: 70%', cls: '' },
            { html: 'שיתוף השיר', cls: '' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];

      const mock = ctx.h('div', 'qa-mock');
      const bar = ctx.h('div', 'qa-mock-titlebar', '<span></span><span></span><span></span>');
      mock.appendChild(bar);

      data.elements.forEach((elDef) => {
        const el = ctx.h('button', 'qa-el ' + elDef.cls);
        el.type = 'button';
        el.innerHTML = elDef.html;
        el.addEventListener('click', () => {
          if (elDef.bug) {
            mock.querySelectorAll('.qa-el').forEach((b) => (b.disabled = true));
            el.classList.add('found');
            el.classList.remove('bug-offset', 'bug-flipped', 'bug-glitch');
            if (elDef.cls.includes('bug-flipped')) el.innerHTML = 'נגן';
            ctx.attempt({ correct: true, action: elDef.action, text: 'הבאג נתפס! 🐞' });
          } else {
            ctx.attempt({ correct: false, action: 'qa_wrong_element', text: 'הרכיב הזה דווקא תקין — חפשו עוד' });
          }
        });
        mock.appendChild(el);
      });

      stage.appendChild(mock);
    },
  };

  /* ============================================================
     Full Stack — "חיבור נכון"
     ============================================================ */

  const ICONS_FS = {
    screen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    db: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>`,
  };

  const fullstackGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          front: 'טופס הזמנה',
          options: [
            { html: `${ICONS_FS.db}<span>Orders API</span>`,  correct: true,  action: 'connect_orders' },
            { html: `${ICONS_FS.db}<span>Weather API</span>`, correct: false, action: 'connect_weather' },
            { html: `${ICONS_FS.db}<span>Login API</span>`,   correct: false, action: 'connect_login' },
          ],
        },
        {
          front: 'מסך התחברות',
          options: [
            { html: `${ICONS_FS.db}<span>Auth API</span>`,     correct: true,  action: 'connect_auth' },
            { html: `${ICONS_FS.db}<span>Payments API</span>`, correct: false, action: 'connect_payments' },
            { html: `${ICONS_FS.db}<span>Media API</span>`,    correct: false, action: 'connect_media' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];

      const wrap = ctx.h('div', 'fs-game');
      const front = ctx.h('div', 'fs-front', `${ICONS_FS.screen}<span>${data.front}</span><small style="opacity:.55;font-size:.7rem">Frontend</small>`);
      const wire = ctx.h('div', 'fs-wire');
      wrap.append(front, wire);
      stage.appendChild(wrap);

      buildOptions(ctx, wrap, data.options, {
        goodText: 'חיבור מושלם! הנתונים זורמים ⚡',
        badText: 'השירות הזה לא מתאים לרכיב — נסו שוב',
        onCorrect: () => wire.classList.add('connected'),
      });
    },
  };

  /* ============================================================
     שיווק דיגיטלי ודאטה — "הקמפיין המנצח"
     ============================================================ */

  const marketingGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
        {
          metric: 'ROAS · החזר על השקעה',
          cards: [
            { name: 'קמפיין A', value: '×1.4', bars: [10, 8, 12], correct: false, action: 'pick_roas_1.4' },
            { name: 'קמפיין B', value: '×3.8', bars: [12, 18, 26], correct: true,  action: 'pick_roas_3.8' },
            { name: 'קמפיין C', value: '×2.1', bars: [14, 12, 16], correct: false, action: 'pick_roas_2.1' },
          ],
        },
        {
          metric: 'CTR · אחוז הקלקה',
          cards: [
            { name: 'מודעה A', value: '1.2%', bars: [12, 10, 9],  correct: false, action: 'pick_ctr_1.2' },
            { name: 'מודעה B', value: '2.4%', bars: [10, 14, 15], correct: false, action: 'pick_ctr_2.4' },
            { name: 'מודעה C', value: '4.7%', bars: [12, 19, 26], correct: true,  action: 'pick_ctr_4.7' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];

      const metricLabel = ctx.h('div', 'mk-metric-label', data.metric);
      metricLabel.style.cssText = 'font-size:.8rem;font-weight:600;color:var(--text-dim);margin-bottom:14px';
      stage.appendChild(metricLabel);

      const grid = ctx.h('div', 'mk-grid');
      shuffle(data.cards).forEach((card, i) => {
        const el = ctx.h('button', 'mk-card');
        el.type = 'button';
        el.dataset.key = String(i + 1);
        el.innerHTML = `
          <span class="mk-name">${card.name}</span>
          <span class="mk-value">${card.value}</span>
          <span class="mk-bars">${card.bars.map((b) => `<i style="height:${b}px"></i>`).join('')}</span>
          <span class="mk-metric">${data.metric.split('·')[0].trim()}</span>`;
        el.addEventListener('click', () => {
          if (card.correct) {
            grid.querySelectorAll('.mk-card').forEach((b) => (b.disabled = true));
            el.classList.add('correct');
            ctx.attempt({ correct: true, action: card.action, text: 'עין חדה לנתונים! 📈' });
          } else {
            el.classList.add('wrong');
            el.disabled = true;
            ctx.attempt({ correct: false, action: card.action, text: 'יש קמפיין עם ביצועים טובים יותר' });
            setTimeout(() => el.classList.remove('wrong'), 450);
          }
        });
        grid.appendChild(el);
      });
      stage.appendChild(grid);
    },
  };

  /* ============================================================
     UX/UI — "העין המעצבת"
     ============================================================ */

  function buildMock(clean, variant) {
    if (variant === 'article') {
      return clean
        ? `<div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk sk-btn"></div>`
        : `<div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk-row"><div class="sk sk-btn ghosty"></div><div class="sk sk-btn"></div><div class="sk sk-btn ghosty"></div></div>`;
    }
    // checkout
    return clean
      ? `<div class="sk sk-title"></div><div class="sk sk-line short"></div><div class="sk sk-btn"></div>`
      : `<div class="sk sk-title"></div><div class="sk-row"><div class="sk sk-btn"></div><div class="sk sk-btn"></div></div><div class="sk-row"><div class="sk sk-btn ghosty"></div><div class="sk sk-btn"></div></div>`;
  }

  const uxuiGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const variant = ctx.round % 2 === 0 ? 'article' : 'checkout';
      const grid = ctx.h('div', 'ab-grid');

      const cards = shuffle([
        { clean: true,  label: 'גרסה 1', action: 'ux_pick_clean' },
        { clean: false, label: 'גרסה 2', action: 'ux_pick_messy' },
      ]);

      cards.forEach((card, i) => {
        const el = ctx.h('button', 'ab-card' + (card.clean ? '' : ' messy'));
        el.type = 'button';
        el.dataset.key = String(i + 1);
        el.innerHTML = `<span class="ab-label">${['א', 'ב'][i]}</span>` + buildMock(card.clean, variant);
        el.addEventListener('click', () => {
          if (card.clean) {
            grid.querySelectorAll('.ab-card').forEach((b) => (b.disabled = true));
            el.classList.add('correct');
            ctx.attempt({ correct: true, action: card.action, text: 'בחירה של מעצבים! ✨' });
          } else {
            el.classList.add('wrong');
            el.disabled = true;
            ctx.attempt({ correct: false, action: card.action, text: 'הגרסה השנייה ברורה יותר למשתמש' });
            setTimeout(() => el.classList.remove('wrong'), 450);
          }
        });
        grid.appendChild(el);
      });

      stage.appendChild(grid);
    },
  };

  /* ============================================================
     DevOps — "תיקון ה־Pipeline"
     ============================================================ */

  function pipeNode(ctx, label, state, icon) {
    const el = ctx.h('div', 'pipe-node ' + state);
    el.innerHTML = `<span class="pipe-ico">${icon}</span><span>${label}</span>`;
    return el;
  }

  const CHECK = '✓', CROSS = '✕', WAIT = '…', UNKNOWN = '?';

  const devopsGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const wrap = ctx.h('div', 'devops-game');
      const pipe = ctx.h('div', 'pipeline');
      let fixNode, nodes, links = [];

      function link(lit) {
        const l = ctx.h('div', 'pipe-link' + (lit ? ' lit' : ''));
        links.push(l);
        return l;
      }

      let q, options, onFix;

      if (ctx.round % 2 === 0) {
        nodes = [
          pipeNode(ctx, 'Code', 'ok', CHECK),
          pipeNode(ctx, 'Build', 'ok', CHECK),
          (fixNode = pipeNode(ctx, 'Test', 'fail', CROSS)),
          pipeNode(ctx, 'Deploy', 'wait', WAIT),
        ];
        q = 'הבדיקות נכשלו. מה הפעולה הנכונה?';
        options = [
          { html: 'מתקנים את הקוד ומריצים את הבדיקות שוב', correct: true,  action: 'devops_fix_and_retest' },
          { html: 'מדלגים על הבדיקות ומעלים לפרודקשן',      correct: false, action: 'devops_skip_tests' },
          { html: 'מוחקים את ה־Pipeline ומתחילים מחדש',     correct: false, action: 'devops_delete_pipeline' },
        ];
        onFix = () => {
          fixNode.className = 'pipe-node ok';
          fixNode.querySelector('.pipe-ico').textContent = CHECK;
          const deploy = nodes[3];
          deploy.className = 'pipe-node ok';
          deploy.querySelector('.pipe-ico').textContent = '🚀';
          links.forEach((l) => l.classList.add('lit'));
        };
      } else {
        nodes = [
          pipeNode(ctx, 'Code', 'ok', CHECK),
          (fixNode = pipeNode(ctx, '?', 'wait', UNKNOWN)),
          pipeNode(ctx, 'Deploy', 'wait', WAIT),
        ];
        q = 'איזה שלב חייב לקרות לפני ה־Deploy?';
        options = [
          { html: 'Build + הרצת בדיקות', correct: true,  action: 'devops_build_test' },
          { html: 'שליחת ניוזלטר ללקוחות', correct: false, action: 'devops_newsletter' },
          { html: 'כיבוי השרת הראשי',      correct: false, action: 'devops_shutdown' },
        ];
        onFix = () => {
          fixNode.className = 'pipe-node ok';
          fixNode.innerHTML = `<span class="pipe-ico">${CHECK}</span><span>Build+Test</span>`;
          const deploy = nodes[2];
          deploy.className = 'pipe-node ok';
          deploy.querySelector('.pipe-ico').textContent = '🚀';
          links.forEach((l) => l.classList.add('lit'));
        };
      }

      nodes.forEach((n, i) => {
        pipe.appendChild(n);
        if (i < nodes.length - 1) pipe.appendChild(link(false));
      });

      const question = ctx.h('div', 'devops-q', q);
      wrap.append(pipe, question);
      stage.appendChild(wrap);

      buildOptions(ctx, wrap, options, {
        cols: 1,
        goodText: 'ה־Pipeline ירוק! Deploy יצא לדרך 🚀',
        badText: 'זה יפיל את הפרודקשן… נסו שוב',
        onCorrect: onFix,
      });
    },
  };

  /* ---------- מיפוי משחק לכל מסלול ---------- */

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
