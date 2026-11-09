(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var words = [], tops = [], litSet = [], pending = 0;

  /* ---------- Tema ---------- */
  var themeBtn = $('#theme-btn');
  function isDark() {
    var t = root.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncThemeUI() {
    var dark = isDark();
    themeBtn.setAttribute('aria-label', dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b1612' : '#e9eeea');
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    function apply() {
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncThemeUI();
    }
    if (!document.startViewTransition || reduceMotion) { apply(); return; }
    var r = themeBtn.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(apply);
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }, function () {});
  });
  syncThemeUI();

  /* ---------- Menu mobile ---------- */
  var menuBtn = $('#menu-btn'), links = $('#nav-links');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
  $$('a', links).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Progress baca + menu aktif ---------- */
  var bar = $('#progress');
  var heroEl = $('.hero');
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    if (!reduceMotion && window.scrollY < window.innerHeight * 1.3) heroEl.style.setProperty('--sy', window.scrollY);
    focusRead();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = $$('.nav-links a');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + en.target.id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { if (s) io.observe(s); });
  }

  /* ---------- Nama: huruf bereaksi pada kursor ---------- */
  var letters = $$('#name .name-big span');
  function setLetter(el, t) { // t: 0 (jauh) .. 1 (dekat)
    el.style.setProperty('--w', Math.round(300 + 500 * t));
    el.style.setProperty('--d', Math.round(75 + 25 * t));
  }
  letters.forEach(function (l) { setLetter(l, 1); });
  if (!reduceMotion) {
    // sapuan gelombang sekali saat halaman dibuka
    var start = performance.now(), dur = 1500;
    (function wave(now) {
      var p = (now - start) / dur;
      if (p >= 1 || interacted) { letters.forEach(function (l) { setLetter(l, 1); }); return; }
      letters.forEach(function (l, i) {
        var x = p * (letters.length + 2) - 1 - i;           // posisi gelombang relatif huruf
        var t = 1 - Math.min(1, Math.abs(x) / 1.6) * 0.75;  // puncak di tengah gelombang
        setLetter(l, p < 0.05 ? 0.25 : t);
      });
      requestAnimationFrame(wave);
    })(start);
  }
  var interacted = false;
  if (finePointer && !reduceMotion) {
    var nameEl = $('.name-big');
    var raf = 0, mx = 0, my = 0;
    function update() {
      raf = 0;
      letters.forEach(function (l) {
        var r = l.getBoundingClientRect();
        var d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
        setLetter(l, Math.max(0, 1 - d / 420) * 0.8 + 0.2);
      });
    }
    window.addEventListener('pointermove', function (e) {
      if (window.scrollY > window.innerHeight) return;
      interacted = true; mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { letters.forEach(function (l) { setLetter(l, 1); }); });
  }

  /* ---------- Cahaya kursor dan gunung ---------- */
  if (finePointer) {
    var gx = 0;
    window.addEventListener('pointermove', function (e) {
      root.style.setProperty('--mx', e.clientX + 'px');
      root.style.setProperty('--my', e.clientY + 'px');
      if (!reduceMotion) heroEl.style.setProperty('--px', ((e.clientX / window.innerWidth) - 0.5) * 2);
    }, { passive: true });
  }

  /* ---------- Tilt foto ---------- */
  function tilt(el) {
    if (!finePointer || reduceMotion || !el) return;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg');
    });
  }
  tilt($('#arch')); tilt($('#id-card'));

  /* ---------- Alexander the Great: ketuk (HP) atau Enter (keyboard) ---------- */
  var arch = $('#arch'), canHover = window.matchMedia('(hover: hover)').matches;
  function toggleAlex() {
    var on = arch.classList.toggle('alex');
    arch.setAttribute('aria-pressed', String(on));
  }
  arch.addEventListener('click', function () { if (!canHover) toggleAlex(); });
  arch.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAlex(); }
  });

  /* ---------- Usia ---------- */
  (function () {
    var el = $('#age'); if (!el) return;
    var b = new Date(2010, 3, 26), n = new Date();
    var age = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) age--;
    if (age > 0) el.textContent = age + ' tahun';
  })();

  /* ---------- Akordeon kegiatan ---------- */
  $$('.acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      $$('.acc-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* ---------- Lightbox ---------- */
  var shots = $$('.shot'), lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  var cur = 0, lastFocus = null;
  function show(i) {
    cur = (i + shots.length) % shots.length;
    var s = shots[cur];
    lbImg.src = s.dataset.full;
    lbImg.alt = $('img', s).alt;
    lbCap.textContent = s.dataset.cap || '';
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    show(i);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    $('#lb-close').focus();
  }
  function closeLb() {
    if (typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
    if (lastFocus) lastFocus.focus();
  }
  shots.forEach(function (s, i) { s.addEventListener('click', function () { openLb(i); }); });
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', function () { show(cur - 1); });
  $('#lb-next').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') closeLb(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });

  /* ---------- Tab puisi ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (k === 'Home') n = tabs[0];
      else if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* ---------- Salin email ---------- */
  var toast = $('#toast'), timer;
  $('#copy').addEventListener('click', function () {
    var addr = $('#mail').textContent.trim();
    function done(ok) {
      toast.textContent = ok ? 'Alamat email sudah disalin.' : 'Gagal menyalin. Salin manual dari tulisan di atas.';
      clearTimeout(timer); timer = setTimeout(function () { toast.textContent = ''; }, 3000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(function () { done(true); }, function () { done(false); });
    } else done(false);
  });

  /* ---------- Baca fokus: kata di garis baca menyala ---------- */
  var prose = $('.prose');
  function wrap(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        if (!n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var sp = document.createElement('span'); sp.className = 'w'; sp.textContent = part;
          frag.appendChild(sp); words.push(sp);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'CITE') wrap(n);
    });
  }
  if (prose && !reduceMotion) {
    wrap(prose);
    var measure = function () {
      tops = words.map(function (w) { var r = w.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
      focusRead();
    };
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('load', measure);
    setTimeout(measure, 300);
  }
  function focusRead() {
    if (!words.length || pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      var f = window.scrollY + window.innerHeight * 0.55;
      var next = [];
      for (var i = 0; i < words.length; i++) {
        if (Math.abs(tops[i] - f) < 38) next.push(words[i]);
      }
      litSet.forEach(function (w) { if (next.indexOf(w) < 0) w.classList.remove('lit'); });
      next.forEach(function (w) { w.classList.add('lit'); });
      litSet = next;
    });
  }

  /* ---------- Salam sesuai jam di Banjarnegara ---------- */
  var hello = $('#hello');
  function tick() {
    try {
      var parts = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var hh = +parts.filter(function (p) { return p.type === 'hour'; })[0].value;
      var mm = parts.filter(function (p) { return p.type === 'minute'; })[0].value;
      var sapa = hh < 4 ? 'Selamat malam' : hh < 11 ? 'Selamat pagi' : hh < 15 ? 'Selamat siang' : hh < 18 ? 'Selamat sore' : 'Selamat malam';
      var extra = (hh >= 21 || hh < 4) ? ' Waktunya tidur.' : '';
      hello.textContent = sapa + ' dari Banjarnegara. Sekarang pukul ' + String(hh).padStart(2, '0') + '.' + mm + ' WIB.' + extra;
    } catch (e) {}
  }
  tick(); setInterval(tick, 30000);

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
