/* Top menu: hover (or focus / tap) a trigger and the header expands into a panel of options */
(() => {
  const header = document.querySelector('.header');
  if (!header) return;
  const triggers = header.querySelectorAll('.nav__trigger');
  const links = header.querySelectorAll('.nav__link');
  let closeTimer = null;

  const mobile = matchMedia('(max-width: 960px)');
  const open = name => {
    if (mobile.matches) return;     // on small screens every option is already listed in the sheet
    clearTimeout(closeTimer);
    // line the options up under the parent item's text (option padding is 16px, parent's 12px)
    const trigger = header.querySelector(`.nav__trigger[data-menu="${name}"]`);
    const menu = header.querySelector(`#menu-${name}`);
    if (trigger && menu) {
      const x = trigger.getBoundingClientRect().left + 12 - 16 - menu.getBoundingClientRect().left;
      menu.style.setProperty('--menu-x', `${Math.max(0, x)}px`);
    }
    header.dataset.open = name;
    triggers.forEach(t => t.setAttribute('aria-expanded', t.dataset.menu === name));
  };
  const close = () => {
    clearTimeout(closeTimer);
    delete header.dataset.open;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
  };
  // burger button (small screens): opens the full-screen sheet
  const toggle = header.querySelector('.nav__toggle');
  const sheet = header.querySelector('.header__sheet');
  const setSheet = on => {
    if (on) header.dataset.mobile = 'open'; else delete header.dataset.mobile;
    if (toggle) toggle.setAttribute('aria-expanded', on);
  };
  const closeSheet = () => setSheet(false);
  if (toggle) toggle.addEventListener('click', () => setSheet(header.dataset.mobile !== 'open'));
  if (sheet) sheet.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    closeSheet();
    // "Contact us" on a page that has the contact form: close the menu first, then glide down to the form
    // (pages without a form link to index.html#join instead, so the browser opens the home page at its form)
    if (link.getAttribute('href') === '#join') {
      const join = document.getElementById('join');
      if (join) { e.preventDefault(); requestAnimationFrame(() => join.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
    }
  });
  mobile.addEventListener('change', closeSheet);

  const closeSoon = () => { clearTimeout(closeTimer); closeTimer = setTimeout(close, 150); };

  links.forEach(link => link.addEventListener('mouseenter', () => {
    link.classList.contains('nav__trigger') ? open(link.dataset.menu) : close();
  }));
  triggers.forEach(t => {
    t.addEventListener('focus', () => open(t.dataset.menu));
    t.addEventListener('click', e => {
      if (mobile.matches) return;   // in the phone menu "About Us" is an ordinary link: tapping it goes to the page
      const isOpen = header.dataset.open === t.dataset.menu;
      const touch = matchMedia('(hover: none)').matches;
      // buttons toggle; links only intercept the first tap on touch screens
      if (t.tagName === 'BUTTON') { isOpen && !touch ? close() : open(t.dataset.menu); }
      else if (touch && !isOpen) { e.preventDefault(); open(t.dataset.menu); }
    });
  });
  header.addEventListener('mouseleave', closeSoon);
  header.addEventListener('mouseenter', () => clearTimeout(closeTimer));
  header.addEventListener('focusout', e => { if (!header.contains(e.relatedTarget)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); closeSheet(); } });
  document.addEventListener('pointerdown', e => { if (!header.contains(e.target)) close(); });
})();

/* Contact icon tooltips: each letter fades in one after another, like the logo hover on billysweeney.com */
(() => {
  document.querySelectorAll('.socials .tip').forEach(tip => {
    const text = tip.textContent.trim();
    const total = [...text].length;
    let i = 0;
    const visible = document.createElement('span');
    visible.className = 'tip__text';
    visible.setAttribute('aria-hidden', 'true');
    visible.style.setProperty('--n', total);
    text.split(' ').forEach((word, w) => {
      if (w) visible.append(' ');
      const wordEl = document.createElement('span');
      wordEl.className = 'tip__word';
      [...word].forEach(ch => {
        const c = document.createElement('span');
        c.className = 'tip__char';
        c.style.setProperty('--i', i++);
        c.textContent = ch;
        wordEl.append(c);
      });
      i++; // the space also takes a step so the timing stays even
      visible.append(wordEl);
    });
    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = text;
    tip.replaceChildren(visible, spoken);
  });
})();

/* On a phone every move to another page starts at the top (a link to a section, such as #join, is left alone) */
(() => {
  const phone = matchMedia('(max-width: 960px)');
  if ('scrollRestoration' in history) history.scrollRestoration = phone.matches ? 'manual' : 'auto';
  const toTop = () => {
    if (phone.matches && !location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  toTop();
  addEventListener('pageshow', toTop);   // also when the browser brings a page back from its back/forward cache
})();


/* Singapore and Switzerland flags beside the burger: as the page is scrolled down they hop towards each other, once per
   scroll, and meet at the Join us section. Once they have met they stay together and scoot over to sit beside the burger. The hops are timed
   animations that are only *started* by the scroll position, so a stuttering touch scroll cannot make them jitter. */
(() => {
  const hop = document.querySelector('.hop');
  if (!hop) return;
  const phone = matchMedia('(max-width: 960px)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const GAP = 3;            // px left between the flags when they meet
  const STEPS = 6;          // hops from far apart to meeting
  const HOP_MS = 360;       // duration of one hop
  const HOP_HEIGHT = 4;     // px
  const sg = hop.querySelector('.hop__sg'), ch = hop.querySelector('.hop__ch');
  const SETTLE_MS = 160;    // a scroll is 'over' this long after the last scroll event
  let lastScroll = 0, settleTimer = null;
  let step = 0, from = 0, to = 0, t0 = 0, running = false;
  let x = 0;                // current sideways distance of each flag
  const KEY = 'tcs-flag-step';
  const saved = () => { try { return Math.max(0, Math.min(STEPS, parseInt(sessionStorage.getItem(KEY), 10) || 0)); } catch (e) { return 0; } };
  const remember = () => { try { sessionStorage.setItem(KEY, String(step)); } catch (e) { /* private mode: the flags just start apart on each page */ } };

  const reach = () => (hop.clientWidth - 2 * sg.offsetLeft - sg.offsetWidth - ch.offsetWidth - GAP) / 2;
  const stepFor = () => {
    if (step === STEPS) return STEPS;     // once they have met they stay together, even when the visitor scrolls back up
    // the flags only ever move forward, and they keep their place when another page opens (see `restore` below)
    const max = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    const join = document.getElementById('join');
    const end = join ? Math.min(max, Math.max(1, join.getBoundingClientRect().top + scrollY - 118)) : max;
    const p = Math.max(0, Math.min(1, scrollY / end)) * STEPS;
    // a little hysteresis: only change step once the scroll is clearly past the halfway point to the next one
    return Math.abs(p - step) > 0.65 ? Math.max(step, Math.min(STEPS, Math.round(p))) : step;
  };
  // after meeting, the pair slides together to the right, up against the burger button (the whole track moves)
  const scoot = () => {
    hop.style.setProperty('--hop-slide', `${(reach() + 4).toFixed(1)}px`);    // leaves 16px between the Swiss flag and the burger
    hop.classList.add('is-met');
  };
  const apply = (px, lift) => {
    hop.style.setProperty('--hop-x', `${px.toFixed(2)}px`);
    hop.style.setProperty('--hop-y', `${(-lift).toFixed(2)}px`);
  };
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

  const frame = now => {
    const u = Math.min(1, (now - t0) / HOP_MS);
    x = from + (to - from) * ease(u);
    apply(x, still.matches ? 0 : Math.sin(Math.PI * u) * HOP_HEIGHT);
    if (u < 1) { requestAnimationFrame(frame); return; }
    running = false;
    if (step === STEPS) setTimeout(scoot, 140);   // a beat after landing, then scoot
    // one hop per scroll: if the finger is still scrolling the next hop waits for the next scroll;
    // once the scroll has stopped, a last hop (if needed) brings the flags to where the page position says they belong
    if (performance.now() - lastScroll > SETTLE_MS) check();
  };
  const check = () => {
    if (!phone.matches || running) return;
    const next = stepFor();
    if (next === step) { apply(x = next / STEPS * reach(), 0); if (step === STEPS) scoot(); return; }
    step = next; remember();
    from = x; to = step / STEPS * reach();
    t0 = performance.now(); running = true;
    requestAnimationFrame(frame);
  };
  addEventListener('scroll', () => {
    lastScroll = performance.now();
    check();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(check, SETTLE_MS + 20);
  }, { passive: true });
  addEventListener('resize', () => { if (!running) { step = Math.max(step, stepFor()); apply(x = step / STEPS * reach(), 0); if (step === STEPS) scoot(); } });
  addEventListener('load', () => { step = Math.max(step, stepFor()); apply(x = step / STEPS * reach(), 0); remember(); if (step === STEPS) scoot(); });
  // a new page starts the flags where the last page left them (no animation), then the scroll position can only move them on
  const restore = () => {
    step = Math.max(saved(), 0);
    apply(x = step / STEPS * reach(), 0);
    if (step === STEPS) {
      hop.style.transition = 'none';
      scoot();
      hop.getBoundingClientRect();            // apply the position now, so it does not slide in
      requestAnimationFrame(() => { hop.style.transition = ''; });
    }
    step = Math.max(step, stepFor());
    if (step !== saved()) { apply(x = step / STEPS * reach(), 0); remember(); if (step === STEPS) scoot(); }
  };
  restore();
})();


/* Loading state on phones: when a link to another page is tapped, a soft veil with a small ring spinner appears
   (after a short delay, so quick page changes do not flash). The new page replaces it as soon as it opens. */
(() => {
  const phone = matchMedia('(max-width: 960px)');
  const loader = document.createElement('div');
  loader.className = 'page-loader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML = '<span class="page-loader__ring"></span>';
  document.body.appendChild(loader);
  let timer = null;
  const hide = () => { clearTimeout(timer); loader.classList.remove('is-on'); document.documentElement.removeAttribute('aria-busy'); };
  const show = () => { document.documentElement.setAttribute('aria-busy', 'true'); timer = setTimeout(() => loader.classList.add('is-on'), 120); };

  document.addEventListener('click', e => {
    if (!phone.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;   // same page (a jump to a section)
    show();
  });
  addEventListener('pageshow', hide);       // also when the browser restores a page from its back/forward cache
})();
