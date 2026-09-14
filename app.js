(function () {
  'use strict';

  /* ---------- storage ---------- */
  var KEYS = { setup: 'pq.setup', answers: 'pq.answers', bank: 'pq.bank', theme: 'pq.theme' };
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  var GROUPS = ['Website', 'Mobile', 'Software', 'Branding', 'Print', 'SEO'];
  var STAGES = ['Pre-Sales', 'Post-Sales'];
  var TYPES = ['Internal', 'Public'];

  var bank = load(KEYS.bank, null) || window.DEFAULT_QUESTIONS.slice();
  var setup = load(KEYS.setup, { groups: [], stage: '', type: '' });
  var answers = load(KEYS.answers, {});

  function saveBank() { save(KEYS.bank, bank); }

  /* ---------- filtering ---------- */
  // A question applies when it shares a project type with the selection. Stage and
  // audience only narrow when the question is actually tagged for them — an untagged
  // question is treated as universal rather than hidden.
  function applies(q) {
    if (!q.groups.some(function (g) { return setup.groups.indexOf(g) !== -1; })) return false;
    if (setup.stage && q.stages.length && q.stages.indexOf(setup.stage) === -1) return false;
    if (setup.type && q.types.length && q.types.indexOf(setup.type) === -1) return false;
    return true;
  }
  function activeQuestions() { return bank.filter(applies); }
  function categoriesOf(list) {
    var seen = [];
    list.forEach(function (q) { if (seen.indexOf(q.category) === -1) seen.push(q.category); });
    return seen;
  }
  function steps() {
    var qs = activeQuestions();
    return categoriesOf(qs).map(function (c) {
      return { category: c, questions: qs.filter(function (q) { return q.category === c; }) };
    });
  }

  /* ---------- helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function tagEls(q, container) {
    container.innerHTML = '';
    q.groups.forEach(function (g) { container.appendChild(el('span', 'tag', g)); });
    q.stages.forEach(function (s) { container.appendChild(el('span', 'tag muted', s)); });
    q.types.forEach(function (t) { container.appendChild(el('span', 'tag muted', t)); });
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function copy(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { fallbackCopy(text, msg); });
    } else fallbackCopy(text, msg);
  }
  function fallbackCopy(text, msg) {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Copy failed'); }
    ta.remove();
  }
  function uid() { return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- setup view ---------- */
  function renderSetup() {
    var chips = $('groupChips'); chips.innerHTML = '';
    GROUPS.forEach(function (g) {
      var b = el('button', 'chip', g);
      b.type = 'button';
      b.setAttribute('aria-pressed', setup.groups.indexOf(g) !== -1);
      b.addEventListener('click', function () {
        var i = setup.groups.indexOf(g);
        if (i === -1) setup.groups.push(g); else setup.groups.splice(i, 1);
        save(KEYS.setup, setup); renderSetup();
      });
      chips.appendChild(b);
    });
    renderRadios('stageRadios', 'stage', STAGES, 'Both');
    renderRadios('typeRadios', 'type', TYPES, 'Either');
    var n = activeQuestions().length;
    $('setupCount').textContent = setup.groups.length ? n + ' questions in ' + steps().length + ' steps' : 'Select at least one project type';
    $('startBtn').disabled = !setup.groups.length;
    $('groupHint').textContent = setup.groups.length ? 'Selected: ' + setup.groups.join(', ') : 'Nothing selected yet.';
  }
  function renderRadios(id, field, options, anyLabel) {
    var box = $(id); box.innerHTML = '';
    [''].concat(options).forEach(function (opt) {
      var label = el('label');
      var input = el('input'); input.type = 'radio'; input.name = field; input.value = opt;
      input.checked = setup[field] === opt;
      input.addEventListener('change', function () { setup[field] = opt; save(KEYS.setup, setup); renderSetup(); });
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt || anyLabel));
      box.appendChild(label);
    });
  }

  /* ---------- step view ---------- */
  function renderStep(n) {
    var all = steps();
    if (!all.length) { location.hash = '#setup'; return; }
    n = Math.min(Math.max(n, 1), all.length);
    var step = all[n - 1];

    var st = $('stepper'); st.innerHTML = '';
    all.forEach(function (s, i) {
      var a = el('a', i + 1 < n ? 'done' : i + 1 === n ? 'current' : '', (i + 1) + ' · ' + s.category);
      a.href = '#step/' + (i + 1);
      st.appendChild(a);
    });
    $('stepEyebrow').textContent = 'Step ' + n + ' of ' + all.length + ' · ' + step.questions.length + ' questions';
    $('stepTitle').textContent = step.category;

    var box = $('stepQuestions'); box.innerHTML = '';
    var tpl = $('questionTpl');
    step.questions.forEach(function (q) {
      var node = tpl.content.cloneNode(true);
      var ta = node.querySelector('textarea');
      var label = node.querySelector('.q-text');
      label.textContent = q.text; label.htmlFor = 'a-' + q.id; ta.id = 'a-' + q.id;
      ta.value = answers[q.id] || '';
      ta.addEventListener('input', function () {
        if (ta.value) answers[q.id] = ta.value; else delete answers[q.id];
        save(KEYS.answers, answers);
      });
      tagEls(q, node.querySelector('.tags'));
      box.appendChild(node);
    });

    $('prevBtn').onclick = function () { location.hash = n === 1 ? '#setup' : '#step/' + (n - 1); };
    $('prevBtn').textContent = n === 1 ? '← Setup' : '← Back';
    $('nextBtn').onclick = function () { location.hash = n === all.length ? '#review' : '#step/' + (n + 1); };
    $('nextBtn').textContent = n === all.length ? 'Review →' : 'Next →';
    window.scrollTo(0, 0);
  }

  /* ---------- review view ---------- */
  function renderReview() {
    var all = steps();
    var total = 0, answered = 0;
    all.forEach(function (s) { s.questions.forEach(function (q) { total++; if (answers[q.id]) answered++; }); });
    var scope = setup.groups.join(' + ') + (setup.stage ? ' · ' + setup.stage : '') + (setup.type ? ' · ' + setup.type : '');
    $('reviewSummary').textContent = all.length ? scope + ' — ' + answered + ' of ' + total + ' answered.' : 'No project type selected.';

    var body = $('reviewBody'); body.innerHTML = '';
    if (!all.length) { body.appendChild(el('p', 'empty', 'Go back to Setup and pick a project type.')); return; }
    var num = 0;
    all.forEach(function (s) {
      body.appendChild(el('h3', '', s.category));
      var ol = el('ol');
      s.questions.forEach(function (q) {
        num++;
        var li = el('li');
        li.appendChild(el('div', '', q.text));
        var a = answers[q.id];
        li.appendChild(el('p', 'ans' + (a ? '' : ' blank'), a || '—'));
        ol.appendChild(li);
      });
      body.appendChild(ol);
    });
  }
  function markdown(withAnswers) {
    var out = ['# Project questionnaire', '', '_' + setup.groups.join(', ') + (setup.stage ? ' · ' + setup.stage : '') + (setup.type ? ' · ' + setup.type : '') + '_', ''];
    steps().forEach(function (s) {
      out.push('## ' + s.category, '');
      s.questions.forEach(function (q, i) {
        out.push((i + 1) + '. ' + q.text);
        if (withAnswers) out.push('   > ' + (answers[q.id] || '').replace(/\n/g, '\n   > '));
        else out.push('   > ');
        out.push('');
      });
    });
    return out.join('\n');
  }
  $('copyBlankBtn').addEventListener('click', function () { copy(markdown(false), 'Blank questionnaire copied'); });
  $('copyFilledBtn').addEventListener('click', function () { copy(markdown(true), 'Questionnaire with answers copied'); });
  $('downloadJsonBtn').addEventListener('click', function () {
    var payload = { setup: setup, exported: new Date().toISOString(), sections: steps().map(function (s) {
      return { category: s.category, questions: s.questions.map(function (q) { return { id: q.id, question: q.text, answer: answers[q.id] || '' }; }) };
    }) };
    download('questionnaire.json', JSON.stringify(payload, null, 2));
  });
  $('printBtn').addEventListener('click', function () { window.print(); });
  $('clearAnswersBtn').addEventListener('click', function () {
    if (!confirm('Clear every saved answer?')) return;
    answers = {}; save(KEYS.answers, answers); renderReview(); toast('Answers cleared');
  });

  /* ---------- builder view ---------- */
  var bankFilter = { text: '', category: '', group: '' };
  function checkGroup(container, options, selected, onChange) {
    container.innerHTML = '';
    options.forEach(function (opt) {
      var label = el('label');
      var input = el('input'); input.type = 'checkbox'; input.value = opt; input.checked = selected.indexOf(opt) !== -1;
      input.addEventListener('change', function () {
        var i = selected.indexOf(opt);
        if (input.checked && i === -1) selected.push(opt); else if (!input.checked && i !== -1) selected.splice(i, 1);
        onChange();
      });
      label.appendChild(input); label.appendChild(document.createTextNode(opt));
      container.appendChild(label);
    });
  }
  function renderBuilder() {
    var cats = categoriesOf(bank);
    var dl = $('categoryList'); dl.innerHTML = '';
    cats.forEach(function (c) { var o = el('option'); o.value = c; dl.appendChild(o); });
    fillSelect($('bankCategory'), cats, bankFilter.category);
    fillSelect($('bankGroup'), GROUPS, bankFilter.group);
    $('bankCount').textContent = bank.length + ' questions · ' + cats.length + ' categories';

    var list = $('bankList'); list.innerHTML = '';
    var tpl = $('bankRowTpl');
    var needle = bankFilter.text.toLowerCase();
    var shown = 0;
    bank.forEach(function (q, idx) {
      if (needle && q.text.toLowerCase().indexOf(needle) === -1) return;
      if (bankFilter.category && q.category !== bankFilter.category) return;
      if (bankFilter.group && q.groups.indexOf(bankFilter.group) === -1) return;
      shown++;
      var node = tpl.content.cloneNode(true);
      var row = node.querySelector('.bank-row');
      if (q._open) { row.open = true; delete q._open; }
      var summaryText = node.querySelector('.bank-text');
      var summaryCat = node.querySelector('.bank-cat');
      var summaryGroups = node.querySelector('.bank-groups');
      summaryText.textContent = q.text || '(empty question)';
      summaryCat.textContent = q.category || '—';
      summaryGroups.textContent = q.groups.join(', ');

      var textEl = node.querySelector('[data-f="text"]'); textEl.value = q.text;
      textEl.addEventListener('input', function () { q.text = textEl.value; summaryText.textContent = q.text || '(empty question)'; saveBank(); });
      var catEl = node.querySelector('[data-f="category"]'); catEl.value = q.category;
      catEl.addEventListener('change', function () { q.category = catEl.value.trim(); summaryCat.textContent = q.category || '—'; saveBank(); renderBuilder(); });
      checkGroup(node.querySelector('[data-f="groups"]'), GROUPS, q.groups, function () { summaryGroups.textContent = q.groups.join(', '); saveBank(); });
      checkGroup(node.querySelector('[data-f="types"]'), TYPES, q.types, saveBank);
      checkGroup(node.querySelector('[data-f="stages"]'), STAGES, q.stages, saveBank);

      node.querySelector('[data-act="up"]').addEventListener('click', function () { move(idx, -1); });
      node.querySelector('[data-act="down"]').addEventListener('click', function () { move(idx, 1); });
      node.querySelector('[data-act="delete"]').addEventListener('click', function () {
        if (!confirm('Delete this question?')) return;
        bank.splice(idx, 1); delete answers[q.id]; save(KEYS.answers, answers); saveBank(); renderBuilder();
      });
      list.appendChild(node);
    });
    if (!shown) list.appendChild(el('p', 'empty', 'No questions match.'));
  }
  function fillSelect(sel, options, current) {
    var first = sel.options[0];
    sel.innerHTML = ''; sel.appendChild(first);
    options.forEach(function (o) { var opt = el('option', '', o); opt.value = o; sel.appendChild(opt); });
    sel.value = current;
  }
  // Moves within the same category so the step order stays coherent; categories
  // themselves are ordered by first appearance in the bank.
  function move(idx, dir) {
    var q = bank[idx];
    var j = idx + dir;
    while (j >= 0 && j < bank.length && bank[j].category !== q.category) j += dir;
    if (j < 0 || j >= bank.length) { toast('Already at the edge of its category'); return; }
    bank.splice(idx, 1); bank.splice(j, 0, q);
    q._open = true; saveBank(); renderBuilder();
  }
  $('bankSearch').addEventListener('input', function (e) { bankFilter.text = e.target.value; renderBuilder(); });
  $('bankCategory').addEventListener('change', function (e) { bankFilter.category = e.target.value; renderBuilder(); });
  $('bankGroup').addEventListener('change', function (e) { bankFilter.group = e.target.value; renderBuilder(); });
  $('addQuestionBtn').addEventListener('click', function () {
    var q = { id: uid(), text: '', category: bankFilter.category || 'General', groups: bankFilter.group ? [bankFilter.group] : [], types: [], stages: [], _open: true };
    // Insert at the end of its category so it lands with its siblings.
    var last = -1;
    bank.forEach(function (b, i) { if (b.category === q.category) last = i; });
    bank.splice(last + 1, 0, q);
    saveBank(); renderBuilder();
    var ta = $('bankList').querySelector('.bank-row[open] textarea'); if (ta) ta.focus();
  });
  $('exportBankBtn').addEventListener('click', function () {
    download('question-bank.json', JSON.stringify(bank.map(function (q) {
      return { id: q.id, text: q.text, category: q.category, groups: q.groups, types: q.types, stages: q.stages };
    }), null, 2));
  });
  $('importBankInput').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data) || !data.every(function (q) { return q && typeof q.text === 'string' && typeof q.category === 'string'; })) throw new Error('shape');
        bank = data.map(function (q) { return { id: q.id || uid(), text: q.text, category: q.category, groups: q.groups || [], types: q.types || [], stages: q.stages || [] }; });
        saveBank(); renderBuilder(); toast('Imported ' + bank.length + ' questions');
      } catch (err) { toast('Not a valid question bank file'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
  $('resetBankBtn').addEventListener('click', function () {
    if (!confirm('Discard all edits and restore the seed question list?')) return;
    bank = window.DEFAULT_QUESTIONS.slice(); localStorage.removeItem(KEYS.bank); renderBuilder(); toast('Seed list restored');
  });

  /* ---------- theme ---------- */
  $('themeToggle').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next); save(KEYS.theme, next);
  });

  /* ---------- routing ---------- */
  function route() {
    var h = location.hash.replace('#', '') || 'setup';
    var parts = h.split('/');
    var view = parts[0];
    if (['setup', 'step', 'review', 'builder'].indexOf(view) === -1) view = 'setup';
    if (view !== 'setup' && view !== 'builder' && !setup.groups.length) { location.hash = '#setup'; return; }
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    document.querySelectorAll('.topnav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === view); });
    if (view === 'setup') renderSetup();
    else if (view === 'step') renderStep(parseInt(parts[1], 10) || 1);
    else if (view === 'review') renderReview();
    else renderBuilder();
  }
  $('startBtn').addEventListener('click', function () { location.hash = '#step/1'; });
  window.addEventListener('hashchange', route);
  route();
})();
