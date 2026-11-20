/*
 * app.js — rendering, navigation, progress, and terminal wiring for Linux Dojo.
 * Plain JS, no dependencies, works when index.html is opened directly.
 */
(function () {
  'use strict';

  const NS = window.LinuxDojo;
  const COURSE = NS.COURSE;
  const Shell = NS.Shell;
  const STORAGE_KEY = 'linux-dojo-progress-v1';

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------- flat lesson index ---------- */
  const ALL = [];
  COURSE.modules.forEach((mod, mi) => {
    mod.lessons.forEach((lesson, li) => {
      ALL.push({ module: mod, moduleIndex: mi, lesson: lesson, lessonIndex: li,
        id: lesson.id, globalIndex: ALL.length });
    });
  });

  function entryById(id) { return ALL.find((e) => e.id === id) || null; }

  /* ---------- state ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { completed: s.completed || {}, quizzes: s.quizzes || {}, current: s.current || null };
      }
    } catch (e) { /* ignore corrupt state */ }
    return { completed: {}, quizzes: {}, current: null };
  }

  let state = loadState();
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function quizPassed(lesson) {
    if (!lesson.quiz || !lesson.quiz.length) return false;
    const score = state.quizzes[lesson.id] || 0;
    return score >= Math.ceil(lesson.quiz.length * 0.6);
  }

  function totalXp() {
    let xp = 0;
    ALL.forEach((e) => {
      if (state.completed[e.id]) xp += e.lesson.xp || 0;
      if (quizPassed(e.lesson)) xp += (e.lesson.quiz.length) * 5;
    });
    return xp;
  }

  function completedCount() { return ALL.filter((e) => state.completed[e.id]).length; }

  /* ---------- path formatting ---------- */
  function prettyPath(shell) {
    const p = shell.cwd();
    const home = '/home/' + shell.user;
    if (p === home) return '~';
    if (p.indexOf(home + '/') === 0) return '~' + p.slice(home.length);
    return p;
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    const summary = $('progress-summary');
    summary.innerHTML = '';
    const done = completedCount();
    const total = ALL.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const label = el('div', 'progress-label');
    label.appendChild(el('span', '', 'Your progress'));
    const strong = el('strong', '', done + ' / ' + total + ' lessons');
    label.appendChild(strong);
    const track = el('div', 'progress-track');
    const fill = el('div', 'progress-fill');
    fill.style.width = pct + '%';
    track.appendChild(fill);
    summary.appendChild(label);
    summary.appendChild(track);

    const list = $('module-list');
    list.innerHTML = '';
    COURSE.modules.forEach((mod, mi) => {
      const moduleDone = mod.lessons.filter((l) => state.completed[l.id]).length;
      const wrap = el('div', 'module');

      const head = el('div', 'module-head');
      head.appendChild(el('span', 'module-icon', mod.icon));
      head.appendChild(el('span', '', 'Level ' + (mi + 1) + ' · ' + mod.title));
      head.appendChild(el('span', 'module-count', moduleDone + '/' + mod.lessons.length));
      wrap.appendChild(head);

      mod.lessons.forEach((lesson) => {
        const btn = el('button', 'lesson-item');
        btn.type = 'button';
        const isDone = !!state.completed[lesson.id];
        if (isDone) btn.classList.add('done');
        if (state.current === lesson.id) btn.classList.add('active');
        const dot = el('span', 'lesson-dot', isDone ? '✓' : '');
        const title = el('span', '', lesson.title);
        const xp = el('span', 'lesson-xp', '+' + (lesson.xp || 0));
        btn.appendChild(dot);
        btn.appendChild(title);
        btn.appendChild(xp);
        btn.addEventListener('click', () => openLesson(lesson.id));
        wrap.appendChild(btn);
      });
      list.appendChild(wrap);
    });

    $('xp-display').textContent = totalXp() + ' XP';
  }

  /* ---------- lesson view ---------- */
  function openLesson(id) {
    const entry = entryById(id);
    if (!entry) return;
    state.current = id;
    saveState();
    renderSidebar();
    renderLesson(entry);
    if (window.innerWidth <= 820) $('sidebar').classList.remove('open');
    window.scrollTo({ top: 0 });
  }

  function renderLesson(entry) {
    const lesson = entry.lesson;
    const mod = entry.module;
    const view = $('lesson-view');
    view.innerHTML = '';

    $('breadcrumb').innerHTML = '';
    $('breadcrumb').appendChild(el('span', '', mod.title));
    $('breadcrumb').appendChild(el('span', 'sep', '›'));
    $('breadcrumb').appendChild(el('strong', '', lesson.title));
    $('topbar-level').textContent = 'LEVEL ' + (entry.moduleIndex + 1) + ' / ' + COURSE.modules.length;

    /* header */
    const head = el('div', 'lesson-head');
    head.appendChild(el('div', 'eyebrow', 'Level ' + (entry.moduleIndex + 1) + ' · ' + mod.title));
    const h1 = el('h1', 'lesson-title', lesson.title);
    head.appendChild(h1);
    const meta = el('div', 'lesson-meta');
    meta.appendChild(el('span', 'xp-badge', '+' + (lesson.xp || 0) + ' XP'));
    if (state.completed[lesson.id]) meta.appendChild(el('span', 'completed-badge', '✓ Completed'));
    head.appendChild(meta);
    view.appendChild(head);

    /* concept panel */
    const concept = el('div', 'panel');
    concept.appendChild(el('h2', 'panel-title', 'The idea'));
    const content = el('div', 'lesson-content');
    content.innerHTML = lesson.content || '';
    concept.appendChild(content);
    view.appendChild(concept);

    /* task + terminal */
    let taskStatusEl = null;
    let taskPassed = !lesson.task; // no task = nothing to prove
    if (lesson.task) {
      const practice = el('div', 'panel');
      practice.appendChild(el('h2', 'panel-title', 'Your turn'));

      taskStatusEl = el('div', 'task-status pending');
      const icon = el('span', 'status-icon', '!');
      const txt = el('div', 'status-text');
      txt.innerHTML = lesson.task.description || '';
      if (lesson.task.hint) {
        const hint = el('div', 'task-hint', 'Hint: ' + stripTags(lesson.task.hint));
        txt.appendChild(hint);
      }
      taskStatusEl.appendChild(icon);
      taskStatusEl.appendChild(txt);
      practice.appendChild(taskStatusEl);
      view.appendChild(practice);
    }

    let shell = null;
    if (lesson.terminal !== false) {
      const termPanel = el('div', 'panel');
      termPanel.appendChild(el('h2', 'panel-title', 'Practice terminal'));
      termPanel.appendChild(makeTerminal(lesson, () => {
        if (!lesson.task) return;
        const result = safeCheck(lesson.task, shell);
        if (result && result.pass && !taskPassed) {
          taskPassed = true;
          taskStatusEl.classList.remove('pending');
          taskStatusEl.classList.add('passed');
          taskStatusEl.querySelector('.status-icon').textContent = '✓';
          const textEl = taskStatusEl.querySelector('.status-text');
          textEl.innerHTML = '';
          textEl.appendChild(el('div', '', result.message || 'Task complete!'));
          updateCompleteButton();
        }
      }, (s) => { shell = s; }));
      view.appendChild(termPanel);
    }

    /* quiz */
    let checkQuizBtn = null;
    if (lesson.quiz && lesson.quiz.length) {
      const quizPanel = el('div', 'panel');
      quizPanel.appendChild(el('h2', 'panel-title', 'Check your understanding'));
      const scoreLine = el('div', 'quiz-score');
      const best = state.quizzes[lesson.id] || 0;
      scoreLine.textContent = best
        ? 'Best score: ' + best + ' / ' + lesson.quiz.length + (quizPassed(lesson) ? ' — passed!' : '')
        : 'Answer all questions, then check your answers.';
      quizPanel.appendChild(scoreLine);

      const selections = {};
      lesson.quiz.forEach((q, qi) => {
        const block = el('div', 'question');
        block.appendChild(el('div', 'question-q', (qi + 1) + '. ' + q.q));
        const opts = el('div', 'options');
        q.options.forEach((opt, oi) => {
          const b = el('button', 'option');
          b.type = 'button';
          const radio = el('span', 'radio');
          b.appendChild(radio);
          b.appendChild(el('span', '', opt));
          b.addEventListener('click', () => {
            if (b.disabled) return;
            selections[qi] = oi;
            Array.from(opts.children).forEach((c) => c.classList.remove('selected'));
            b.classList.add('selected');
          });
          opts.appendChild(b);
        });
        block.appendChild(opts);
        quizPanel.appendChild(block);
      });

      checkQuizBtn = el('button', 'btn secondary', 'Check answers');
      checkQuizBtn.type = 'button';
      checkQuizBtn.addEventListener('click', () => {
        let correct = 0;
        lesson.quiz.forEach((q, qi) => {
          const chosen = selections[qi];
          const opts = quizPanel.querySelectorAll('.question')[qi].querySelectorAll('.option');
          opts.forEach((o, oi) => {
            o.disabled = true;
            o.classList.remove('selected');
            if (oi === q.answer) o.classList.add('correct');
            else if (oi === chosen) o.classList.add('wrong');
          });
          if (chosen === q.answer) correct++;
          const explain = el('div', 'explain', q.why || '');
          quizPanel.querySelectorAll('.question')[qi].appendChild(explain);
        });
        scoreLine.textContent = 'You got ' + correct + ' / ' + lesson.quiz.length + ' correct.';
        if (correct > (state.quizzes[lesson.id] || 0)) {
          state.quizzes[lesson.id] = correct;
          saveState();
          renderSidebar();
        }
        checkQuizBtn.disabled = true;
      });
      quizPanel.appendChild(checkQuizBtn);
      view.appendChild(quizPanel);
    }

    /* actions */
    const actions = el('div', 'actions');
    const completeBtn = el('button', 'btn', lesson.task ? 'Complete & continue →' : 'Continue →');
    completeBtn.type = 'button';
    const note = el('span', 'action-note', lesson.task ? 'Finish the task above to unlock this.' : '');
    completeBtn.disabled = !taskPassed;
    completeBtn.addEventListener('click', () => {
      const firstTime = !state.completed[lesson.id];
      state.completed[lesson.id] = true;
      saveState();
      if (firstTime && note) note.textContent = 'Nice work! +' + (lesson.xp || 0) + ' XP earned.';
      const next = ALL[entry.globalIndex + 1];
      if (next) {
        openLesson(next.id);
      } else {
        renderSidebar();
        renderCourseComplete();
      }
    });
    actions.appendChild(completeBtn);
    actions.appendChild(note);
    view.appendChild(actions);

    function updateCompleteButton() {
      completeBtn.disabled = false;
      if (note) note.textContent = 'Task done — claim your XP and continue.';
    }
  }

  function renderCourseComplete() {
    const view = $('lesson-view');
    view.innerHTML = '';
    $('breadcrumb').innerHTML = '';
    $('breadcrumb').appendChild(el('strong', '', 'Course complete'));
    $('topbar-level').textContent = '★ ' + totalXp() + ' XP';

    const w = el('div', 'welcome');
    w.appendChild(el('h1', '', 'You finished the dojo!'));
    w.appendChild(el('p', '', 'You have ' + completedCount() + ' of ' + ALL.length + ' lessons under your belt and ' + totalXp() + ' XP. The real learning happens when you use these commands on your own machine. Keep practicing — try a real Linux box, break things in a VM, and read the man pages.'));
    const b = el('button', 'btn', 'Back to the first lesson');
    b.type = 'button';
    b.addEventListener('click', () => openLesson(ALL[0].id));
    w.appendChild(b);
    view.appendChild(w);
  }

  function renderWelcome() {
    const view = $('lesson-view');
    view.innerHTML = '';
    $('breadcrumb').innerHTML = '';
    $('breadcrumb').appendChild(el('strong', '', COURSE.title));
    $('topbar-level').textContent = 'HANDS-ON LINUX';

    const w = el('div', 'welcome');
    w.appendChild(el('h1', '', COURSE.title));
    w.appendChild(el('p', '', COURSE.tagline + ' Each lesson has a short explanation, a task you complete in a simulated terminal, and a quick quiz. No installation, no risk — just type.'));
    const resumeId = findResumeId();
    const b = el('button', 'btn', resumeId ? 'Resume: ' + entryById(resumeId).lesson.title : 'Start the course');
    b.type = 'button';
    b.addEventListener('click', () => openLesson(resumeId || ALL[0].id));
    w.appendChild(b);
    view.appendChild(w);
  }

  function findResumeId() {
    const firstIncomplete = ALL.find((e) => !state.completed[e.id]);
    return firstIncomplete ? firstIncomplete.id : null;
  }

  /* ---------- terminal widget ---------- */
  function makeTerminal(lesson, onCommand, gotShell) {
    const cfg = lesson.terminal || {};
    const shell = new Shell(cfg);
    if (gotShell) gotShell(shell);

    const wrap = el('div', 'terminal');
    const bar = el('div', 'term-bar');
    [['r'], ['y'], ['g']].forEach((c) => bar.appendChild(el('span', 'term-dot ' + c[0])));
    bar.appendChild(el('span', 'term-name', 'learner@linux-dojo — bash'));
    const clearBtn = el('button', 'term-clear', 'clear');
    clearBtn.type = 'button';
    bar.appendChild(clearBtn);
    wrap.appendChild(bar);

    const output = el('div', 'term-output');
    output.setAttribute('aria-live', 'polite');
    wrap.appendChild(output);

    const row = el('div', 'term-input-row');
    const prompt = el('span', 'term-prompt');
    const pathSpan = el('span', 'path', prettyPath(shell));
    prompt.appendChild(pathSpan);
    prompt.appendChild(el('span', 'dollar', ' $ '));
    row.appendChild(prompt);
    const input = el('input', 'term-input');
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-label', 'Terminal command');
    row.appendChild(input);
    wrap.appendChild(row);
    wrap.appendChild(el('div', 'term-help', 'Try a command above, or type help. ↑/↓ = command history.'));

    const history = [];
    let histIdx = 0;

    function appendLine(data) {
      if (data.clear) { output.innerHTML = ''; return; }
      const node = el('div', 'term-line ' + (data.cls || ''));
      node.textContent = data.text;
      output.appendChild(node);
    }

    function appendCommand(raw) {
      const node = el('div', 'term-line cmd');
      node.appendChild(el('span', 'prompt', 'learner:'));
      node.appendChild(el('span', 'path', prettyPath(shell)));
      node.appendChild(el('span', '', '$ ' + raw));
      output.appendChild(node);
    }

    function submit() {
      const raw = input.value;
      input.value = '';
      if (!raw.trim()) return;
      history.push(raw);
      histIdx = history.length;
      appendCommand(raw);
      const lines = shell.run(raw);
      lines.forEach(appendLine);
      output.scrollTop = output.scrollHeight;
      if (onCommand) onCommand();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx] || ''; }
        else { histIdx = history.length; input.value = ''; }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault(); output.innerHTML = '';
      }
    });

    clearBtn.addEventListener('click', () => { output.innerHTML = ''; input.focus(); });
    setTimeout(() => input.focus(), 50);

    // Welcome line
    appendLine({ text: 'Linux Dojo terminal — type "help" to see available commands.', cls: 'muted' });
    appendLine({ text: '' });

    return wrap;
  }

  function safeCheck(task, shell) {
    if (!task || typeof task.check !== 'function' || !shell) return null;
    try { return task.check(shell); }
    catch (e) { return { pass: false, message: 'Check error: ' + e.message }; }
  }

  function stripTags(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
  }

  /* ---------- wiring ---------- */
  $('reset-progress').addEventListener('click', () => {
    if (!window.confirm('Reset all progress and XP? This cannot be undone.')) return;
    state = { completed: {}, quizzes: {}, current: null };
    saveState();
    renderSidebar();
    renderWelcome();
  });

  $('menu-toggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
  });

  renderSidebar();
  if (state.current && entryById(state.current)) renderLesson(entryById(state.current));
  else renderWelcome();
})();
