/* Plotteriet Effekter 0.2.0. Ren JavaScript, ingen biblioteker. */
(function () {
  'use strict';

  var moduler = window.PLOTTERIET_EFFEKTER || {};
  var reduser = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finMus = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function klar(fn) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); } else { fn(); }
  }

  /* ── 3D-tilt med lysrefleks: bare med mus eller penn, aldri på berøringsskjerm ── */
  function tilt() {
    if (reduser || !finMus) { return; }
    var valg = '.salon .work .frame, .framed, .xmas__link, .woocommerce-product-gallery__image';
    var maks = 14; // grader

    document.querySelectorAll(valg).forEach(function (el) {
      if (el.classList.contains('pe-tilt')) { return; }
      el.classList.add('pe-tilt');
      if (window.getComputedStyle(el).position === 'static') { el.style.position = 'relative'; }
      var glans = document.createElement('span');
      glans.className = 'pe-glare';
      glans.setAttribute('aria-hidden', 'true');
      el.appendChild(glans);

      var ramme = 0;
      var px = 0, py = 0;
      function tegn() {
        ramme = 0;
        el.style.setProperty('--pe-rx', (-(py - 0.5) * 2 * maks).toFixed(2) + 'deg');
        el.style.setProperty('--pe-ry', ((px - 0.5) * 2 * maks).toFixed(2) + 'deg');
        el.style.setProperty('--pe-gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--pe-gy', (py * 100).toFixed(1) + '%');
      }
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') { return; }
        var r = el.getBoundingClientRect();
        px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        el.classList.add('pe-aktiv');
        if (!ramme) { ramme = requestAnimationFrame(tegn); }
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('pe-aktiv');
        px = 0.5; py = 0.5;
        tegn();
      });
    });
  }

  /* ── Myk avsløring av seksjoner når de kommer til syne ── */
  function avsloring() {
    if (reduser || !('IntersectionObserver' in window)) { return; }
    var valg = '.steps .stairs li, .wedding__text, .packs li, .about__pic, .film__wall, .xmas > div';
    var elementer = Array.prototype.slice.call(document.querySelectorAll(valg));
    if (!elementer.length) { return; }
    document.documentElement.classList.add('pe-js');
    elementer.forEach(function (el) { el.classList.add('pe-avslor'); });

    var obs = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (!p.isIntersecting) { return; }
        var el = p.target;
        obs.unobserve(el);
        el.classList.add('pe-inn');
        // Når den er på plass, slippes klassene så temaets egne overganger gjelder igjen.
        setTimeout(function () { el.classList.remove('pe-avslor', 'pe-inn'); }, 1000);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    elementer.forEach(function (el) { obs.observe(el); });
  }


  /* ── Rulle-tilt: bildene dreier og flyter i dybden mens du scroller (alle enheter) ── */
  function rulletilt() {
    if (reduser) { return; }
    var liste = [];
    document.querySelectorAll('.salon .work').forEach(function (arbeid, i) {
      var ramme = arbeid.querySelector('.frame');
      if (ramme) {
        liste.push({ el: ramme, rot: 7, flyt: 0 });
        ramme.classList.add('pe-tilt');
      }
      arbeid.classList.add('pe-flyt');
      liste.push({ el: arbeid, rot: 0, flyt: ((i % 3) + 1) * 8 });
    });
    document.querySelectorAll('.xmas__link, .film__wall').forEach(function (el) {
      el.classList.add('pe-tilt');
      liste.push({ el: el, rot: 6, flyt: 0 });
    });
    if (!liste.length) { return; }

    var venter = false;
    function oppdater() {
      venter = false;
      var vh = window.innerHeight || 800;
      liste.forEach(function (x) {
        var r = x.el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) { return; }
        var p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / (vh / 2)));
        if (x.rot) { x.el.style.setProperty('--pe-sx', (p * x.rot).toFixed(2) + 'deg'); }
        if (x.flyt) { x.el.style.setProperty('--pe-fy', (p * x.flyt).toFixed(1) + 'px'); }
      });
    }
    function be() { if (!venter) { venter = true; requestAnimationFrame(oppdater); } }
    window.addEventListener('scroll', be, { passive: true });
    window.addEventListener('resize', be);
    oppdater();
  }

  /* ── Forsidens hovedbilde i 3D: følger musen, dreier litt med scroll på berøring ── */
  function scene() {
    if (reduser) { return; }
    var hero = document.querySelector('.hero');
    var scenen = hero && hero.querySelector('.stage');
    if (!scenen) { return; }
    scenen.classList.add('pe-scene');
    if (finMus) {
      var ramme = 0, px = 0.5, py = 0.5;
      var tegn = function () {
        ramme = 0;
        scenen.style.setProperty('--pe-rx', (-(py - 0.5) * 16).toFixed(2) + 'deg');
        scenen.style.setProperty('--pe-ry', ((px - 0.5) * 22).toFixed(2) + 'deg');
      };
      hero.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') { return; }
        var r = hero.getBoundingClientRect();
        px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        scenen.classList.add('pe-aktiv');
        if (!ramme) { ramme = requestAnimationFrame(tegn); }
      });
      hero.addEventListener('pointerleave', function () { scenen.classList.remove('pe-aktiv'); px = 0.5; py = 0.5; tegn(); });
    } else {
      var venter = false;
      var rull = function () {
        venter = false;
        var r = scenen.getBoundingClientRect();
        var p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - (window.innerHeight || 800) / 2) / ((window.innerHeight || 800) / 2)));
        scenen.style.setProperty('--pe-sx', (p * 8).toFixed(2) + 'deg');
      };
      window.addEventListener('scroll', function () { if (!venter) { venter = true; requestAnimationFrame(rull); } }, { passive: true });
      rull();
    }
  }

  /* ── Blekkstrek som tegnes under overskriftene ── */
  function understrek() {
    if (reduser || !('IntersectionObserver' in window)) { return; }
    var NS = 'http://www.w3.org/2000/svg';
    var tittler = Array.prototype.slice.call(document.querySelectorAll('h2.big')).filter(function (h) { return !h.closest('.hero'); });
    if (!tittler.length) { return; }
    var obs = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (!p.isIntersecting) { return; }
        obs.unobserve(p.target);
        // To animasjonsruter, så overgangen starter fra skjult tilstand.
        requestAnimationFrame(function () { requestAnimationFrame(function () { p.target.classList.add('pe-skrevet'); }); });
      });
    }, { threshold: 0.6 });
    tittler.forEach(function (h, i) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'pe-understrek');
      svg.setAttribute('viewBox', '0 0 300 16');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var sti = document.createElementNS(NS, 'path');
      // Litt ulik strek per overskrift, så det ikke ser stemplet ut.
      var varianter = ['M4 10 C 50 3, 110 15, 170 7 S 270 5, 296 10', 'M4 7 C 70 14, 120 2, 190 9 S 260 14, 296 6', 'M4 11 C 40 4, 100 12, 160 6 S 250 12, 296 8'];
      sti.setAttribute('d', varianter[i % varianter.length]);
      svg.appendChild(sti);
      h.appendChild(svg);
      var len = sti.getTotalLength ? sti.getTotalLength() : 320;
      sti.style.strokeDasharray = len;
      sti.style.strokeDashoffset = len;
      obs.observe(svg);
    });
  }

  /* ── Fast kjøpsknapp på produktsider (vises bare på smale skjermer) ── */
  function kjopsbar() {
    if (!document.body.classList.contains('single-product')) { return; }
    var skjema = document.querySelector('form.cart');
    var ekte = skjema && skjema.querySelector('.single_add_to_cart_button, button[type="submit"][name="add-to-cart"]');
    if (!ekte) { return; }

    var tittel = document.querySelector('.product_title');
    var prisEl = document.querySelector('.summary .price, .entry-summary .price, p.price');

    var bar = document.createElement('div');
    bar.className = 'pe-kjop';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Kjøp');
    var tekst = document.createElement('div');
    tekst.className = 'pe-kjop__tekst';
    var t = document.createElement('span');
    t.className = 'pe-kjop__tittel';
    var p = document.createElement('span');
    p.className = 'pe-kjop__pris';
    tekst.appendChild(t); tekst.appendChild(p);
    var knapp = document.createElement('button');
    knapp.type = 'button';
    knapp.className = 'pe-kjop__knapp';
    bar.appendChild(tekst); bar.appendChild(knapp);
    document.body.appendChild(bar);
    document.body.classList.add('pe-har-kjopsbar');

    function oppdater() {
      t.textContent = tittel ? tittel.textContent.trim() : '';
      p.textContent = prisEl ? prisEl.textContent.replace(/\s+/g, ' ').trim() : '';
      knapp.textContent = ekte.textContent.trim() || 'Kjøp';
      var av = ekte.disabled || ekte.classList.contains('disabled') || ekte.getAttribute('aria-disabled') === 'true';
      knapp.setAttribute('aria-disabled', av ? 'true' : 'false');
    }
    oppdater();
    // Pris og knapp kan endre seg når kunden velger format eller variant.
    var mo = new MutationObserver(oppdater);
    if (prisEl) { mo.observe(prisEl, { childList: true, subtree: true, characterData: true }); }
    mo.observe(ekte, { attributes: true, childList: true, characterData: true, subtree: true });

    knapp.addEventListener('click', function () {
      var ugyldig = ekte.disabled || ekte.classList.contains('disabled') || (typeof skjema.checkValidity === 'function' && !skjema.checkValidity());
      if (ugyldig) {
        // Mangler kunden et valg, ta dem dit i stedet for å gjette.
        skjema.scrollIntoView({ behavior: reduser ? 'auto' : 'smooth', block: 'center' });
        if (typeof skjema.reportValidity === 'function') { skjema.reportValidity(); }
        return;
      }
      ekte.click();
    });

    if (!('IntersectionObserver' in window)) { bar.classList.add('pe-synlig'); return; }
    var io = new IntersectionObserver(function (poster) {
      var synlig = poster[0].isIntersecting;
      bar.classList.toggle('pe-synlig', !synlig);
    }, { threshold: 0.01 });
    io.observe(ekte);
  }

  klar(function () {
    if (moduler.tilt) { tilt(); }
    if (moduler.rulletilt) { rulletilt(); }
    if (moduler.scene) { scene(); }
    if (moduler.understrek) { understrek(); }
    if (moduler.avsloring) { avsloring(); }
    if (moduler.kjopsbar) { kjopsbar(); }
  });
})();
