/* Text that turns from light grey to black, word by word, as you scroll (like "The Spirit of the West" on
   stanford.edu/about). Each GROUP below is one sweep: the words inside it turn black in reading order, from the
   first word to the last, as its block scrolls up the screen, and everything is black by the time the visitor
   reaches the bottom of the page. Once a word has turned black it stays black, even when the visitor scrolls back up. Without JavaScript, or with reduced motion, the text is simply black. */
(() => {
  // page (body data-page) -> groups. `box` is the block the sweep follows; `text` picks the elements whose words change;
  // `grey` (optional) is the starting colour, for text on a coloured card; `notOnPhone` leaves the text black on phones.
  const GROUPS = {
    about: [
      { box: '.about-panel', text: '.about-card h2, .about-card h4, .about-card p', notOnPhone: true }   // Vision, Mission, Strategy (plain black text on phones)
    ],
    life: [
      { box: '.info__list:not([hidden])', text: '.info__list:not([hidden]) li', grey: [170, 163, 112], notOnPhone: true }   // the topic that is showing; a yellow-tinted grey, to sit well on the yellow card (plain black text on phones)
    ]
  };
  const GREY = [178, 178, 178];     // the starting grey on a white background
  const START = 0.85;     // a sweep starts when the top of its block reaches this share of the screen height...
  const END = 0.45;       // ...and is complete when the bottom of the block reaches this share (or at the very bottom of the page, if that comes first)
  const FADE = 4;         // how many words are part-way between grey and black at the same time
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 960px)');

  let active = [];        // { def, words: [span, ...] }
  const furthest = new Map();   // block -> the furthest the sweep has got, so scrolling back up leaves the text black
  let queued = false;

  const split = root => {
    const words = [];
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'reveal-word';
            span.textContent = part;
            frag.appendChild(span);
            words.push(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains('reveal-word') && !child.classList.contains('pillar__tip')) {
          walk(child);
        }
      });
    };
    walk(root);
    return words;
  };

  const paint = () => {
    queued = false;
    const vh = innerHeight;
    const maxY = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    active.forEach(({ def, words }) => {
      const box = document.querySelector(def.box);
      if (!box || !box.isConnected || !words.length) return;
      const r = box.getBoundingClientRect();
      // scroll positions (page offsets) where the sweep starts and where it is complete
      const top = r.top + scrollY;
      const startY = top - vh * START;
      const endY = Math.max(startY + 1, Math.min(top + r.height - vh * END, maxY));
      // words never go back to grey: a sweep only moves forward, and is remembered per block (and per topic)
      const key = def.box + '|' + (box.dataset.topic || '');
      const progress = Math.max(furthest.get(key) || 0, Math.max(0, Math.min(1, (scrollY - startY) / (endY - startY))));
      furthest.set(key, progress);
      const n = words.length;
      words.forEach((w, i) => {
        const t = Math.max(0, Math.min(1, (progress * (n + FADE) - i) / FADE));
        const k = 1 - t, g = def.grey || GREY;
        w.style.color = `rgb(${Math.round(g[0] * k)},${Math.round(g[1] * k)},${Math.round(g[2] * k)})`;
      });
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };

  const refresh = () => {
    // undo a previous split (the text may have been replaced by the content sheet, or another topic opened) and start again
    document.querySelectorAll('.reveal-word').forEach(w => w.replaceWith(w.textContent));   // keeps bold text and links intact
    document.body.normalize();
    active = [];
    const defs = GROUPS[document.body.dataset.page];
    if (reduced.matches || !defs) return;
    defs.forEach(def => {
      if (def.notOnPhone && phone.matches) return;
      const words = [];
      document.querySelectorAll(def.text).forEach(el => words.push(...split(el)));
      if (words.length) active.push({ def, words });
    });
    paint();
  };

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  // Life in Switzerland: a new topic starts its own sweep (the topic buttons switch the list in life.js, which runs first)
  document.addEventListener('click', e => { if (e.target.closest('.info .chip')) setTimeout(refresh, 0); });
  reduced.addEventListener('change', refresh);
  phone.addEventListener('change', refresh);
  window.TCS_reveal = { refresh };
  refresh();
})();
