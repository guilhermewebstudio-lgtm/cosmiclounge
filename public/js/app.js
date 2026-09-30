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
      var on = function () { h.classList.toggle('is-scrolled', window.scrollY > 8); };
      on();
      window.addEventListener('scroll', on, { passive: true });
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
    // galeria do imóvel
    var thumbs = document.querySelectorAll('.gallery-thumbs button');
    var big = document.getElementById('galleryImg');
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        if (big) big.src = t.getAttribute('data-src');
        thumbs.forEach(function (o) { o.classList.remove('is-on'); });
        t.classList.add('is-on');
      });
    });
    // âncoras vindas de outra página (ex.: /#como-funciona)
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 60);
    }
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

  /* ---------- Comparador antes/depois ---------- */
  function tween(from, to, ms, step, done) {
    var t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      step(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  function compare() {
    var all = document.querySelectorAll('.ba');
    all.forEach(function (box) {
      var range = box.querySelector('.ba-range');
      if (!range) return;
      var touched = false;
      var set = function (v) { box.style.setProperty('--pos', v + '%'); range.value = v; };
      range.addEventListener('input', function () { touched = true; box.style.setProperty('--pos', range.value + '%'); });
      if (reduce || !('IntersectionObserver' in window)) return;
      // pequeno gesto de convite quando entra no ecrã (uma vez)
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        if (touched) return;
        tween(50, 32, 600, function (v) { if (!touched) set(v); }, function () {
          tween(32, 68, 900, function (v) { if (!touched) set(v); }, function () {
            tween(68, 50, 600, function (v) { if (!touched) set(v); });
          });
        });
      }, { threshold: .55 });
      io.observe(box);
    });
  }

  /* ---------- Arranque ---------- */
  function boot() {
    header();
    anchors();
    extras();
    photoPicker();
    compare();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
