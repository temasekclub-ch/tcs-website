/* Photo carousel — centre photo with neighbours peeking in at the edges.
   Each photo is shown through a clip-path "window"; while moving, the window
   edges bow with the drag velocity and the photo inside shifts for parallax. */
(() => {
  const root = document.querySelector('.carousel');
  if (!root) return;

  let SRCS = (root.dataset.images || '').split(',').filter(Boolean);
  let N = SRCS.length;
  const WINDOW = 0.78;      // centre window width, as a share of the carousel
  const GAP = 1;            // px between windows
  const PARALLAX = 0.12;    // photo shift relative to window movement
  const BOW = 90;           // max edge curve in px
  const EASE = 0.1;         // follow speed (0–1 per frame)
  const AUTOPLAY_MS = 5000;

  const stage = root.querySelector('.carousel__stage');
  const dotsEl = root.querySelector('.carousel__dots');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mod = (a, n) => ((a % n) + n) % n;
  let W = 0, H = 0;
  let pos = 0, target = 0, bow = 0, lastPos = 0, lastActive = 0;
  let dragging = false, dragX = 0, dragPos = 0, moved = false;
  let timer = null;

  // pool of slide elements, reused for whichever virtual indices are visible
  const slides = [];
  for (let i = 0; i < 4; i++) {
    const s = document.createElement('div');
    s.className = 'carousel__slide';
    s.appendChild(document.createElement('img')).alt = '';
    stage.appendChild(s);
    slides.push(s);
  }

  let dots = [];
  function buildDots() {
    dotsEl.textContent = '';
    dots = SRCS.map((_, i) => {
      const b = document.createElement('button');
      b.className = 'carousel__dot';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Photo ${i + 1} of ${N}`);
      b.addEventListener('click', e => {
        e.stopPropagation();
        // go the short way round
        const cur = mod(Math.round(target), N);
        let diff = i - cur;
        if (diff > N / 2) diff -= N;
        if (diff < -N / 2) diff += N;
        goTo(Math.round(target) + diff);
      });
      dotsEl.appendChild(b);
      return b;
    });
  }
  buildDots();

  function measure() {
    W = root.clientWidth;
    H = root.clientHeight;
  }

  function goTo(t) {
    target = t;
    restartAutoplay();
    loop();
  }

  function render() {
    const winW = W * WINDOW;
    const step = winW + GAP;
    const base = Math.floor(pos) - 1;
    slides.forEach((el, j) => {
      const k = base + j;              // virtual index
      const d = k - pos;               // distance from centre, in slides
      const left = (W - winW) / 2 + d * step;
      const right = left + winW;
      if (right < -BOW || left > W + BOW) { el.style.display = 'none'; return; }
      el.style.display = '';

      const img = el.firstChild;
      const src = SRCS[mod(k, N)];
      if (img.getAttribute('src') !== src) img.src = src;
      const pad = step * PARALLAX * 1.2;
      img.style.width = W + pad * 2 + 'px';
      img.style.left = -pad + 'px';
      img.style.transform = `translateX(${(-d * step * PARALLAX).toFixed(1)}px)`;

      // edges bow in the direction of travel
      const pts = [], steps = 12;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        pts.push(`${(left + bow * Math.sin(Math.PI * t)).toFixed(1)}px ${(t * H).toFixed(1)}px`);
      }
      for (let s = steps; s >= 0; s--) {
        const t = s / steps;
        pts.push(`${(right + bow * Math.sin(Math.PI * t)).toFixed(1)}px ${(t * H).toFixed(1)}px`);
      }
      el.style.clipPath = `polygon(${pts.join(',')})`;
      el.style.zIndex = 10 - Math.round(Math.abs(d) * 2);
    });

    const active = mod(Math.round(pos), N);
    dots.forEach((b, i) => b.setAttribute('aria-selected', i === active));
    if (active !== lastActive) {       // tell the page which photo is now in front (the caption listens)
      lastActive = active;
      root.dispatchEvent(new CustomEvent('carousel:change', { detail: { index: active } }));
    }
  }

  let raf = 0;
  function loop() {
    if (raf) return;
    raf = requestAnimationFrame(function frame() {
      raf = 0;
      if (!dragging) pos += (target - pos) * (reduced ? 1 : EASE);
      const vel = pos - lastPos;
      lastPos = pos;
      const wantBow = reduced ? 0 : Math.max(-BOW, Math.min(BOW, -vel * 900));
      bow += (wantBow - bow) * 0.2;
      render();
      const settled = !dragging && Math.abs(target - pos) < 0.0005 && Math.abs(bow) < 0.3;
      if (settled) { pos = target; bow = 0; render(); return; }
      raf = requestAnimationFrame(frame);
    });
  }

  // drag / swipe
  root.addEventListener('pointerdown', e => {
    if (e.target.closest('.carousel__dots, .carousel__controls')) return;
    dragging = true; moved = false;
    dragX = e.clientX; dragPos = pos;
    root.classList.add('is-dragging');
    root.setPointerCapture(e.pointerId);
    stopAutoplay();
    loop();
  });
  root.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 4) moved = true;
    pos = dragPos - dx / (W * WINDOW + GAP);
    target = pos;
  });
  const end = e => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    if (!moved) {
      // click on a peeking neighbour moves to it
      const x = e.clientX - root.getBoundingClientRect().left;
      const edge = (W - W * WINDOW) / 2;
      if (x < edge) target = Math.round(pos) - 1;
      else if (x > W - edge) target = Math.round(pos) + 1;
      else target = Math.round(pos);
    } else {
      // settle on the nearest photo; a flick in one direction nudges it that way
      const flick = Math.max(-0.4, Math.min(0.4, -bow / BOW));
      target = Math.round(pos + flick);
    }
    restartAutoplay();
    loop();
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  // previous / next buttons (centred at the bottom of the photo)
  root.querySelectorAll('.carousel__controls .ctrl').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); goTo(Math.round(target) + Number(b.dataset.dir)); });
  });

  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') goTo(Math.round(target) + 1);
    if (e.key === 'ArrowLeft') goTo(Math.round(target) - 1);
  });

  function stopAutoplay() { clearInterval(timer); timer = null; }
  function restartAutoplay() {
    stopAutoplay();
    if (reduced || N < 2) return;
    timer = setInterval(() => { target = Math.round(target) + 1; loop(); }, AUTOPLAY_MS);
  }
  root.addEventListener('mouseenter', stopAutoplay);
  root.addEventListener('mouseleave', restartAutoplay);

  /* the content sheet can replace the photos (and their captions) after the page has loaded */
  function setSlides(items) {
    if (!items || !items.length) return;
    SRCS = items.map(item => item.src);
    N = SRCS.length;
    root.dataset.captions = JSON.stringify(items.map(item => ({ title: item.title, date: item.date })));
    pos = target = lastPos = 0; lastActive = 0; bow = 0;
    slides.forEach(s => s.firstChild.removeAttribute('src'));
    buildDots();
    render();
    restartAutoplay();
    root.dispatchEvent(new CustomEvent('carousel:slides'));
  }
  window.TCS_carousel = { setSlides };

  new ResizeObserver(() => { measure(); loop(); }).observe(root);
  measure();
  render();
  restartAutoplay();
})();
