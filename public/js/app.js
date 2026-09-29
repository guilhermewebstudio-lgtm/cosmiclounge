/* CosmicLounge — animações e interações
   - Fundo de estrelas (canvas)
   - Intro (1x por sessão) e transição de página em "cortina"
   - Constelação da casa no hero + planeta a orbitar
   - Linha dos passos com planeta (scroll)
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = function () { return typeof window.gsap !== 'undefined'; };

  function store(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignora */ } }

  /* ---------- Fundo de estrelas ---------- */
  function starfield() {
    var c = document.getElementById('starfield');
    if (!c || reduce) return;
    var ctx = c.getContext('2d');
    var w, h, stars = [], raf;
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.width = window.innerWidth * dpr;
      h = c.height = window.innerHeight * dpr;
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
      var n = Math.round((window.innerWidth * window.innerHeight) / 14000);
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: (Math.random() * 1.1 + .3) * dpr,
          a: Math.random() * Math.PI * 2, s: Math.random() * .012 + .004,
          v: (Math.random() * .04 + .01) * dpr
        });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.a += s.s; s.y -= s.v;
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }
        var o = .35 + Math.sin(s.a) * .35;
        ctx.globalAlpha = Math.max(.05, o);
        ctx.fillStyle = '#f1dba5';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    size(); draw();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf); else draw();
    });
  }

  /* ---------- Cabeçalho e menu ---------- */
  function header() {
    var h = document.getElementById('header');
    if (h) {
      var on = function () { h.classList.toggle('is-scrolled', window.scrollY > 24); };
      on(); window.addEventListener('scroll', on, { passive: true });
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
    }
  }

  /* ---------- Transição de página (cortina) ---------- */
  var navigating = false;
  function curtainOut(done) {
    var curtain = document.getElementById('curtain');
    if (!curtain || !hasGsap() || reduce) { done(); return; }
    navigating = true;
    curtain.classList.add('is-active');
    var panels = curtain.querySelectorAll('.curtain-panel');
    var mark = curtain.querySelector('.curtain-mark');
    gsap.set(panels, { scaleY: 0, transformOrigin: 'bottom' });
    gsap.set(mark, { opacity: 0, scale: .9 });
    gsap.timeline({ onComplete: done })
      .to(panels, { scaleY: 1, duration: .5, ease: 'power3.inOut', stagger: { each: .06, from: 'start' } })
      .to(mark, { opacity: 1, scale: 1, duration: .3, ease: 'power2.out' }, '-=.25');
  }
  function curtainIn() {
    var curtain = document.getElementById('curtain');
    if (!curtain) return;
    var cleanup = function () {
      root.classList.remove('has-curtain');
      curtain.classList.remove('is-active');
      store('cl_t', '0');
    };
    if (!hasGsap() || reduce) { cleanup(); return; }
    var panels = curtain.querySelectorAll('.curtain-panel');
    var mark = curtain.querySelector('.curtain-mark');
    gsap.set(panels, { scaleY: 1, transformOrigin: 'top' });
    gsap.set(mark, { opacity: 1 });
    gsap.timeline({ onComplete: cleanup, delay: .08 })
      .to(mark, { opacity: 0, scale: 1.08, duration: .3, ease: 'power2.in' })
      .to(panels, { scaleY: 0, duration: .55, ease: 'power3.inOut', stagger: { each: .06, from: 'end' } }, '-=.1')
      .add(pageEnter, '-=.35');
  }
  function bindLinks() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) {
        // mesma página: só rolagem até à âncora
        if (url.hash) {
          var t = document.getElementById(url.hash.slice(1));
          if (t) { e.preventDefault(); document.body.classList.remove('nav-open'); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', url.hash); }
        }
        return;
      }
      if (navigating) { e.preventDefault(); return; }
      e.preventDefault();
      document.body.classList.remove('nav-open');
      store('cl_t', '1');
      curtainOut(function () { location.href = url.href; });
    });
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        navigating = false;
        var c = document.getElementById('curtain');
        if (c) c.classList.remove('is-active');
        root.classList.remove('has-curtain');
        if (hasGsap()) gsap.set('.curtain-panel', { scaleY: 0 });
      }
    });
  }

  /* ---------- Intro ---------- */
  function intro(done) {
    var el = document.getElementById('intro');
    if (!el || !root.classList.contains('has-intro')) { done(); return; }
    store('cl_intro', '1');
    var finish = function () {
      root.classList.remove('has-intro');
      el.style.display = 'none';
      done();
    };
    if (!hasGsap() || reduce) { finish(); return; }

    // estrelas do intro
    var box = document.getElementById('introStars');
    for (var i = 0; i < 46; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      box.appendChild(s);
    }
    var tl = gsap.timeline({ onComplete: finish });
    tl.to('#introStars i', { opacity: function () { return .3 + Math.random() * .7; }, duration: .8, stagger: { each: .015, from: 'random' }, ease: 'power1.out' }, 0)
      .to('#introMark', { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }, .1)
      .to('#introWord span', { y: 0, duration: .8, stagger: .12, ease: 'power4.out' }, .55)
      .to('#introLine', { scaleX: 1, duration: .9, ease: 'power3.inOut' }, .7)
      .to('#introTag', { opacity: 1, duration: .6 }, 1.05)
      .to('#introMark', { filter: 'drop-shadow(0 0 46px rgba(246,231,189,.95))', duration: .5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.1)
      // saída: o intro "sobe" revelando o site
      .to('.intro-inner', { y: -40, opacity: 0, duration: .55, ease: 'power2.in' }, 2.35)
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: .95, ease: 'power4.inOut' }, 2.55)
      .add(pageEnter, 2.9);
  }

  /* ---------- Entrada da página (hero) ---------- */
  var entered = false;
  function pageEnter() {
    if (entered) return;
    entered = true;
    if (!hasGsap() || reduce) {
      document.querySelectorAll('[data-hero], .page-hero h1, .error-page h1').forEach(function (e) { e.style.opacity = 1; });
      constellation(true);
      return;
    }
    var lines = document.querySelectorAll('[data-hero="line"]');
    var fades = document.querySelectorAll('[data-hero="fade"]');
    if (lines.length) {
      gsap.fromTo(lines, { yPercent: 40, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
        { yPercent: 0, opacity: 1, clipPath: 'inset(0 0 -20% 0)', duration: 1, ease: 'power4.out', stagger: .14 });
    }
    if (fades.length) {
      gsap.fromTo(fades, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .1, delay: .25 });
    }
    constellation(false);
    var top = document.querySelector('.page-hero h1, .error-page h1');
    if (top && !lines.length) gsap.fromTo(top, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out' });
  }

  /* ---------- Constelação da casa ---------- */
  function constellation(instant) {
    var svg = document.querySelector('#constellation svg');
    if (!svg) return;
    var paths = svg.querySelectorAll('.c-line');
    var nodes = svg.querySelector('#cNodes');
    var planet = svg.querySelector('#planet');
    var orbit = svg.querySelector('#orbit');
    var cx = 260, cy = 250, rx = 268, ry = 92, ang = -30 * Math.PI / 180;
    function pos(t) {
      var x = rx * Math.cos(t), y = ry * Math.sin(t);
      return { x: cx + x * Math.cos(ang) - y * Math.sin(ang), y: cy + x * Math.sin(ang) + y * Math.cos(ang) };
    }
    function place(t) { var p = pos(t); planet.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')'); }
    place(2.6);
    if (instant || !hasGsap() || reduce) return;

    paths.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
    });
    gsap.set(nodes, { opacity: 0 });
    gsap.set(planet, { opacity: 0 });
    gsap.set(orbit, { opacity: 0 });
    var tl = gsap.timeline({ delay: .2 });
    tl.to(orbit, { opacity: 1, duration: 1.2 }, 0)
      .to(paths, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut', stagger: .35 }, .1)
      .to(nodes, { opacity: 1, duration: 1.2 }, .5)
      .to(planet, { opacity: 1, duration: .8 }, 1.2);
    // planeta em órbita contínua
    var o = { t: 2.6 };
    gsap.to(o, { t: 2.6 + Math.PI * 2, duration: 46, ease: 'none', repeat: -1, onUpdate: function () { place(o.t); } });
  }

  /* ---------- Passos com planeta (scroll) ---------- */
  function steps() {
    var track = document.getElementById('steps');
    if (!track || !hasGsap() || !window.ScrollTrigger || reduce) return;
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia('(max-width: 640px)').matches) return;
    var fill = document.getElementById('stepsFill');
    var planet = document.getElementById('stepsPlanet');
    var st = { p: 0 };
    ScrollTrigger.create({
      trigger: track, start: 'top 75%', end: 'bottom 45%', scrub: .6,
      onUpdate: function (self) {
        var p = self.progress;
        gsap.set(fill, { scaleX: p });
        gsap.set(planet, { left: 'calc(' + (p * 100) + '% - ' + (p * 15) + 'px)' });
        st.p = p;
      }
    });
    // destaca cada passo quando o planeta o alcança
    var items = track.querySelectorAll('.step');
    items.forEach(function (it, i) {
      gsap.set(it, { opacity: .45 });
      ScrollTrigger.create({
        trigger: track, start: 'top 75%', end: 'bottom 45%', scrub: true,
        onUpdate: function (self) {
          var on = self.progress >= (i / items.length) - .02;
          gsap.to(it, { opacity: on ? 1 : .45, duration: .35, overwrite: true });
        }
      });
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
    // upload: nomes dos ficheiros
    var file = document.getElementById('fotos');
    var names = document.getElementById('dropNames');
    var drop = document.getElementById('drop');
    if (file && names) {
      file.addEventListener('change', function () {
        var n = file.files.length;
        if (n > 6) { names.textContent = 'Máximo de 6 fotografias. Escolha menos ficheiros.'; return; }
        names.textContent = n ? n + (n === 1 ? ' fotografia selecionada' : ' fotografias selecionadas') : '';
      });
      if (drop) {
        ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
        ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('is-over'); }); });
      }
    }
    // âncoras vindas de outra página (ex.: /#como-funciona)
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 60);
    }
  }

  /* ---------- Arranque ---------- */
  function boot() {
    starfield();
    header();
    bindLinks();
    extras();
    var hadCurtain = root.classList.contains('has-curtain');
    if (root.classList.contains('has-intro')) {
      intro(function () { pageEnter(); });
    } else if (hadCurtain) {
      curtainIn();
    } else {
      pageEnter();
    }
    steps();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
