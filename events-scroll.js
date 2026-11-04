/* "Events across the year": the photo strip slides to the left as you scroll down the page
   (and back to the right as you scroll up), like the gallery on ayana.com/bali.
   It moves the strip's own scroll position, so on reduced-motion setups it can still be swiped. */
(() => {
  const strip = document.querySelector('.events__images');
  if (!strip) return;
  const buttons = document.querySelectorAll('.strip-controls .ctrl');
  const stepPx = () => { const img = strip.children[1] || strip.children[0]; return img ? img.getBoundingClientRect().width + 1 : 600; };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // no scroll-driven motion here: the buttons just move the strip
    buttons.forEach(b => b.addEventListener('click', () => strip.scrollBy({ left: Number(b.dataset.dir) * stepPx(), behavior: 'auto' })));
    return;
  }

  const START = 0.05;   // share of the way the section has travelled up the screen when the strip starts moving
  const END = 1.00;     // ...and when it reaches its last photo
  const TRAVEL = 0.65;  // share of the strip's full length it slides over the scroll range (lower = slower, shows fewer photos)
  const EASE = 0.06;    // smoothing: lower = a longer, softer glide behind your scroll

  let current = 0, target = 0, running = false;
  let offset = 0;       // how far the buttons have moved the strip, on top of the scroll-driven position

  // 100vw counts the scroll bar, so use the real visible width to run edge to edge exactly
  // ...and nudge it so its left edge sits exactly on the window's left edge
  const setWidth = () => {
    strip.style.setProperty('--window-width', document.documentElement.clientWidth + 'px');
    strip.style.left = '0px';
    strip.style.left = -strip.getBoundingClientRect().left + 'px';
  };
  setWidth();

  const measure = () => {
    const r = strip.getBoundingClientRect();
    // 0 when the strip's top enters the bottom of the screen, 1 when its bottom leaves the top
    const p = (innerHeight - r.top) / (innerHeight + r.height);
    const t = Math.min(1, Math.max(0, (p - START) / (END - START)));
    const maxLeft = strip.scrollWidth - strip.clientWidth;
    target = Math.min(maxLeft, Math.max(0, t * maxLeft * TRAVEL + offset));
  };

  const frame = () => {
    measure();
    current += (target - current) * EASE;
    strip.scrollLeft = current;
    if (Math.abs(target - current) > 0.5) requestAnimationFrame(frame);
    else { strip.scrollLeft = current = target; running = false; }
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  // previous / next buttons: one photo at a time (the offset is kept inside the strip's reach)
  buttons.forEach(b => b.addEventListener('click', () => {
    const maxLeft = strip.scrollWidth - strip.clientWidth;
    const base = target - offset;
    offset = Math.min(maxLeft - base, Math.max(-base, offset + Number(b.dataset.dir) * stepPx()));
    kick();
  }));
  addEventListener('tcs:strip-reset', () => { offset = 0; current = 0; kick(); });   // a new set of photos starts again at the left

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { setWidth(); kick(); });
  kick();
})();
