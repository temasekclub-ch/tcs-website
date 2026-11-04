/* Content loader: fetches the website's content from the Google Sheet (through the Apps Script address
   in config.js) and shares it with the rest of the site as window.TCS.

   - the last answer is kept in the visitor's browser, so repeat visits show content at once and refresh it
   - if the sheet cannot be reached, the cached copy or the content written in the HTML is used instead
   - while the first answer is awaited, areas marked data-tcs stay hidden (class "tcs-wait" on <html>) so that
     visitors never see the built-in content flash and then change. A time limit stops this hiding for too long. */
(function () {
  var cfg = window.TCS_CONFIG || {};
  var api = cfg.api || '';
  try {   // for testing only: ?api=ADDRESS works when the site is opened from this computer
    var q = new URLSearchParams(location.search).get('api');
    if (q && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) api = q;
  } catch (e) { /* ignore */ }

  var KEY = 'tcs-content-v1';
  var listeners = [];
  var TCS = window.TCS = {
    api: api,
    config: cfg,
    data: null,
    source: 'html',
    ready: Promise.resolve(null),
    onUpdate: function (fn) { listeners.push(fn); },   // called when newer content arrives after the first render
    releasePage: function () { document.documentElement.classList.remove('tcs-wait'); },
  };
  if (!api) return;                                  // not connected: the HTML content stays as it is

  var root = document.documentElement;
  root.classList.add('tcs-wait');
  var failSafe = setTimeout(TCS.releasePage, (cfg.timeout || 4000) + 1500);

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* private mode */ }
  var cachedData = cached && cached.data ? cached.data : null;

  var settled = false, settle;
  TCS.ready = new Promise(function (resolve) { settle = resolve; });
  function resolveOnce(d) { if (!settled) { settled = true; settle(d); } }

  function publish(d, source) {
    TCS.data = d; TCS.source = source;
    listeners.forEach(function (fn) { try { fn(d, source); } catch (err) { console.error(err); } });
  }

  if (cachedData) { TCS.data = cachedData; TCS.source = 'cache'; resolveOnce(cachedData); }
  else setTimeout(function () { resolveOnce(null); }, cfg.timeout || 4000);   // no cache and a slow sheet: use the HTML content

  var url = api + (api.indexOf('?') > -1 ? '&' : '?') + 'action=content&_=' + Date.now();
  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var abortTimer = setTimeout(function () { if (controller) controller.abort(); }, 15000);

  fetch(url, controller ? { signal: controller.signal } : {})
    .then(function (r) { return r.json(); })
    .then(function (res) {
      clearTimeout(abortTimer);
      if (!res || !res.ok || !res.data) throw new Error((res && res.error) || 'Bad answer');
      var changed = JSON.stringify(res.data) !== JSON.stringify(cachedData);
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data: res.data })); } catch (e) { /* ignore */ }
      if (!settled) { resolveOnce(res.data); TCS.data = res.data; TCS.source = 'live'; }
      else if (changed) publish(res.data, 'live');   // newer than what was shown: update the page
    })
    .catch(function (err) {
      clearTimeout(abortTimer);
      console.warn('Content sheet unavailable, using saved content.', err);
      resolveOnce(cachedData);
    });
})();
