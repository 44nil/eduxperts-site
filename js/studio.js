/* EduXperts Studio — pinned scroll showcase + demo modal */
(function () {
  var show = document.getElementById('sxShow');
  var sticky = show && show.querySelector('.sx-sticky');
  var phone = document.getElementById('sxPhone');
  var video = show && show.querySelector('video');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COUNT = 3, active = -1, ticking = false;

  function setActive(i) {
    if (i === active) return;
    active = i;
    sticky.setAttribute('data-active', String(i));
    if (video) {
      if (i === 0) { video.preload = 'auto'; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else video.pause();
    }
  }

  // Desktop runway: the dino runs along the bottom as the showcase scrolls
  var runway = show && show.querySelector('.sx-runway'), rwDino = document.getElementById('sxRwDino');
  var GAGS = ['mr', '', 'pr'], rwGag = '', rwLastP = -1, rwRunT = 0, rwJumped = [false, false];
  function updateRunway(p, idx) {
    if (!runway || !rwDino || runway.offsetParent === null) return;
    var w = runway.clientWidth;
    rwDino.style.setProperty('--dx', (p * (w - 30)).toFixed(1) + 'px');
    if (rwLastP >= 0 && Math.abs(p - rwLastP) > 0.0005 && !reduce) {
      rwDino.style.setProperty('--face', p < rwLastP ? -1 : 1);
      rwDino.classList.add('running'); clearTimeout(rwRunT);
      rwRunT = setTimeout(function () { rwDino.classList.remove('running'); }, 160);
    }
    // hop over the two cacti (at 1/3 and 2/3)
    [1 / 3, 2 / 3].forEach(function (c, k) {
      var near = Math.abs(p - c) < 0.015;
      if (near && !rwJumped[k]) { rwJumped[k] = true; rwDino.classList.remove('jump'); void rwDino.offsetWidth; rwDino.classList.add('jump'); }
      if (!near) rwJumped[k] = false;
    });
    var g = p > 0.01 && p < 0.985 ? GAGS[idx] : '';
    if (g !== rwGag) { if (rwGag) rwDino.classList.remove('gag-' + rwGag); if (g) rwDino.classList.add('gag-' + g); rwGag = g; }
    runway.classList.toggle('celebrate', p >= 0.985);
    rwLastP = p;
  }

  function update() {
    ticking = false;
    var r = show.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    setActive(Math.min(COUNT - 1, Math.floor(p * COUNT)));
    updateRunway(p, Math.min(COUNT - 1, Math.floor(p * COUNT)));
    sticky.style.setProperty('--p', p.toFixed(4));
    if (!reduce && phone) {
      var local = (p * COUNT) % 1;                // 0..1 within the current app
      var tilt = (local - 0.5) * 10;              // gentle sway while scrolling
      phone.style.transform = 'rotate(' + tilt.toFixed(2) + 'deg) translateY(' + ((local - 0.5) * -24).toFixed(1) + 'px)';
    }
  }

  if (show && sticky) {
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // dots jump to an app
    sticky.querySelectorAll('.sx-dots i').forEach(function (d) {
      d.addEventListener('click', function () {
        var i = +d.getAttribute('data-i');
        var top = show.offsetTop + (show.offsetHeight - window.innerHeight) * ((i + 0.5) / COUNT);
        window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  // Demo modal — the playable only loads when asked for
  var m = document.getElementById('stModal'), f = document.getElementById('stModalFrame');
  var btns = document.querySelectorAll('#stPlayBtn, .sx-story-play');
  function open() {
    f.innerHTML = '<iframe src="assets/images/studio/marina-rush-play.html" title="Marina Rush demo" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="autoplay"></iframe>';
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function close() {
    m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); f.innerHTML = ''; document.body.style.overflow = '';
  }
  if (btns.length && m) {
    btns.forEach(function (b) { b.addEventListener('click', open); });
    document.getElementById('stModalClose').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  // Count-up numbers in the bento grid
  document.querySelectorAll('.sx-count').forEach(function (el) {
    var to = +el.getAttribute('data-to');
    if (reduce || !('IntersectionObserver' in window)) { el.textContent = to; return; }
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now(), dur = 1600;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.4 });
    io.observe(el);
  });

  // Mobile: the dino runs down a winding path as you scroll and "visits" each app
  var jr = document.getElementById('sxJourney'), dino = document.getElementById('sxDino');
  if (jr && dino) {
    var stops = jr.querySelectorAll('.sx-stop'), cacti = jr.querySelectorAll('.sx-cactus-stop');
    var svg = jr.querySelector('.sx-path'), base = svg.querySelector('.sx-path-base'), fill = svg.querySelector('.sx-path-fill');
    var finish = jr.querySelector('.sx-finish');
    var CX = 30, AMP = 13, PERIOD = 260;                  // path centre, swing, wavelength (px)
    var H = 0, maxY = 0, curY = 0, tgtY = 0, pathLen = 0, loop = 0, visible = false;
    var runT = 0, gag = '', jumped = [], face = 1;
    function xAt(y) { return CX + AMP * Math.sin(y / PERIOD * Math.PI * 2); }
    function relTop(el) { return el.getBoundingClientRect().top - jr.getBoundingClientRect().top; }

    function layout() {
      if (jr.offsetParent === null) return false;          // hidden on desktop
      H = finish.offsetTop + 40; maxY = finish.offsetTop - 30;
      svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 64 ' + H);
      var d = 'M' + xAt(0).toFixed(1) + ' 0';
      for (var y = 8; y <= H; y += 8) d += ' L' + xAt(y).toFixed(1) + ' ' + y;
      base.setAttribute('d', d); fill.setAttribute('d', d);
      pathLen = fill.getTotalLength();
      fill.style.strokeDasharray = pathLen; fill.style.strokeDashoffset = pathLen;
      jr.querySelectorAll('.sx-stop-dot').forEach(function (el) { el.style.setProperty('--x', xAt(relTop(el) + 10) + 'px'); });
      jr.querySelectorAll('.sx-cactus').forEach(function (el) { el.style.setProperty('--x', xAt(relTop(el) + 13) + 'px'); });
      finish.style.setProperty('--x', xAt(finish.offsetTop) + 'px');
      return true;
    }

    function frame() {
      loop = 0;
      var r = jr.getBoundingClientRect();
      tgtY = Math.max(0, Math.min(maxY, window.innerHeight * 0.45 - r.top));
      var diff = tgtY - curY;
      curY = reduce ? tgtY : curY + diff * 0.14;           // soft follow, a little behind the page
      var moving = Math.abs(diff) > 0.6;

      // face the way we're running, lean into the curve
      if (diff < -3) face = -1; else if (diff > 3) face = 1;
      var slope = (xAt(curY + 4) - xAt(curY - 4)) / 8;
      dino.style.setProperty('--dx', xAt(curY).toFixed(1) + 'px');
      dino.style.setProperty('--dy', curY.toFixed(1) + 'px');
      dino.style.setProperty('--lean', (-Math.atan(slope) * 57).toFixed(1) + 'deg');
      dino.style.setProperty('--face', face);
      if (pathLen) fill.style.strokeDashoffset = Math.max(0, pathLen - (curY + 29) * (pathLen / H));

      if (moving && !reduce) { dino.classList.add('running'); clearTimeout(runT); runT = setTimeout(function () { dino.classList.remove('running'); }, 120); }

      var dinoAbs = r.top + curY + 29, nextGag = '';
      stops.forEach(function (st) {
        var sr = st.getBoundingClientRect(), here = dinoAbs >= sr.top + 10;
        if (here) st.classList.add('arrived');
        if (here && dinoAbs <= sr.bottom) nextGag = st.getAttribute('data-gag');
        var v = st.querySelector('video');
        if (v) { if (here && sr.bottom > 0 && sr.top < window.innerHeight) { v.preload = 'auto'; var pp = v.play(); if (pp && pp.catch) pp.catch(function () {}); } else v.pause(); }
      });
      if (nextGag !== gag) { if (gag) dino.classList.remove('gag-' + gag); if (nextGag) dino.classList.add('gag-' + nextGag); gag = nextGag; }
      cacti.forEach(function (c, k) {
        var cr = c.getBoundingClientRect();
        if (!jumped[k] && dinoAbs >= cr.top && dinoAbs <= cr.bottom + 10) {
          jumped[k] = true; dino.classList.remove('jump'); void dino.offsetWidth; dino.classList.add('jump');
          setTimeout(function () { jumped[k] = false; }, 900);
        }
      });
      jr.classList.toggle('celebrate', curY >= maxY - 4);

      if (visible && (moving || Math.abs(tgtY - curY) > 0.5)) loop = requestAnimationFrame(frame);
    }
    function kick() { if (!loop && visible) loop = requestAnimationFrame(frame); }

    // The hero phone's dino jumps out onto the path when you start scrolling,
    // and hops back into the phone when you return to the top.
    var heroWrap = document.querySelector('.sx-hero-phone'), heroRunner = heroWrap && heroWrap.querySelector('.game-scene-runner');
    var fly = dino.querySelector('.sx-dino-fly'), sprite = dino.querySelector('.sx-dino-sprite');
    var out = false, flying = null;
    function offsetFromPhone() {
      var a = heroRunner.getBoundingClientRect(), b = sprite.getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top, s: a.width / b.width };
    }
    function jumpOut() {
      out = true;
      if (!heroRunner || reduce) { heroWrap && heroWrap.classList.add('dino-out'); dino.classList.remove('waiting'); jr.classList.add('landed'); return; }
      var o = offsetFromPhone();
      heroWrap.classList.add('dino-out'); dino.classList.remove('waiting');
      if (flying) flying.cancel();
      flying = fly.animate([
        { transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(' + o.s + ')' },
        { transform: 'translate(' + (o.x * 0.55) + 'px,' + (Math.min(o.y, 0) * 0.55 - 90) + 'px) scale(1.15) rotate(-18deg)', offset: 0.42 },
        { transform: 'translate(0,0) scale(1.1,0.85)', offset: 0.88 },
        { transform: 'translate(0,0) scale(1)' }
      ], { duration: 900, easing: 'cubic-bezier(.35,.6,.4,1)' });
      flying.onfinish = function () { flying = null; if (out) jr.classList.add('landed'); };
    }
    function jumpIn() {
      out = false; jr.classList.remove('landed');
      if (!heroRunner || reduce) { heroWrap && heroWrap.classList.remove('dino-out'); dino.classList.add('waiting'); return; }
      var o = offsetFromPhone();
      if (flying) flying.cancel();
      flying = fly.animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: 'translate(' + (o.x * 0.5) + 'px,' + (Math.min(o.y, 0) * 0.5 - 70) + 'px) scale(1.1) rotate(16deg)', offset: 0.5 },
        { transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(' + o.s + ')' }
      ], { duration: 650, easing: 'cubic-bezier(.4,0,.5,1)', fill: 'forwards' });
      flying.onfinish = function () {
        flying = null;
        if (!out) { dino.classList.add('waiting'); heroWrap.classList.remove('dino-out'); fly.getAnimations().forEach(function (an) { an.cancel(); }); }
      };
    }
    function checkJump() {
      if (jr.offsetParent === null || !heroWrap || heroWrap.offsetParent === null) return;   // no phone to jump from
      if (!out && window.scrollY > 40) jumpOut();
      else if (out && window.scrollY < 8) jumpIn();
    }

    if (layout()) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(jr);
      } else visible = true;
      if (window.scrollY > 40 || !heroWrap || heroWrap.offsetParent === null) { out = true; heroWrap && heroWrap.classList.add('dino-out'); jr.classList.add('landed'); }
      else dino.classList.add('waiting');
      window.addEventListener('scroll', function () { checkJump(); kick(); }, { passive: true });
      window.addEventListener('resize', function () { if (layout()) kick(); });
      window.addEventListener('load', function () { if (layout()) kick(); });   // images change heights
      visible = visible || true; frame();
    }
  }
})();

/* Our games bento: play the video while visible, paint the pixel card */
(function () {
  var g = document.getElementById('sxGames');
  if (!g) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var v = g.querySelector('video');
  if (v && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    }, { threshold: 0.25 }).observe(v);
  }
  // Pixel Art Club card: a little dino is drawn pixel by pixel, then cleared, on a loop
  var c = document.getElementById('sxPixel');
  if (!c) return;
  var ART = [
    '#..........#',
    '##........##',
    '###......###',
    '############',
    '############',
    '##k######k##',
    '############',
    '.####ww####.',
    '..##wwww##..',
    '...#wwww#...',
    '....####....'
  ];
  var cols = ART[0].length, rows = ART.length, cells = [], paint = [];
  var PAL = ['#6c5ce7', '#ff9a1f', '#e4572e', '#0b6bcb', '#3c9a2a'];
  c.style.gridTemplateColumns = 'repeat(' + cols + ', 17px)';
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    var i = document.createElement('i'); c.appendChild(i); cells.push(i);
    var ch = ART[y][x]; if (ch !== '.') { paint.push(i); i.style.setProperty('--pc', ch === 'k' ? '#1c1c1c' : ch === 'w' ? '#fff3e6' : '#ff9a1f'); }
  }
  var hue = 0;
  function colour() {}
  if (reduce) { paint.forEach(function (el) { el.classList.add('on'); }); return; }
  var k = 0, running = false, timer = 0;
  function step() {
    if (!running) return;
    if (k < paint.length) { paint[k++].classList.add('on'); timer = setTimeout(step, 45); }
    else timer = setTimeout(function () { paint.forEach(function (el) { el.classList.remove('on'); }); k = 0; colour(); timer = setTimeout(step, 500); }, 2200);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !running) { running = true; step(); }
      else if (!vis) { running = false; clearTimeout(timer); }
    }).observe(c);
  } else { running = true; step(); }
})();
