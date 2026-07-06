/* ============================================================
   מנוע המשחקים — אתגר ייעודי לכל אחד משבעת הקורסים
   ------------------------------------------------------------
   כל משחק מוגדר כאובייקט:
     rounds       — מספר סבבים
     renderRound  — בונה את הסבב הנוכחי בתוך ה־stage
   חוקי המשחק (אחידים):
   - ניסיון אחד בלבד לכל שאלה. טעות => חשיפת התשובה הנכונה ומעבר הלאה.
   - הדיווח נעשה דרך ctx.answer({correct, action}) — פעם אחת בלבד לסבב.
   - מקלדת: לחצנים עם data-key="1..3" נלחצים עם המקשים 1–3.
   ============================================================ */

(function () {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- בניית שאלה עם אפשרויות — ניסיון אחד ---------- */

  function buildQuestion(ctx, stage, { question, options, cols = 1, goodText, badText }) {
    if (question) {
      const q = ctx.h('div', 'game-q', question);
      stage.appendChild(q);
    }
    const grid = ctx.h('div', 'option-grid' + (cols === 2 ? ' cols-2' : cols === 3 ? '' : ' cols-1'));
    let answered = false;

    shuffle(options).forEach((opt, i) => {
      const btn = ctx.h('button', 'option-btn' + (opt.mono ? ' mono' : ''));
      btn.type = 'button';
      btn.innerHTML = `<span class="key-hint">${i + 1}</span>` + opt.html;
      btn.dataset.key = String(i + 1);
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        grid.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.correct === '1') b.classList.add('reveal'); // חשיפת הנכונה
        });
        btn.classList.add(opt.correct ? 'correct' : 'wrong');
        ctx.answer({
          correct: !!opt.correct,
          action: opt.action,
          text: opt.correct ? goodText : badText,
        });
      });
      if (opt.correct) btn.dataset.correct = '1';
      grid.appendChild(btn);
    });
    stage.appendChild(grid);
    return grid;
  }

  const GOOD = ['בול בפוני! 🎯', 'תשובה של מקצוענים!', 'מדויק!', 'יפה מאוד!'];
  const BAD = ['לא הפעם — זו התשובה הנכונה', 'כמעט! שימו לב לתשובה המסומנת'];
  const g = () => GOOD[Math.floor(Math.random() * GOOD.length)];
  const b = () => BAD[Math.floor(Math.random() * BAD.length)];

  /* ============================================================
     סייבר ואבטחת מידע — "חשיבה של האקר"
     שאלות שיפוט אבטחה מהעולם האמיתי
     ============================================================ */

  const cyberGame = {
    rounds: 3,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'איזו סיסמה הכי קשה לפריצה?',
          options: [
            { html: 'Dg#8kQ!2v', mono: true, correct: true, action: 'cyber_strong_pw' },
            { html: '123456', mono: true, correct: false, action: 'cyber_weak_pw1' },
            { html: 'shalom123', mono: true, correct: false, action: 'cyber_weak_pw2' },
          ],
        },
        {
          question: 'איזו הודעה היא ניסיון פישינג?',
          options: [
            { html: '"החשבון שלך נחסם! היכנס מיד: bank-secure4u.co"', correct: true, action: 'cyber_phishing' },
            { html: '"ההזמנה שלך יצאה למשלוח, מספר מעקב 4412"', correct: false, action: 'cyber_legit1' },
            { html: '"תזכורת: פגישה מחר בשעה 10:00"', correct: false, action: 'cyber_legit2' },
          ],
        },
        {
          question: 'מצאתם פרצת אבטחה בשרת של החברה. מה הצעד הראשון?',
          options: [
            { html: 'מתעדים ומדווחים מיד לצוות האבטחה', correct: true, action: 'cyber_report' },
            { html: 'בודקים כמה רחוק אפשר להיכנס', correct: false, action: 'cyber_exploit' },
            { html: 'מתעלמים — לא הבעיה שלי', correct: false, action: 'cyber_ignore' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];
      buildQuestion(ctx, stage, { ...data, goodText: g(), badText: b() });
    },
  };

  /* ============================================================
     AI למפתחים — "לאמן את המודל"
     הסקת חוקים מדוגמאות — בדיוק כמו שמודל לומד
     ============================================================ */

  const aiGame = {
    rounds: 3,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'המודל למד: תפוח ← פרי · מלפפון ← ירק.<br>מה הוא יגיד על בננה?',
          options: [
            { html: 'פרי', correct: true, action: 'ai_fruit' },
            { html: 'ירק', correct: false, action: 'ai_veg' },
            { html: 'רהיט', correct: false, action: 'ai_furniture' },
          ],
        },
        {
          question: 'המודל קיבל: 2←4 · 3←6 · 5←10.<br>איזה חוק הוא למד?',
          options: [
            { html: 'כפול 2', correct: true, action: 'ai_double' },
            { html: 'ועוד 2', correct: false, action: 'ai_plus2' },
            { html: 'מספר אקראי', correct: false, action: 'ai_random' },
          ],
        },
        {
          question: 'רוצים לאמן מודל שמזהה חתולים. איזה דאטה הכי טוב?',
          options: [
            { html: '10,000 תמונות מגוונות של חתולים', correct: true, action: 'ai_good_data' },
            { html: 'תמונה אחת של חתול', correct: false, action: 'ai_one_image' },
            { html: '10,000 תמונות של כלבים', correct: false, action: 'ai_wrong_data' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];
      buildQuestion(ctx, stage, { ...data, goodText: 'חשיבה של מודל! 🧠', badText: b() });
    },
  };

  /* ============================================================
     QA בדיקות תוכנה — "ציד הבאגים"
     באגים לוגיים אמיתיים — צריך לקרוא בעיון כדי למצוא
     ============================================================ */

  const qaGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      const rounds = [
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
      ];
      const data = rounds[ctx.round % rounds.length];
      let answered = false;

      const hint = ctx.h('div', 'game-q', 'איפה הבאג? לחצו על השורה הבעייתית');
      stage.appendChild(hint);

      const mock = ctx.h('div', 'qa-mock');
      mock.appendChild(ctx.h('div', 'qa-mock-titlebar', '<span></span><span></span><span></span>'));
      mock.appendChild(ctx.h('div', 'qa-mock-title', data.title));

      data.elements.forEach((elDef) => {
        const el = ctx.h('button', 'qa-el');
        el.type = 'button';
        el.innerHTML = elDef.html;
        el.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          mock.querySelectorAll('.qa-el').forEach((btn) => (btn.disabled = true));
          const bugEl = Array.from(mock.querySelectorAll('.qa-el'))[data.elements.findIndex((d) => d.bug)];
          if (elDef.bug) {
            el.classList.add('found');
            el.innerHTML = elDef.fix + ' <span class="qa-fixed">✓ תוקן</span>';
            ctx.answer({ correct: true, action: elDef.action, text: 'הבאג נתפס! 🐞' });
          } else {
            el.classList.add('wrong-el');
            bugEl.classList.add('found');
            ctx.answer({ correct: false, action: 'qa_wrong_element', text: 'הבאג היה במקום אחר — מסומן בירוק' });
          }
        });
        mock.appendChild(el);
      });

      stage.appendChild(mock);
    },
  };

  /* ============================================================
     מפתח Full Stack — "בונים אפליקציה"
     סידור שלבי בנייה בסדר הנכון + שאלת המשך
     ============================================================ */

  const fullstackGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      if (ctx.round % 2 === 0) {
        // סבב 1: לחיצה על השלבים לפי הסדר הנכון
        const steps = [
          { html: '🎨 מעצבים את המסכים', order: 0 },
          { html: '💻 כותבים את הקוד', order: 1 },
          { html: '🚀 מעלים לאוויר', order: 2 },
        ];
        let next = 0;
        let failed = false;

        stage.appendChild(ctx.h('div', 'game-q', 'איך בונים אפליקציה? לחצו על השלבים לפי הסדר'));
        const grid = ctx.h('div', 'option-grid cols-1');

        shuffle(steps).forEach((step, i) => {
          const btn = ctx.h('button', 'option-btn');
          btn.type = 'button';
          btn.innerHTML = `<span class="key-hint">${i + 1}</span>` + step.html;
          btn.dataset.key = String(i + 1);
          btn.addEventListener('click', () => {
            if (failed || btn.disabled) return;
            if (step.order === next) {
              btn.disabled = true;
              btn.classList.add('correct');
              btn.innerHTML = `<span class="order-badge">${next + 1}</span>` + step.html;
              next++;
              if (next === steps.length) {
                ctx.answer({ correct: true, action: 'fs_order_complete', text: 'האפליקציה באוויר! 🚀' });
              }
            } else {
              failed = true;
              // חשיפת הסדר הנכון
              grid.querySelectorAll('.option-btn').forEach((other) => (other.disabled = true));
              btn.classList.add('wrong');
              Array.from(grid.querySelectorAll('.option-btn')).forEach((other) => {
                const s = steps.find((st) => other.innerHTML.includes(st.html));
                if (s) other.innerHTML = `<span class="order-badge">${s.order + 1}</span>` + s.html;
              });
              ctx.answer({ correct: false, action: 'fs_order_fail', text: 'הסדר הנכון מסומן במספרים' });
            }
          });
          grid.appendChild(btn);
        });
        stage.appendChild(grid);
      } else {
        buildQuestion(ctx, stage, {
          question: 'מה מהבאים "חי" בצד השרת (Backend)?',
          options: [
            { html: 'מסד הנתונים עם פרטי המשתמשים', correct: true, action: 'fs_db' },
            { html: 'צבע הכפתור במסך', correct: false, action: 'fs_color' },
            { html: 'גודל הפונט של הכותרת', correct: false, action: 'fs_font' },
          ],
          goodText: g(),
          badText: b(),
        });
      }
    },
  };

  /* ============================================================
     שיווק דיגיטלי — "המודעה המנצחת"
     אינטואיציה שיווקית בשפה יומיומית — בלי מושגים מקצועיים
     ============================================================ */

  const marketingGame = {
    rounds: 3,
    renderRound(stage, ctx) {
      const rounds = [
        {
          question: 'איזו מודעה תגרום להכי הרבה אנשים ללחוץ?',
          options: [
            { html: '"50% הנחה על נעלי ספורט — רק עד חצות"', correct: true, action: 'mk_urgency' },
            { html: '"נעלי ספורט. לחצו כאן"', correct: false, action: 'mk_flat' },
            { html: '"אנחנו חנות נעליים ותיקה מאוד"', correct: false, action: 'mk_boring' },
          ],
        },
        {
          question: 'מפרסמים אוזניות גיימינג. למי הכי משתלם להציג את המודעה?',
          options: [
            { html: 'גיימרים בגילאי 16–25', correct: true, action: 'mk_target' },
            { html: 'לכל האוכלוסייה בישראל', correct: false, action: 'mk_everyone' },
            { html: 'גמלאים שאוהבים שקט', correct: false, action: 'mk_wrong_aud' },
          ],
        },
        {
          question: 'איזה כפתור יביא הכי הרבה לחיצות?',
          options: [
            { html: '"קבלו 20% הנחה עכשיו"', correct: true, action: 'mk_value_cta' },
            { html: '"לחץ כאן"', correct: false, action: 'mk_generic_cta' },
            { html: '"לעמוד הבא"', correct: false, action: 'mk_next_cta' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];
      buildQuestion(ctx, stage, { ...data, goodText: 'אינסטינקט של משווק! 📈', badText: b() });
    },
  };

  /* ============================================================
     UX/UI עיצוב גרפי — "העין המעצבת"
     החלטות עיצוב מוחשיות עם תשובה ברורה
     ============================================================ */

  const uxuiGame = {
    rounds: 2,
    renderRound(stage, ctx) {
      if (ctx.round % 2 === 0) {
        // סבב 1: באיזה מסך קל למצוא את המחיר?
        stage.appendChild(ctx.h('div', 'game-q', 'באיזה מסך קל יותר למצוא את המחיר?'));
        const grid = ctx.h('div', 'ab-grid');
        let answered = false;

        const cards = shuffle([
          {
            clean: true,
            action: 'ux_clear_price',
            html: `<div class="sk sk-title"></div><div class="ux-price">199 ש"ח</div><div class="sk sk-btn"></div>`,
          },
          {
            clean: false,
            action: 'ux_hidden_price',
            html: `<div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line"></div><div class="ux-price ux-price--buried">מחיר: 199</div><div class="sk sk-line short"></div><div class="sk sk-line"></div>`,
          },
        ]);

        cards.forEach((card, i) => {
          const el = ctx.h('button', 'ab-card' + (card.clean ? '' : ' messy'));
          el.type = 'button';
          el.dataset.key = String(i + 1);
          el.innerHTML = `<span class="ab-label">מסך ${['א', 'ב'][i]}</span>` + card.html;
          el.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            grid.querySelectorAll('.ab-card').forEach((btn) => {
              btn.disabled = true;
              if (btn !== el && card.clean === false) btn.classList.add('reveal');
            });
            if (card.clean) {
              el.classList.add('correct');
              ctx.answer({ correct: true, action: card.action, text: 'בדיוק! מידע חשוב חייב לבלוט ✨' });
            } else {
              el.classList.add('wrong');
              grid.querySelector('.ab-card:not(.wrong)').classList.add('reveal');
              ctx.answer({ correct: false, action: card.action, text: 'במסך השני המחיר בולט וברור יותר' });
            }
          });
          grid.appendChild(el);
        });
        stage.appendChild(grid);
      } else {
        buildQuestion(ctx, stage, {
          question: 'כפתור "הרשמה" על רקע כהה — איזה צבע יבלוט הכי הרבה?',
          options: [
            { html: '<span class="swatch" style="background:#85ED72"></span> ירוק זוהר', correct: true, action: 'ux_green' },
            { html: '<span class="swatch" style="background:#2A2A35"></span> אפור כהה', correct: false, action: 'ux_grey' },
            { html: '<span class="swatch" style="background:#171722"></span> כמעט שחור', correct: false, action: 'ux_black' },
          ],
          goodText: 'עין של מעצב! ✨',
          badText: b(),
        });
      }
    },
  };

  /* ============================================================
     DevOps — "לילה בחדר השרתים"
     החלטות תפעול בשפה פשוטה + Pipeline ויזואלי בסבב האחרון
     ============================================================ */

  function pipeNode(ctx, label, state, icon) {
    const el = ctx.h('div', 'pipe-node ' + state);
    el.innerHTML = `<span class="pipe-ico">${icon}</span><span>${label}</span>`;
    return el;
  }

  const devopsGame = {
    rounds: 3,
    renderRound(stage, ctx) {
      if (ctx.round === 2) {
        // סבב אחרון: ה־Pipeline הוויזואלי
        const pipe = ctx.h('div', 'pipeline');
        const nodes = [
          pipeNode(ctx, 'Code', 'ok', '✓'),
          pipeNode(ctx, 'Build', 'ok', '✓'),
          pipeNode(ctx, 'Test', 'fail', '✕'),
          pipeNode(ctx, 'Deploy', 'wait', '…'),
        ];
        const links = [];
        nodes.forEach((n, i) => {
          pipe.appendChild(n);
          if (i < nodes.length - 1) {
            const l = ctx.h('div', 'pipe-link');
            links.push(l);
            pipe.appendChild(l);
          }
        });
        stage.appendChild(pipe);

        buildQuestion(ctx, stage, {
          question: 'הבדיקות האוטומטיות נכשלו. מה עושים?',
          options: [
            { html: 'מתקנים את הקוד ומריצים את הבדיקות שוב', correct: true, action: 'devops_fix' },
            { html: 'מדלגים על הבדיקות ומעלים בכל זאת', correct: false, action: 'devops_skip' },
            { html: 'מוחקים את כל הפרויקט', correct: false, action: 'devops_delete' },
          ],
          goodText: 'ה־Pipeline ירוק! 🚀',
          badText: b(),
        });

        // הצלחה מדליקה את הצינור
        const origAnswer = ctx.answer;
        ctx.answer = (res) => {
          if (res.correct) {
            nodes[2].className = 'pipe-node ok';
            nodes[2].querySelector('.pipe-ico').textContent = '✓';
            nodes[3].className = 'pipe-node ok';
            nodes[3].querySelector('.pipe-ico').textContent = '🚀';
            links.forEach((l) => l.classList.add('lit'));
          }
          origAnswer(res);
        };
        return;
      }

      const rounds = [
        {
          question: 'האתר קרס בשתיים בלילה. מה עושים קודם כול?',
          options: [
            { html: 'פותחים את הלוגים ובודקים מה השתבש', correct: true, action: 'devops_logs' },
            { html: 'מפרמטים את כל השרתים', correct: false, action: 'devops_format' },
            { html: 'מחכים שזה יסתדר לבד', correct: false, action: 'devops_wait' },
          ],
        },
        {
          question: 'מתי הכי בטוח לשחרר עדכון גדול לאתר?',
          options: [
            { html: 'בשעת לילה שקטה, עם גיבוי מוכן', correct: true, action: 'devops_night' },
            { html: 'בשיא העומס של הצהריים', correct: false, action: 'devops_peak' },
            { html: 'מתי שבא, בלי גיבוי', correct: false, action: 'devops_yolo' },
          ],
        },
      ];
      const data = rounds[ctx.round % rounds.length];
      buildQuestion(ctx, stage, { ...data, goodText: 'קור רוח של DevOps! 🧊', badText: b() });
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
