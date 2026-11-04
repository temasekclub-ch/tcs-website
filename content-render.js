/* Content renderers: turn the sheet's content (window.TCS) into the cards, lists and texts on each page.
   Every renderer looks for its own area on the page and does nothing if that area is not there.
   Text from the sheet is always inserted as plain text (never as HTML). */
(function () {
  var TCS = window.TCS;
  if (!TCS) return;
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="238" viewBox="0 0 240 238"><rect width="240" height="238" fill="#e9e9ea"/>' +
    '<g fill="none" stroke="#9a9a9c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(96,88)"><rect width="48" height="38" rx="5"/><circle cx="15" cy="13" r="4"/><path d="M4 33l14-12 9 7 7-5 12 10"/></g></svg>');

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return /^https?:/i.test(u) ? u : '';
    return u;
  }
  /* Google Drive photos are resized by adding =w<width> */
  function imgUrl(u, width) {
    u = safeUrl(u);
    return /^https:\/\/lh3\.googleusercontent\.com\/d\//.test(u) ? u + '=w' + (width || 800) : u;
  }
  window.TCS_imgUrl = imgUrl;

  function photo(src, cls, width) {
    var img = el('img', cls);
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    var url = imgUrl(src, width);
    img.src = url || PLACEHOLDER;
    img.addEventListener('error', function () { if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER; });
    return img;
  }

  /* line breaks become <br>; **word** becomes bold */
  function rich(node, text) {
    clear(node);
    String(text || '').replace(/\r/g, '').split('**').forEach(function (seg, i) {
      var holder = i % 2 ? node.appendChild(el('strong')) : node;
      seg.split('\n').forEach(function (line, j) {
        if (j) holder.appendChild(document.createElement('br'));
        if (line) holder.appendChild(document.createTextNode(line));
      });
    });
    return node;
  }
  function lines(node, text) {
    clear(node);
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (line, j) {
      if (j) node.appendChild(document.createElement('br'));
      node.appendChild(document.createTextNode(line));
    });
    return node;
  }
  function paragraphs(text) {
    return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
  }
  function tagLine(tag, emoji) { return (tag || '') + (emoji ? '  ' + emoji : ''); }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'; }
  function afterRender(root) { if (window.tcsWave) window.tcsWave(root || document); }
  function externalLink(a, href) {
    a.href = href;
    if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  /* ---------- renderers ---------- */
  var R = {};

  R.team = function (d) {
    fillPeople(d.team, 'team', function (p) {
      var card = el('article', 'listing-card listing-card--polaroid');
      card.appendChild(photo(p.photo, 'listing-card__img', 640));
      card.appendChild(el('h2', 'listing-card__name', p.name));
      card.appendChild(lines(el('p'), p.role));
      return card;
    }, { Current: 'No current team members listed yet.', Past: 'No past team members listed yet.' });
  };

  R.sponsors = function (d) {
    fillPeople(d.sponsors, 'sponsors', function (p) {
      var card = el('article', 'listing-card listing-card--flush-top');
      card.appendChild(photo(p.logo, 'listing-card__img', 640));
      card.appendChild(el('h2', 'listing-card__name', p.name));
      card.appendChild(el('p', '', p.description));
      return card;
    }, { Current: 'No current sponsors listed yet.', Past: 'No past sponsors listed yet.' });
  };

  /* Team and Sponsors share a page layout: a Current grid and a Past grid */
  function fillPeople(rows, page, build, emptyText) {
    var current = $('.listing__grid[data-tab="current"]');
    var past = $('.listing__grid[data-tab="past"]');
    if (!rows || !current || !past || document.body.dataset.page !== page) return;
    [['Current', current], ['Past', past]].forEach(function (pair) {
      var list = rows.filter(function (r) { return r.status === pair[0]; });
      clear(pair[1]);
      if (!list.length) pair[1].appendChild(el('p', 'listing__empty', emptyText[pair[0]]));
      list.forEach(function (r) { pair[1].appendChild(build(r)); });
    });
    afterRender();
  }

  R.businesses = function (d) {
    var grid = $('.listing__grid');
    if (!d.businesses || !grid || document.body.dataset.page !== 'local') return;
    clear(grid);
    if (!d.businesses.length) grid.appendChild(el('p', 'listing__empty', 'No local businesses listed yet.'));
    var icons = [['instagram', 'Instagram', 'assets/social-instagram-grey.svg'], ['facebook', 'Facebook', 'assets/social-facebook-grey.svg'],
                 ['linkedin', 'LinkedIn', 'assets/social-linkedin-grey.svg'], ['whatsapp', 'WhatsApp', 'assets/social-whatsapp-grey.svg'],
                 ['website', 'Website', 'assets/social-link-grey.svg']];
    d.businesses.forEach(function (b) {
      var card = el('article', 'listing-card');
      card.appendChild(photo(b.logo, 'listing-card__img', 640));
      card.appendChild(el('h2', 'listing-card__name', b.name));
      card.appendChild(el('p', '', b.category));
      var ul = el('ul', 'socials socials--grey');
      icons.forEach(function (ic) {
        var href = safeUrl(b[ic[0]]);
        if (!href) return;
        var li = el('li'), a = externalLink(el('a'), href);
        a.setAttribute('aria-label', ic[1] + ' (' + b.name + ')');
        var img = el('img'); img.src = ic[2]; img.alt = '';
        a.appendChild(img); li.appendChild(a); ul.appendChild(li);
      });
      if (ul.children.length) card.appendChild(ul);
      grid.appendChild(card);
    });
  };

  R.events = function (d) {
    var list = $('.upcoming__list');
    if (!d.events || !list) return;
    clear(list);
    if (!d.events.length) list.appendChild(el('p', 'upcoming__empty', 'New events will be announced here soon.'));
    d.events.forEach(function (e) {
      var card = el('article', 'event-card');
      var main = el('div', 'event-card__main');
      var pin = el('span', 'event-card__pin', '📌'); pin.setAttribute('aria-hidden', 'true');
      main.appendChild(pin);
      var row = el('div', 'event-card__row');
      row.appendChild(el('p', 'event-card__date', e.date));
      var text = el('div', 'event-card__text');
      text.appendChild(el('h3', 'event-card__title', e.title));
      text.appendChild(el('p', '', tagLine(e.tag, e.emoji)));
      row.appendChild(text); main.appendChild(row); card.appendChild(main);
      var meta = el('ul', 'event-card__meta');
      [[e.location, 'assets/icon-location.svg'], [e.details, 'assets/icon-info.svg']].forEach(function (m) {
        if (!m[0]) return;
        var li = el('li'), img = el('img'); img.src = m[1]; img.alt = '';
        li.appendChild(img); li.appendChild(el('span', '', m[0])); meta.appendChild(li);
      });
      if (meta.children.length) card.appendChild(meta);
      list.appendChild(card);
    });
  };

  R.pastEvents = function (d) {
    var panel = $('.past__panel');
    var years = $('.years'), lists = $('.past__lists');
    if (!d.pastEvents || !panel || !years || !lists) return;
    clear(years); clear(lists);
    var order = [];
    d.pastEvents.forEach(function (e) { var y = e.year || 'Other'; if (order.indexOf(y) < 0) order.push(y); });
    order.sort(function (a, b) { return (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0); });
    if (!order.length) { lists.appendChild(el('p', 'past__empty', 'Past events will be listed here.')); return; }
    order.forEach(function (y, i) {
      var b = el('button', 'year', y);
      b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.year = y;
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      years.appendChild(b);
      var ul = el('ul', 'past__list'); ul.dataset.year = y; ul.setAttribute('role', 'tabpanel');
      if (i) ul.hidden = true;
      d.pastEvents.filter(function (e) { return (e.year || 'Other') === y; }).forEach(function (e) {
        var li = el('li', 'past-row');
        li.appendChild(el('p', 'past-row__date', e.date));
        var text = el('div', 'past-row__text');
        text.appendChild(el('h3', 'past-row__title', e.title));
        text.appendChild(el('p', '', tagLine(e.tag, e.emoji)));
        li.appendChild(text);
        var href = safeUrl(e.minutes);
        var words = (e.minutesLabel || '').trim();
        if (href && words) { var a = externalLink(el('a', 'btn', words), href); li.appendChild(a); }   // no button text, no button
        ul.appendChild(li);
      });
      lists.appendChild(ul);
    });
    afterRender(panel);
  };

  R.agm = function (d) {
    var list = $('.doc-list');
    if (!d.agm || !list) return;
    clear(list);
    if (!d.agm.length) list.appendChild(el('p', 'doc-list__empty', 'No documents have been added yet.'));
    d.agm.forEach(function (doc) {
      var card = el('article', 'doc-card');
      card.appendChild(el('h2', '', doc.title));
      var href = safeUrl(doc.file);
      var row = href ? externalLink(el('a', 'doc-card__row'), href) : el('div', 'doc-card__row');
      row.appendChild(el('span', '', doc.date || (href ? 'Download' : '')));
      if (href) { var img = el('img'); img.src = 'assets/icon-download.svg'; img.alt = 'Download'; row.appendChild(img); }
      if (doc.date || href) card.appendChild(row);
      list.appendChild(card);
    });
  };

  R.about = function (d) {
    if (!d.about || document.body.dataset.page !== 'about') return;
    var intro = $('.about-intro__text');
    if (intro) {
      clear(intro);
      d.about.filter(function (r) { return r.section === 'Intro'; }).forEach(function (r) { intro.appendChild(rich(el('p'), r.text)); });
    }
    ['Vision', 'Mission'].forEach(function (name) {
      var card = $('[data-about="' + name.toLowerCase() + '"]');
      if (!card) return;
      var rows = d.about.filter(function (r) { return r.section === name; });
      $$('p', card).forEach(function (p) { p.remove(); });
      rows.forEach(function (r) { card.appendChild(rich(el('p'), r.text)); });
    });
    var strat = $('[data-about="strategy"]');
    if (strat) {
      $$('.strategy__item', strat).forEach(function (n) { n.remove(); });
      d.about.filter(function (r) { return r.section === 'Strategy'; }).forEach(function (r) {
        var item = el('div', 'strategy__item');
        if (r.heading) item.appendChild(el('h4', '', r.heading));
        item.appendChild(rich(el('p'), r.text));
        strat.appendChild(item);
      });
    }
    if (window.TCS_pillars) window.TCS_pillars.apply();      // the four pillars get their hover definitions
    if (window.TCS_reveal) window.TCS_reveal.refresh();   // the grey-to-black scroll effect works on the new text
  };

  R.lifeTips = function (d) {
    var panel = $('.info__panel');
    if (!d.lifeTips || !panel || document.body.dataset.page !== 'life') return;
    var intro = $('.life-intro__text');
    var introRows = d.lifeTips.filter(function (r) { return /^intro$/i.test(r.topic); });
    if (intro && introRows.length) rich(intro, introRows.map(function (r) { return r.text; }).join('\n\n'));
    var topics = [];
    d.lifeTips.forEach(function (r) { if (!/^intro$/i.test(r.topic) && topics.indexOf(r.topic) < 0) topics.push(r.topic); });
    clear(panel);
    if (!topics.length) { panel.appendChild(el('p', 'info__list info__list--empty', 'Tips are coming soon.')); return; }
    var chips = el('div', 'chips'); chips.setAttribute('role', 'tablist'); chips.setAttribute('aria-label', 'Topics');
    panel.appendChild(chips);
    topics.forEach(function (t, i) {
      var chip = el('button', 'chip' + (i === 0 ? ' chip--active' : ''), t);
      chip.type = 'button'; chip.setAttribute('role', 'tab'); chip.dataset.topic = slug(t);
      chip.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      chips.appendChild(chip);
      var ul = el('ul', 'info__list'); ul.dataset.topic = slug(t); ul.setAttribute('role', 'tabpanel');
      if (i) ul.hidden = true;
      d.lifeTips.filter(function (r) { return r.topic === t; }).forEach(function (r) {
        var li = el('li');
        if (r.heading) { li.appendChild(el('strong', '', r.heading)); li.appendChild(document.createElement('br')); }
        var holder = el('span'); rich(holder, r.text);
        while (holder.firstChild) li.appendChild(holder.firstChild);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    });
    if (window.TCS_reveal) window.TCS_reveal.refresh();   // the grey-to-black scroll effect works on the new text
  };

  R.partners = function (d) {
    var card = $('.partners__card');
    if (!d.partners || !card) return;
    var quote = d.partners.filter(function (r) { return r.kind === 'Quote'; })[0];
    var links = d.partners.filter(function (r) { return r.kind === 'Link'; });
    var qBox = $('.partners__quote', card);
    if (qBox) {
      qBox.hidden = !quote;
      if (quote) {
        var av = $('.partners__avatar', qBox);
        if (av && quote.photo) { av.src = imgUrl(quote.photo, 480); av.alt = quote.label; }
        var body = $('.partners__body', qBox);
        if (body) { clear(body); paragraphs(quote.text).forEach(function (p) { body.appendChild(el('p', '', p)); }); }
        var name = $('.partners__name', qBox), role = $('.partners__role', qBox);
        if (name) name.textContent = quote.label;
        if (role) lines(role, quote.subtitle);
      }
    }
    var ul = $('.partners__links', card);
    if (ul) {
      clear(ul);
      links.forEach(function (l) {
        var href = safeUrl(l.url);
        if (!href) return;
        var li = el('li');
        li.appendChild(externalLink(el('a', '', l.label), href));
        var arrow = el('span', 'arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
        li.appendChild(arrow);
        ul.appendChild(li);
      });
    }
  };

  R.settings = function (d) {
    var s = d.settings || {};
    ['instagram', 'facebook', 'linkedin'].forEach(function (k) {
      var href = safeUrl(s[k]);
      if (!href) return;
      $$('.header__right .socials a[aria-label="' + cap(k) + '"], .sheet__socials a[aria-label="' + cap(k) + '"]').forEach(function (a) { a.href = href; });
    });
    var p1 = $('.life-photos__a'), p2 = $('.life-photos__b img');
    if (p1 && s.life_photo_1) p1.src = imgUrl(s.life_photo_1, 1600);
    if (p2 && s.life_photo_2) p2.src = imgUrl(s.life_photo_2, 1600);
    var key = { home: 'join_home', events: 'join_events', team: 'join_team', sponsors: 'join_sponsors', life: 'join_life', local: 'join_local' }[document.body.dataset.page];
    var ideas = $('.join__ideas');
    if (key && s[key] && ideas) rich(ideas, s[key]);
  };
  function cap(k) { return k === 'linkedin' ? 'LinkedIn' : k === 'whatsapp' ? 'WhatsApp' : k.charAt(0).toUpperCase() + k.slice(1); }

  /* the home page carousel, caption and event photo strip have their own scripts; hand them the data */
  R.carousel = function (d) {
    if (d.carousel && d.carousel.length && window.TCS_carousel) {
      window.TCS_carousel.setSlides(d.carousel.map(function (r) {
        return { src: imgUrl(r.photo, 1600), title: r.title || '', date: r.date ? 'on ' + r.date : '' };
      }));
    }
  };
  R.eventPhotos = function (d) {
    if (!d.eventPhotos || !d.eventPhotos.length || !window.TCS_events) return;
    var groups = [];
    d.eventPhotos.forEach(function (r) {
      var g = groups.filter(function (x) { return x.label === r.type; })[0];
      if (!g) { g = { key: slug(r.type) + '-' + groups.length, label: r.type, emoji: '', photos: [] }; groups.push(g); }
      if (!g.emoji && r.emoji) g.emoji = r.emoji;
      g.photos.push(imgUrl(r.photo, 1400));
    });
    window.TCS_events.setGroups(groups);
  };

  /* ---------- run ---------- */
  function renderAll(d) {
    Object.keys(R).forEach(function (name) {
      try { R[name](d); } catch (err) { console.error('Could not show "' + name + '"', err); }
    });
    afterRender();
  }

  TCS.ready.then(function (data) {
    if (data) renderAll(data);
    TCS.releasePage();
  });
  TCS.onUpdate(function (data) { renderAll(data); });
})();
