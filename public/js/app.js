/* CosmicLounge — interações do site
   Cabeçalho, menu móvel, âncoras, galeria, seletor de fotografias e comparador antes/depois.
   (Sem dependências externas.) */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Cabeçalho e menu ---------- */
  function header() {
    var h = document.getElementById('header');
    if (h) {
      var bar = document.getElementById('progress');
      var on = function () {
        h.classList.toggle('is-scrolled', window.scrollY > 8);
        if (bar) {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
        }
      };
      on();
      window.addEventListener('scroll', on, { passive: true });
      window.addEventListener('resize', on);
    }
    var b = document.getElementById('burger');
    if (b) {
      b.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { document.body.classList.remove('nav-open'); b.setAttribute('aria-expanded', 'false'); }
      });
      var links = document.getElementById('navLinks');
      if (links) links.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a')) document.body.classList.remove('nav-open');
      });
    }
  }

  /* ---------- Âncoras na mesma página (ex.: #como-funciona) ---------- */
  function anchors() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      var url;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
      var t = document.getElementById(url.hash.slice(1));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', url.hash);
    });
  }

  /* ---------- Pequenos extras ---------- */
  function extras() {
    // mostrar/esconder palavra-passe
    document.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var inp = document.getElementById(btn.getAttribute('data-toggle-pw'));
        if (!inp) return;
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.setAttribute('aria-label', inp.type === 'password' ? 'Mostrar palavra-passe' : 'Esconder palavra-passe');
      });
    });
    // âncoras vindas de outra página (ex.: /#como-funciona)
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 60);
    }
  }

  /* ---------- Galeria do imóvel (setas, miniaturas e ecrã inteiro) ---------- */
  function gallery() {
    var root = document.getElementById('gallery');
    var big = document.getElementById('galleryImg');
    if (!root || !big) return;
    var thumbBtns = Array.prototype.slice.call(root.querySelectorAll('.gallery-thumbs button'));
    var srcs = thumbBtns.length ? thumbBtns.map(function (t) { return t.getAttribute('data-src'); }) : [big.getAttribute('src')];
    var total = srcs.length;
    var countTxt = document.getElementById('gCountTxt');
    var creditEl = document.getElementById('gCredit');
    var credits = [];
    try { credits = JSON.parse(root.getAttribute('data-credits') || '[]'); } catch { credits = []; }
    var cur = 0;

    function showCredit(i) {
      if (!creditEl) return;
      var c = credits[i];
      creditEl.textContent = '';
      if (!c) return;
      creditEl.appendChild(document.createTextNode('Fotografia de '));
      var a = document.createElement('a');
      a.href = c.u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.n;
      creditEl.appendChild(a);
      creditEl.appendChild(document.createTextNode(' no '));
      var b = document.createElement('a');
      b.href = 'https://unsplash.com/?utm_source=cosmiclounge&utm_medium=referral'; b.target = '_blank'; b.rel = 'noopener'; b.textContent = 'Unsplash';
      creditEl.appendChild(b);
      creditEl.appendChild(document.createTextNode(' (imagem de exemplo)'));
    }

    function preload(i) { var im = new Image(); im.src = srcs[(i + total) % total]; }
    function show(i) {
      cur = (i + total) % total;
      big.src = srcs[cur];
      thumbBtns.forEach(function (t, k) { t.classList.toggle('is-on', k === cur); });
      if (countTxt) countTxt.textContent = (cur + 1) + ' / ' + total;
      showCredit(cur);
      if (thumbBtns[cur] && thumbBtns[cur].scrollIntoView && total > 6) thumbBtns[cur].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      preload(cur + 1); preload(cur - 1);
      syncLightbox();
    }

    // ---- ecrã inteiro ----
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Fotografias do imóvel');
    lb.innerHTML =
      '<div class="lb-top"><span><strong id="lbCount"></strong></span><button type="button" class="lb-close" aria-label="Fechar">&times;</button></div>' +
      '<div class="lb-stage"><img alt="" id="lbImg">' +
      (total > 1 ? '<button type="button" class="lb-arrow lb-prev" aria-label="Fotografia anterior">&#8249;</button><button type="button" class="lb-arrow lb-next" aria-label="Fotografia seguinte">&#8250;</button>' : '') +
      '</div>' +
      (total > 1 ? '<div class="lb-thumbs"></div>' : '');
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('#lbImg');
    var lbCount = lb.querySelector('#lbCount');
    var lbThumbs = lb.querySelector('.lb-thumbs');
    if (lbThumbs) {
      srcs.forEach(function (src, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Fotografia ' + (k + 1));
        b.innerHTML = '<img alt="" loading="lazy" src="' + src + '">';
        b.addEventListener('click', function () { show(k); });
        lbThumbs.appendChild(b);
      });
    }
    function syncLightbox() {
      if (!lb.classList.contains('is-open')) return;
      lbImg.src = srcs[cur];
      lbCount.textContent = (cur + 1) + ' / ' + total;
      if (lbThumbs) Array.prototype.forEach.call(lbThumbs.children, function (b, k) {
        b.classList.toggle('is-on', k === cur);
        if (k === cur && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    }
    function openLb() { lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; syncLightbox(); lb.querySelector('.lb-close').focus(); }
    function closeLb() { lb.classList.remove('is-open'); document.body.style.overflow = ''; }

    var prev = document.getElementById('gPrev'), next = document.getElementById('gNext'), zoom = document.getElementById('gZoom');
    if (prev) prev.addEventListener('click', function () { show(cur - 1); });
    if (next) next.addEventListener('click', function () { show(cur + 1); });
    thumbBtns.forEach(function (t, k) { t.addEventListener('click', function () { show(k); }); });
    big.addEventListener('click', openLb);
    if (zoom) zoom.addEventListener('click', openLb);
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) closeLb(); });
    var lp = lb.querySelector('.lb-prev'), ln = lb.querySelector('.lb-next');
    if (lp) lp.addEventListener('click', function () { show(cur - 1); });
    if (ln) ln.addEventListener('click', function () { show(cur + 1); });
    document.addEventListener('keydown', function (e) {
      var open = lb.classList.contains('is-open');
      if (e.key === 'Escape' && open) closeLb();
      else if (e.key === 'ArrowLeft' && (open || root.contains(document.activeElement))) show(cur - 1);
      else if (e.key === 'ArrowRight' && (open || root.contains(document.activeElement))) show(cur + 1);
    });

    // deslizar com o dedo (na imagem principal e no ecrã inteiro)
    function swipe(el) {
      var x0 = null, y0 = null;
      el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      el.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && total > 1) show(dx < 0 ? cur + 1 : cur - 1);
      }, { passive: true });
    }
    swipe(document.getElementById('galleryMain'));
    swipe(lb.querySelector('.lb-stage'));
    showCredit(0);
    preload(1);
  }

  /* ---------- Fotografias: somar, comprimir e mostrar miniaturas ---------- */
  var OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var LIMIT_BYTES = 3 * 1024 * 1024;

  function compress(file) {
    return new Promise(function (resolve) {
      if (file.size <= 700 * 1024) { resolve(file); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var maxSide = 1800;
        var r = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * r));
        c.height = Math.max(1, Math.round(img.naturalHeight * r));
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.84);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function photoPicker() {
    var input = document.getElementById('fotos');
    var drop = document.getElementById('drop');
    var grid = document.getElementById('dropGrid');
    var status = document.getElementById('dropNames');
    if (!input || !drop || !grid || typeof DataTransfer === 'undefined') return;

    var max = parseInt(input.getAttribute('data-max') || '10', 10);
    var rec = parseInt(input.getAttribute('data-rec') || '0', 10);
    var list = [];
    var busy = 0;
    var form = input.closest('form');
    var submit = form && form.querySelector('button[type="submit"]:not([form])');

    function sync() {
      var dt = new DataTransfer();
      list.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
    }

    function render(msg) {
      grid.innerHTML = '';
      list.forEach(function (f, i) {
        var box = document.createElement('div');
        box.className = 'thumb';
        var im = document.createElement('img');
        im.alt = 'Fotografia ' + (i + 1);
        im.src = URL.createObjectURL(f);
        im.onload = function () { URL.revokeObjectURL(im.src); };
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remover fotografia ' + (i + 1));
        rm.textContent = '×';
        rm.addEventListener('click', function () { list.splice(i, 1); sync(); render(); });
        box.appendChild(im);
        box.appendChild(rm);
        if (i === 0) { var cap = document.createElement('span'); cap.className = 'cap'; cap.textContent = 'Capa'; box.appendChild(cap); }
        grid.appendChild(box);
      });
      var n = list.length;
      status.className = 'drop-status';
      if (msg) { status.textContent = msg; status.classList.add('is-warn'); return; }
      if (!n) { status.textContent = ''; return; }
      var text = n + (n === 1 ? ' fotografia' : ' fotografias') + ' (máx. ' + max + ')';
      if (rec && n < rec) text += '. Faltam ' + (rec - n) + ' para as ' + rec + ' recomendadas.';
      else if (rec) { text += '. Boa, já tem as fotografias recomendadas.'; status.classList.add('is-ok'); }
      status.textContent = text;
    }

    function add(files) {
      var incoming = Array.prototype.slice.call(files || []);
      if (!incoming.length) return;
      var msg = '';
      var valid = incoming.filter(function (f) { return OK_TYPES.indexOf(f.type) !== -1; });
      if (valid.length < incoming.length) msg = 'Só são aceites imagens JPG, PNG ou WebP.';
      var room = max - list.length;
      if (valid.length > room) { valid = valid.slice(0, Math.max(0, room)); msg = 'O máximo são ' + max + ' fotografias. As restantes foram ignoradas.'; }
      busy++;
      if (submit) submit.disabled = true;
      status.className = 'drop-status';
      status.textContent = 'A preparar as fotografias…';
      Promise.all(valid.map(compress)).then(function (done) {
        done.forEach(function (f) {
          if (f.size > LIMIT_BYTES) msg = 'Uma das fotografias é demasiado grande (máx. 3 MB).';
          else list.push(f);
        });
        sync();
        render(msg);
      }).then(function () {
        busy--;
        if (!busy && submit) submit.disabled = false;
      });
    }

    input.addEventListener('change', function () {
      var chosen = Array.prototype.slice.call(input.files);
      sync();          // o input passa a refletir apenas a lista acumulada
      add(chosen);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function () { drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer) add(e.dataTransfer.files);
    });
  }

  /* ---------- Comparador antes/depois ----------
     Balança sozinho de um lado para o outro. Pára enquanto a pessoa lhe mexe
     (rato, dedo ou teclado) e volta a mexer-se uns segundos depois. */
  function compare() {
    var AMP = 34;          // amplitude do movimento (em %, à volta dos 50)
    var PERIOD = 7000;     // tempo de uma ida e volta (ms)
    document.querySelectorAll('.ba').forEach(function (box) {
      var range = box.querySelector('.ba-range');
      if (!range) return;
      var phase = 0, paused = false, visible = true, raf = 0, last = 0, idle = 0;

      function set(v) { box.style.setProperty('--pos', v.toFixed(2) + '%'); range.value = v; }
      function frame(t) {
        if (!last) last = t;
        var dt = Math.min(t - last, 64);
        last = t;
        if (!paused && visible) {
          phase += (dt / PERIOD) * Math.PI * 2;
          set(50 + AMP * Math.sin(phase));
        }
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      function hold() { paused = true; clearTimeout(idle); }
      function release(ms) {
        clearTimeout(idle);
        idle = setTimeout(function () {
          var v = parseFloat(range.value);
          phase = Math.asin(Math.max(-1, Math.min(1, (v - 50) / AMP)));
          paused = false;
        }, ms);
      }

      range.addEventListener('input', function () { hold(); box.style.setProperty('--pos', range.value + '%'); });
      box.addEventListener('pointerdown', hold);
      box.addEventListener('pointerup', function () { release(2500); });
      box.addEventListener('pointercancel', function () { release(2500); });
      box.addEventListener('mouseenter', hold);
      box.addEventListener('mouseleave', function () { release(1200); });
      range.addEventListener('focus', hold);
      range.addEventListener('blur', function () { release(1500); });

      if (reduce) return;   // quem prefere menos movimento fica com o cursor parado
      if ('IntersectionObserver' in window) {
        visible = false;
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) start(); else stop();
        }, { threshold: .25 }).observe(box);
      } else {
        start();
      }
    });
  }

  /* ---------- Animação ao fazer scroll ---------- */
  var REVEAL_PAGES = ['home', 'sobre', 'imoveis', 'trabalhos', 'contacto'];

  function reveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var onPage = REVEAL_PAGES.some(function (p) { return document.body.classList.contains('page-' + p); });
    if (!onPage) return;

    var rules = [
      ['.section-head', ''], ['.step', ''], ['.lcard', ''], ['.faq details', ''], ['.principles li', ''],
      ['.strip .fact', ''], ['.cta', 'reveal-z'], ['.footer-top > div', ''],
      ['.work .work-media', 'reveal-l'], ['.work .work-info', 'reveal-r'], ['.work.is-flip .work-media', 'reveal-r'], ['.work.is-flip .work-info', 'reveal-l'],
      ['.about-grid > div:first-child', 'reveal-l'], ['.about-grid > .frame', 'reveal-r'],
      ['.filters', ''], ['.side-card', 'reveal-r'], ['.detail-grid > div:first-child', '']
    ];
    var items = [];
    rules.forEach(function (r) {
      document.querySelectorAll(r[0]).forEach(function (el) {
        if (el.closest('.hero')) return;
        el.classList.remove('reveal-l', 'reveal-r', 'reveal-z');
        if (r[1]) el.classList.add(r[1]);
        if (items.indexOf(el) === -1) items.push(el);
      });
    });

    // atraso escalonado entre irmãos
    var seen = new Map();
    items.forEach(function (el) {
      var parent = el.parentElement;
      var n = seen.get(parent) || 0;
      seen.set(parent, n + 1);
      el.style.setProperty('--d', (Math.min(n, 5) * 0.09).toFixed(2) + 's');
      el.classList.add('reveal');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add('is-in');
        var wait = 900 + parseFloat(el.style.getPropertyValue('--d') || 0) * 1000;
        // depois de aparecer, devolve o elemento ao normal (para o hover funcionar)
        setTimeout(function () { el.classList.remove('reveal', 'is-in', 'reveal-l', 'reveal-r', 'reveal-z'); el.style.removeProperty('--d'); }, wait + 100);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Números que contam ---------- */
  function counters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    function run(el) {
      var to = parseInt(el.getAttribute('data-count'), 10);
      if (!isFinite(to)) return;
      var t0 = null;
      el.textContent = '0';
      requestAnimationFrame(function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1300);
        var e = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(to * e));
        if (k < 1) requestAnimationFrame(step);
      });
    }
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } });
    }, { threshold: .6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Arranque ---------- */
  function boot() {
    header();
    anchors();
    extras();
    photoPicker();
    gallery();
    compare();
    reveal();
    counters();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
