/* Text buttons: on hover the letters ripple up and back down in turn, starting at the first
   letters and carrying a smaller wave to the end of the text. Amplitude stays within the button. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX_LIFT = 4;      // px, for the first letters
  const MIN_LIFT = 1;      // px, for the last letters
  const STEP = 28;         // ms between letters

  // (left out, no wave: the Current / Past buttons on Team, Sponsors and Local Businesses, and "Download meeting minutes")
  // buttons that are added later (from the content sheet) call this again with their area of the page
  window.tcsWave = (root = document) => root.querySelectorAll('.btn:not(.join__send)').forEach(el => {
    if (el.closest('.past-row')) return;   // the "Download meeting minutes" buttons: no wave
    // only plain text buttons
    if (el.childNodes.length !== 1 || el.firstChild.nodeType !== Node.TEXT_NODE) return;
    const text = el.textContent.trim();
    if (!text) return;

    const chars = [...text];
    const n = chars.filter(c => c !== ' ').length;
    const wrap = document.createElement('span');
    wrap.className = 'wave';
    wrap.setAttribute('aria-hidden', 'true');

    let i = 0;
    chars.forEach(ch => {
      if (ch === ' ') { wrap.append(' '); i++; return; }
      const s = document.createElement('span');
      s.className = 'wave__char';
      s.style.setProperty('--d', `${i * STEP}ms`);
      // the lift fades from MAX_LIFT at the first letter to MIN_LIFT at the last
      const lift = MAX_LIFT - (MAX_LIFT - MIN_LIFT) * (i / Math.max(1, chars.length - 1));
      s.style.setProperty('--lift', `${lift.toFixed(2)}px`);
      s.textContent = ch;
      wrap.append(s);
      i++;
    });

    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', text);
    el.replaceChildren(wrap);
  });

  window.tcsWave();
})();
