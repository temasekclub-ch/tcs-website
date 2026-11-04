/* "Events across the year": the event chips swap the photo strip.
   The photos come from the content sheet (window.TCS_events.setGroups); the groups written into the
   page (a first group in the strip itself, the others in <template> elements) are used until then. */
(() => {
  const strip = document.querySelector('.events__images');
  const chipsBox = document.querySelector('.events .chips');
  if (!strip || !chipsBox) return;

  const sets = {};   // chip key -> list of photo addresses
  const srcsOf = nodes => [...nodes].map(img => img.getAttribute('src'));

  const first = chipsBox.querySelector('.chip[data-event]');
  if (first) sets[first.dataset.event] = srcsOf(strip.querySelectorAll('img'));
  document.querySelectorAll('template[id^="photos-"]').forEach(t => {
    sets[t.id.replace('photos-', '')] = srcsOf(t.content.querySelectorAll('img'));
  });

  const MISSING = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="658" height="454"><rect width="658" height="454" fill="#e9e9ea"/></svg>');
  function showPhotos(srcs) {
    strip.textContent = '';
    srcs.forEach((src, i) => {
      const img = document.createElement('img');
      img.className = i === 0 ? 'events__img-portrait' : 'events__img-wide';
      img.alt = '';
      img.decoding = 'async';
      img.src = src;
      img.addEventListener('error', () => { if (img.src !== MISSING) img.src = MISSING; });
      strip.appendChild(img);
    });
    strip.scrollLeft = 0;
    dispatchEvent(new Event('tcs:strip-reset'));
    dispatchEvent(new Event('scroll'));   // lets events-scroll.js re-measure the new strip
  }

  function select(key) {
    chipsBox.querySelectorAll('.chip[data-event]').forEach(c => {
      const on = c.dataset.event === key;
      c.classList.toggle('chip--active', on);
      c.setAttribute('aria-selected', on);
    });
    showPhotos(sets[key] || []);
  }

  chipsBox.addEventListener('click', e => {
    const chip = e.target.closest('.chip[data-event]');
    if (chip) select(chip.dataset.event);
  });

  /* replace the chips and photos with the groups from the sheet */
  window.TCS_events = {
    setGroups(groups) {
      if (!groups || !groups.length) return;
      chipsBox.querySelectorAll('.chip[data-event]').forEach(c => c.remove());
      const more = chipsBox.querySelector('.chips__more');
      Object.keys(sets).forEach(k => delete sets[k]);
      groups.forEach(g => {
        sets[g.key] = g.photos;
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.type = 'button';
        chip.setAttribute('role', 'tab');
        chip.dataset.event = g.key;
        chip.textContent = g.label + (g.emoji ? '\u00a0 ' + g.emoji : '');
        chipsBox.insertBefore(chip, more);
      });
      select(groups[0].key);
    },
  };
})();
