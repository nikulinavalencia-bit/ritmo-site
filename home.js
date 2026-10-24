/* Ritmo OPS — интерактив главной. Данные приходят из window.RITMO (генерируются под язык страницы).
   Все цифры в демо вымышлены. Без внешних зависимостей. */
(function () {
  'use strict';
  var D = window.RITMO;
  if (!D) return;
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var nf = function (n) { return Math.round(n).toLocaleString(D.locale); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  doc.documentElement.classList.remove('no-js');

  /* ── меню ── */
  var burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ── появление при прокрутке ── */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── tween ── */
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  var running = {};
  function tween(key, from, to, ms, apply) {
    running[key] = (running[key] || 0) + 1;
    var id = running[key];
    if (reduce || ms <= 0) { apply(to); return; }
    var t0 = null;
    function step(ts) {
      if (running[key] !== id) return;
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      apply(from.map(function (v, i) { return v + (to[i] - v) * e; }));
      if (p < 1) raf(step);
    }
    raf(step);
  }

  /* ── дашборд героя ── */
  var dash = $('#dash');
  if (dash && D.dash) {
    var cfg = D.dash, tabIdx = 0, state = 'now';
    var tabBtns = $$('[data-dtab]', dash), stBtns = $$('[data-state]', dash);
    var barsEl = $('#bars', dash), totalEl = $('#leakTotal', dash), deltaEl = $('#leakDelta', dash);
    var kpiEls = $$('[data-kpi]', dash), line = $('#chLine', dash), area = $('#chArea', dash), mark = $('#chMark', dash), dots = $('#chDots', dash);
    var cur = { total: 0, bars: [0, 0, 0, 0], kpi: [0, 0, 0], series: [], max: 1 };
    var noiseNow = [1, 1.05, .96, 1.03, .98, 1.04, 1, 1.02], noiseAfter = [1, 1.06, .95, 1, 1.05, .97, 1.03, .99];
    var W = 320, H = 92, PAD = 6;

    var sum = function (rows, k) { return rows.reduce(function (a, r) { return a + r[k]; }, 0); };
    function targets(st) {
      var t = cfg.tabs[tabIdx], k = st === 'now' ? 1 : 2, i = st === 'now' ? 0 : 1;
      var totNow = sum(t.rows, 1), totAfter = sum(t.rows, 2);
      var ser = [];
      for (var m = 0; m < 8; m++) {
        if (st === 'now') ser.push(totNow * noiseNow[m]);
        else if (m < 3) ser.push(totNow * noiseNow[m]);
        else if (m === 3) ser.push((totNow + totAfter) / 2);
        else ser.push(totAfter * noiseAfter[m]);
      }
      return {
        total: sum(t.rows, k), bars: t.rows.map(function (r) { return r[k]; }),
        kpi: [t.hours[i], t.ontime[i], totNow - totAfter], series: ser, max: Math.max(totNow * 1.12, 1)
      };
    }
    function path(vals, max) {
      var pts = vals.map(function (v, i) { return [PAD + i * ((W - 2 * PAD) / (vals.length - 1)), H - PAD - (v / max) * (H - 2 * PAD)]; });
      var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var mx = (pts[i - 1][0] + pts[i][0]) / 2;
        d += ' C' + mx.toFixed(1) + ',' + pts[i - 1][1].toFixed(1) + ' ' + mx.toFixed(1) + ',' + pts[i][1].toFixed(1) + ' ' + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1);
      }
      return { d: d, pts: pts };
    }
    function paint() {
      totalEl.textContent = cfg.leak_unit + ' ' + nf(cur.total);
      var maxBar = Math.max.apply(null, cfg.tabs[tabIdx].rows.map(function (r) { return r[1]; }));
      $$('.brow', barsEl).forEach(function (row, i) {
        $('.fill', row).style.width = Math.max(0, (cur.bars[i] / maxBar) * 100).toFixed(1) + '%';
        $('.bv', row).textContent = cfg.leak_unit + ' ' + nf(cur.bars[i]);
      });
      kpiEls.forEach(function (el, i) {
        var kind = cfg.kpis[i][1], v = cur.kpi[i];
        el.textContent = kind === 'p' ? nf(v) + '%' : kind === 'r' ? cfg.leak_unit + ' ' + nf(v) : nf(v);
      });
      if (cur.series.length) {
        var p = path(cur.series, cur.max);
        line.setAttribute('d', p.d);
        area.setAttribute('d', p.d + ' L' + (W - PAD) + ',' + (H - PAD) + ' L' + PAD + ',' + (H - PAD) + ' Z');
        dots.setAttribute('cx', p.pts[7][0]); dots.setAttribute('cy', p.pts[7][1]);
      }
    }
    function buildBars() {
      barsEl.innerHTML = cfg.tabs[tabIdx].rows.map(function (r) {
        return '<div class="brow"><div class="bl"><span>' + esc(r[0]) + '</span><span class="bv"></span></div><div class="track"><div class="fill"></div></div></div>';
      }).join('');
    }
    function setState(st, instant) {
      state = st;
      dash.setAttribute('data-state', st);
      stBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-state') === st)); });
      var t = targets(st);
      var d = cur.total ? t.total - cur.total : 0;
      deltaEl.textContent = st === 'now' ? '▲ ' + nf(t.total) + ' €' : '▼ −' + nf(sum(cfg.tabs[tabIdx].rows, 1) - t.total) + ' €';
      mark.style.opacity = st === 'after' ? 1 : 0;
      var from = [cur.total].concat(cur.bars, cur.kpi, cur.series, [cur.max]);
      var to = [t.total].concat(t.bars, t.kpi, t.series, [t.max]);
      tween('dash', from, to, instant ? 0 : 900, function (v) {
        cur.total = v[0]; cur.bars = v.slice(1, 5); cur.kpi = v.slice(5, 8); cur.series = v.slice(8, 16); cur.max = v[16];
        paint();
      });
      void d;
    }
    function setTab(i, focus) {
      tabIdx = i;
      tabBtns.forEach(function (b, j) { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; if (focus && j === i) b.focus(); });
      buildBars();
      cur.bars = [0, 0, 0, 0];
      setState(state);
    }
    tabBtns.forEach(function (b, i) {
      b.addEventListener('click', function () { setTab(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); setTab((i + 1) % tabBtns.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setTab((i + tabBtns.length - 1) % tabBtns.length, true); }
      });
    });
    stBtns.forEach(function (b) { b.addEventListener('click', function () { setState(b.getAttribute('data-state')); }); });
    cur.series = targets('now').series; cur.max = targets('now').max;
    setTab(0);
    // автоматический показ «до → после», пока пользователь не вмешался
    var touched = false, auto = null;
    $$('button', dash).forEach(function (b) { b.addEventListener('click', function () { touched = true; clearTimeout(auto); }); });
    if (!reduce) {
      auto = setTimeout(function () { if (!touched) setState('after'); }, 3600);
    }
  }

  /* ── отрасли ── */
  var indRoot = $('#ind');
  if (indRoot && D.industries) {
    var tabsEl = $('#indTabs'), panel = $('#indPanel'), list = D.industries.tabs, cur2 = 0;
    tabsEl.innerHTML = list.map(function (t, i) {
      return '<button role="tab" type="button" id="indtab' + i + '" aria-selected="' + (i === 0) + '" aria-controls="indPanel" tabindex="' + (i === 0 ? 0 : -1) + '" data-i="' + i + '">' + esc(t.label) + '</button>';
    }).join('');
    function renderInd(i) {
      var t = list[i];
      var more = t.link ? '<a class="btn btn-primary btn-sm more" href="' + esc(t.link) + '">' + esc(D.industries.more) + ' →</a>' : '';
      panel.setAttribute('aria-labelledby', 'indtab' + i);
      panel.innerHTML =
        '<div class="ind-copy"><h3>' + esc(t.t) + '</h3><p>' + esc(t.p) + '</p><ul>' + t.b.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' + more + '</div>' +
        '<div class="screen"><div class="screen-h"><h4>' + esc(t.screen) + '</h4><span class="demo-pill">DEMO</span></div>' +
        '<div class="kp">' + t.kpis.map(function (k) { return '<div><small>' + esc(k[0]) + '</small><strong>' + esc(k[1]) + '</strong></div>'; }).join('') + '</div>' +
        '<div class="rows">' + t.rows.map(function (r, j) { return '<div class="rw" style="--i:' + j + '"><div><b>' + esc(r[0]) + '</b><span class="m">' + esc(r[1]) + '</span></div><span class="st ' + esc(r[3]) + '">' + esc(r[2]) + '</span></div>'; }).join('') + '</div>' +
        '<div class="foot">' + esc(D.industries.demo) + '</div></div>';
    }
    function selectInd(i, focus) {
      cur2 = i;
      $$('button', tabsEl).forEach(function (b, j) { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; if (focus && j === i) b.focus(); });
      renderInd(i);
    }
    tabsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) selectInd(+b.getAttribute('data-i')); });
    tabsEl.addEventListener('keydown', function (e) {
      var n = list.length;
      if (e.key === 'ArrowRight') { e.preventDefault(); selectInd((cur2 + 1) % n, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectInd((cur2 + n - 1) % n, true); }
      if (e.key === 'Home') { e.preventDefault(); selectInd(0, true); }
      if (e.key === 'End') { e.preventDefault(); selectInd(n - 1, true); }
    });
    renderInd(0);
  }

  /* ── форма: готовим письмо (без серверной части) ── */
  var form = $('#cf');
  if (form && D.contact) {
    var C = D.contact, msg = $('#cfMsg'), copyBtn = $('#cfCopy');
    function val(n) { return (form.elements[n].value || '').trim(); }
    function body() {
      return C.body_name + ': ' + val('name') + '\n' + C.body_contact + ': ' + val('contact') + '\n' + C.body_topic + ': ' + val('topic') + '\n\n' + C.body_msg + ':\n' + val('message') + '\n';
    }
    function check() {
      var ok = true;
      [['name', C.err_name], ['contact', C.err_contact]].forEach(function (p) {
        var f = form.elements[p[0]], wrap = f.closest('.fld'), er = $('.err', wrap);
        var bad = !f.value.trim();
        wrap.classList.toggle('bad', bad); er.textContent = bad ? p[1] : ''; f.setAttribute('aria-invalid', String(bad));
        if (bad) ok = false;
      });
      return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check()) { var f = $('.bad input', form); if (f) f.focus(); return; }
      var href = 'mailto:' + C.email + '?subject=' + encodeURIComponent(C.subject + ' — ' + val('name')) + '&body=' + encodeURIComponent(body());
      msg.textContent = C.ok; msg.hidden = false;
      window.location.href = href;
    });
    copyBtn.addEventListener('click', function () {
      if (!check()) return;
      var txt = body(), done = function () { msg.textContent = C.copied; msg.hidden = false; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else { var ta = doc.createElement('textarea'); ta.value = txt; doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); } catch (x) {} doc.body.removeChild(ta); done(); }
    });
    ['name', 'contact'].forEach(function (n) { form.elements[n].addEventListener('input', function () { var w = this.closest('.fld'); w.classList.remove('bad'); $('.err', w).textContent = ''; }); });
  }

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
