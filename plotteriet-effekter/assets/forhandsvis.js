/* Plotteriet forhåndsvisning 0.3.0. Bildet behandles i nettleseren og forlater aldri enheten. */
(function () {
  'use strict';

  var rot = document.querySelector('[data-pf]');
  if (!rot) { return; }

  var reduser = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s) { return rot.querySelector(s); }
  var lerret = $('.pf__lerret');
  var ctx = lerret.getContext('2d');
  var penn = $('.pf__penn');
  var tall = $('.pf__tall');
  var fil = $('.pf__fil');
  var igjen = $('.pf__igjen');
  var last = $('.pf__last');

  var MARG = 44;          // marg rundt tegningen, i punkter
  var VARIGHET = 14;      // sekunder for hele tegningen
  var PAPIR = '#fffdf4';
  var INK = '#161616';
  var bilde = null;       // lastet bilde
  var streker = [];       // siste utregnede streker
  var info = null;        // { W, H, sk }
  var jobb = 0;           // økes for å avbryte en pågående tegning
  var forsinkelse = 0;

  function valgt(navn) {
    var el = rot.querySelector('input[name="' + navn + '"]:checked');
    return el ? el.value : '';
  }

  function melding(tekst) { tall.textContent = tekst || ''; }

  /* ── Bildet til en mørkhetskart (0 = lyst, 1 = mørkt) i tegneflatens område ── */
  function mørkhetskart(img, W, H) {
    var ix = MARG, iy = MARG, iw = W - 2 * MARG, ih = H - 2 * MARG;
    var gw = Math.round(iw / 2), gh = Math.round(ih / 2);
    var c = document.createElement('canvas');
    c.width = gw; c.height = gh;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff';
    g.fillRect(0, 0, gw, gh);
    var s = Math.max(gw / img.naturalWidth, gh / img.naturalHeight); // fyll flaten, beskjær kantene
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.drawImage(img, (gw - dw) / 2, (gh - dh) / 2, dw, dh);
    var d = g.getImageData(0, 0, gw, gh).data;
    var n = gw * gh;
    var lum = new Float32Array(n);
    var i, x, y;
    for (i = 0; i < n; i++) { lum[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255; }

    // Lett uskarphet (3x3) så støy ikke blir skravur.
    var uskarp = new Float32Array(n);
    for (y = 0; y < gh; y++) {
      for (x = 0; x < gw; x++) {
        var sum = 0, ant = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            var xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < gw && yy >= 0 && yy < gh) { sum += lum[yy * gw + xx]; ant++; }
          }
        }
        uskarp[y * gw + x] = sum / ant;
      }
    }

    // Strekk kontrasten mellom 2. og 98. persentil, så flate bilder også får tegning.
    var sortert = Float32Array.from(uskarp).sort();
    var lo = sortert[Math.floor(n * 0.02)];
    var hi = sortert[Math.floor(n * 0.98)];
    if (hi - lo < 0.05) { hi = lo + 0.05; }
    var m = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var v = (uskarp[i] - lo) / (hi - lo);
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      m[i] = Math.pow(1 - v, 1.15);
    }
    return { m: m, gw: gw, gh: gh, ix: ix, iy: iy, iw: iw, ih: ih };
  }

  function mørk(k, x, y) {
    var gx = ((x - k.ix) / k.iw * k.gw) | 0;
    var gy = ((y - k.iy) / k.ih * k.gh) | 0;
    gx = gx < 0 ? 0 : gx >= k.gw ? k.gw - 1 : gx;
    gy = gy < 0 ? 0 : gy >= k.gh ? k.gh - 1 : gy;
    return k.m[gy * k.gw + gx];
  }

  function snu(strek) { return strek.slice().reverse(); }

  /* ── Skravur: bølgende linjer, større utslag der bildet er mørkt ── */
  function skravur(k, gap) {
    var ut = [];
    var rader = Math.floor(k.ih / gap);
    for (var r = 0; r < rader; r++) {
      var y0 = k.iy + gap / 2 + r * gap;
      var fase = 0, s = null, rad = [];
      for (var x = k.ix; x <= k.ix + k.iw; x += 1.5) {
        var d = mørk(k, x, y0);
        if (d < 0.07) {
          if (s && s.length > 1) { rad.push(s); }
          s = null; fase += 0.2;
          continue;
        }
        fase += 0.25 + d * 0.9;
        if (!s) { s = []; }
        s.push([x, y0 + Math.sin(fase) * d * gap * 0.5]);
      }
      if (s && s.length > 1) { rad.push(s); }
      if (r % 2) { rad = rad.reverse().map(snu); } // pennen går frem og tilbake
      for (var j = 0; j < rad.length; j++) { ut.push(rad[j]); }
    }
    return ut;
  }

  /* ── Kryss: rette linjer i flere retninger, flere lag der det er mørkt ── */
  function lag(k, gap, grader, terskel) {
    var a = grader * Math.PI / 180;
    var dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    var cx = k.ix + k.iw / 2, cy = k.iy + k.ih / 2;
    var R = Math.hypot(k.iw, k.ih) / 2;
    var ut = [], n = 0;
    for (var o = -R; o <= R; o += gap) {
      var s = null, rad = [];
      var stopp = function () { if (s && s.length > 1) { rad.push(s); } s = null; };
      for (var t = -R; t <= R; t += 2) {
        var x = cx + nx * o + dx * t, y = cy + ny * o + dy * t;
        if (x < k.ix || x > k.ix + k.iw || y < k.iy || y > k.iy + k.ih) { stopp(); continue; }
        if (mørk(k, x, y) < terskel) { stopp(); continue; }
        if (!s) { s = []; }
        s.push([x, y]);
      }
      stopp();
      if (n++ % 2) { rad = rad.reverse().map(snu); }
      for (var j = 0; j < rad.length; j++) { ut.push(rad[j]); }
    }
    return ut;
  }
  function kryss(k, gap) {
    var g = gap * 0.9;
    return lag(k, g, 45, 0.2).concat(lag(k, g, 135, 0.45), lag(k, g, 0, 0.7));
  }

  /* ── Tegne ── */
  function klargjorLerret(W, H) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    lerret.width = Math.round(W * dpr);
    lerret.height = Math.round(H * dpr);
    lerret.style.aspectRatio = W + ' / ' + H;
    var sk = lerret.width / W;
    ctx.setTransform(sk, 0, 0, sk, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.15;
    info = { W: W, H: H, sk: sk };
    blankt();
  }
  function blankt() {
    ctx.fillStyle = PAPIR;
    ctx.fillRect(0, 0, info.W, info.H);
  }

  function lengdeMm(liste, format) {
    var pt = 0;
    liste.forEach(function (s) {
      for (var i = 1; i < s.length; i++) { pt += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); }
    });
    var mmPerPt = (format === 'a4' ? 210 : 148) / 595;
    return pt * mmPerPt;
  }

  function fullfort() {
    rot.classList.remove('pf--tegner');
    rot.setAttribute('data-ferdig', '1');
    var mm = lengdeMm(streker, valgt('pf-format'));
    var meter = (mm / 1000).toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    melding(streker.length.toLocaleString('nb-NO') + ' streker · omtrent ' + meter + ' m penn · ' + valgt('pf-format').toUpperCase());
    igjen.disabled = false;
    last.disabled = false;
  }

  function flyttPenn(x, y) {
    var w = lerret.clientWidth;
    var f = w / info.W;
    var ramme = lerret.offsetLeft, topp = lerret.offsetTop;
    penn.style.transform = 'translate3d(' + (ramme + x * f - 17) + 'px,' + (topp + y * f - 102) + 'px,0)';
  }

  function tegnAlt() {
    blankt();
    ctx.beginPath();
    streker.forEach(function (s) {
      ctx.moveTo(s[0][0], s[0][1]);
      for (var i = 1; i < s.length; i++) { ctx.lineTo(s[i][0], s[i][1]); }
    });
    ctx.stroke();
  }

  function animer() {
    var min = ++jobb;
    rot.removeAttribute('data-ferdig');
    igjen.disabled = true;
    last.disabled = true;
    if (!streker.length) { melding('Fant ikke nok kontrast i bildet. Prøv et bilde med tydeligere lys og mørke.'); return; }
    if (reduser) { tegnAlt(); fullfort(); return; }

    blankt();
    rot.classList.add('pf--tegner');
    var total = 0;
    streker.forEach(function (s) { total += s.length; });
    var perRamme = Math.max(3, Math.ceil(total / (60 * VARIGHET)));
    var si = 0, pi = 0, gjort = 0;

    function ramme() {
      if (min !== jobb) { return; }
      var rest = perRamme;
      ctx.beginPath();
      var s = streker[si];
      if (pi > 0) { ctx.moveTo(s[pi - 1][0], s[pi - 1][1]); }
      var sist = null;
      while (rest > 0 && si < streker.length) {
        s = streker[si];
        if (pi === 0) { ctx.moveTo(s[0][0], s[0][1]); pi = 1; sist = s[0]; continue; }
        ctx.lineTo(s[pi][0], s[pi][1]);
        sist = s[pi];
        pi++; rest--; gjort++;
        if (pi >= s.length) { si++; pi = 0; }
      }
      ctx.stroke();
      if (sist) { flyttPenn(sist[0], sist[1]); }
      melding('Plotter … ' + Math.min(99, Math.round(gjort / total * 100)) + ' %');
      if (si < streker.length) { requestAnimationFrame(ramme); } else { fullfort(); }
    }
    requestAnimationFrame(ramme);
  }

  function lagStreker() {
    if (!bilde) { return; }
    var liggende = bilde.naturalWidth / bilde.naturalHeight > 1.15;
    var W = liggende ? 842 : 595, H = liggende ? 595 : 842;
    klargjorLerret(W, H);
    var k = mørkhetskart(bilde, W, H);
    var gap = { fin: 5, middels: 7, grov: 10 }[valgt('pf-tetthet')] || 7;
    streker = valgt('pf-stil') === 'kryss' ? kryss(k, gap) : skravur(k, gap);
    rot.classList.add('pf--har-bilde');
    animer();
  }

  function planlegg() {
    clearTimeout(forsinkelse);
    forsinkelse = setTimeout(lagStreker, 150);
  }

  /* ── Laste bilde ── */
  function lastBilde(src, frigi) {
    melding('Klargjør bildet …');
    var img = new Image();
    img.onload = function () {
      if (frigi) { URL.revokeObjectURL(src); }
      if (!img.naturalWidth || !img.naturalHeight) { melding('Kunne ikke lese bildet. Prøv en JPG eller PNG.'); return; }
      bilde = img;
      lagStreker();
    };
    img.onerror = function () {
      if (frigi) { URL.revokeObjectURL(src); }
      melding('Kunne ikke lese bildet. Prøv en JPG eller PNG.');
    };
    img.src = src;
  }

  $('.pf__velg').addEventListener('click', function () { fil.click(); });
  fil.addEventListener('change', function () {
    var f = fil.files && fil.files[0];
    fil.value = '';
    if (!f) { return; }
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) { melding('Det ser ikke ut som et bilde. Velg en JPG eller PNG.'); return; }
    lastBilde(URL.createObjectURL(f), true);
  });
  var eks = $('.pf__eksempel');
  if (eks) {
    eks.addEventListener('click', function () {
      var kilde = rot.getAttribute('data-eksempel');
      if (kilde) { lastBilde(kilde, false); }
    });
  }
  rot.addEventListener('change', function (e) {
    if (e.target && e.target.type === 'radio') { planlegg(); }
  });
  igjen.addEventListener('click', animer);
  last.addEventListener('click', function () {
    lerret.toBlob(function (blob) {
      if (!blob) { return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'plotteriet-skisse.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }, 'image/png');
  });

  klargjorLerret(595, 842);
})();
