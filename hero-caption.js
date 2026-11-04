/* Hero caption under the photo carousel: when the photo changes, the caption changes with it.
   The old caption goes at once; the new one arrives with the same letter-by-letter fade as the
   contact icon tooltips. */
(() => {
  const carousel = document.querySelector('.carousel');
  const caption = document.querySelector('.hero__photo-caption');
  if (!carousel || !caption || !carousel.dataset.captions) return;

  let captions = JSON.parse(carousel.dataset.captions);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // splits text into word and letter spans; returns how many characters it made
  const letters = (parent, text, startIndex, bold) => {
    let i = startIndex;
    const holder = bold ? document.createElement('strong') : parent;
    text.split(' ').forEach((word, w) => {
      if (!word) return;
      if (w) holder.append(' ');
      const wordEl = document.createElement('span');
      wordEl.className = 'cap__word';
      [...word].forEach(ch => {
        const c = document.createElement('span');
        c.className = 'cap__char';
        c.style.setProperty('--i', i++);
        c.textContent = ch;
        wordEl.append(c);
      });
      i++;
      holder.append(wordEl);
    });
    if (bold) parent.append(holder);
    return i;
  };

  const build = index => {
    const { title, date } = captions[index];
    const visible = document.createElement('span');
    visible.className = 'cap';
    visible.setAttribute('aria-hidden', 'true');
    let n = letters(visible, title, 0, true);
    if (date) { visible.append(' '); n = letters(visible, date, n + 1, false); }
    visible.style.setProperty('--n', n);
    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = date ? `${title} ${date}` : title;
    caption.replaceChildren(visible, spoken);
    return n;
  };

  let current = 0;
  build(0);

  // the old caption disappears at once; the new one's letters then fade in one after another
  const show = index => {
    current = index;
    if (reduced) { build(index); return; }
    caption.classList.add('is-out');                      // new letters start hidden (no transition)
    build(index);
    void caption.offsetWidth;                             // commit the hidden state
    requestAnimationFrame(() => caption.classList.remove('is-out'));
  };

  carousel.addEventListener('carousel:change', e => {
    if (e.detail.index !== current && captions[e.detail.index]) show(e.detail.index);
  });
  // new photos (and captions) from the content sheet: start again from the first caption
  carousel.addEventListener('carousel:slides', () => {
    try { captions = JSON.parse(carousel.dataset.captions); } catch (err) { return; }
    current = 0;
    if (captions[0]) build(0);
  });
})();
