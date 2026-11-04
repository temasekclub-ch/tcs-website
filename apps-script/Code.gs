/**
 * Temasek Club Switzerland website: Google Apps Script
 *
 * This script is attached to the website's Google Sheet. It
 *   1. builds the editing tabs (run "Set up sheets" once),
 *   2. serves the sheet's content to the website as JSON (the website reads it on every page load), and
 *   3. receives the "Join us" contact form and emails it to the club.
 *
 * Setup steps are in docs/SETUP.md. Day to day, editors only touch the sheet, never this code.
 * If you change this code you must deploy a NEW VERSION (Deploy > Manage deployments > Edit > New version).
 */

const CONFIG = {
  RECIPIENT: 'temasekclub.ch@gmail.com',   // where contact form messages are sent
  MAX_MESSAGE_LENGTH: 3000,
  LIMIT_PER_EMAIL_PER_HOUR: 3,             // spam protection
  LIMIT_ALL_PER_HOUR: 40,
  IMAGE_HOST: 'https://lh3.googleusercontent.com/d/',  // Google Drive images are served from here
};

/* ------------------------------------------------------------------ */
/* Tab definitions. Column order here is the order created by setup;    */
/* afterwards the website finds columns by their header text, so editors */
/* can move columns around without breaking anything.                   */
/* ------------------------------------------------------------------ */

const STATUS = ['Current', 'Past'];

const TABS = [
  {
    key: 'team', sheet: 'Team', required: ['name'],
    intro: 'One row per person. Status decides whether they appear under Current or Past on the Team page.',
    columns: [
      { key: 'name', header: 'Name', type: 'text', width: 220, help: 'Full name as it should appear.' },
      { key: 'role', header: 'Role', type: 'text', width: 300, help: 'Role or roles. For two lines, press Alt+Enter (Windows) or Ctrl+Option+Enter (Mac) inside the cell.' },
      { key: 'photo', header: 'Photo', type: 'image', width: 260, help: 'Paste the Google Drive share link of the photo (share it as "Anyone with the link"). A square photo works best.' },
      { key: 'status', header: 'Status', type: 'status', width: 100, values: STATUS, help: 'Current or Past.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Number that decides the order on the page. 1 comes first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide this row from the website without deleting it.' },
    ],
  },
  {
    key: 'sponsors', sheet: 'Sponsors', required: ['name'],
    intro: 'One row per sponsor. Status decides whether they appear under Current or Past.',
    columns: [
      { key: 'name', header: 'Name', type: 'text', width: 220, help: 'Company name.' },
      { key: 'description', header: 'Description', type: 'text', width: 320, help: 'One short line about what the company does.' },
      { key: 'logo', header: 'Logo', type: 'image', width: 260, help: 'Google Drive share link of the logo.' },
      { key: 'status', header: 'Status', type: 'status', width: 100, values: STATUS, help: 'Current or Past.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'businesses', sheet: 'Local Businesses', required: ['name'],
    intro: 'One row per business. Leave a link blank and its icon is simply not shown.',
    columns: [
      { key: 'name', header: 'Name', type: 'text', width: 220, help: 'Business name.' },
      { key: 'category', header: 'Category', type: 'text', width: 180, help: 'For example Baked Goods.' },
      { key: 'logo', header: 'Logo', type: 'image', width: 240, help: 'Google Drive share link of the logo.' },
      { key: 'instagram', header: 'Instagram', type: 'instagram', width: 220, help: 'The Instagram web address, or just the account name.' },
      { key: 'facebook', header: 'Facebook', type: 'url', width: 220, help: 'Facebook page web address.' },
      { key: 'linkedin', header: 'LinkedIn', type: 'url', width: 220, help: 'LinkedIn page web address.' },
      { key: 'whatsapp', header: 'WhatsApp', type: 'whatsapp', width: 200, help: 'A WhatsApp link, or a phone number with country code such as +41 79 123 45 67.' },
      { key: 'website', header: 'Website', type: 'url', width: 220, help: 'Website address.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'events', sheet: 'Events', required: ['title'],
    intro: 'Upcoming events, shown at the top of the Events page. Move an event to the Past Events tab once it has happened.',
    columns: [
      { key: 'date', header: 'Date', type: 'text', width: 140, help: 'As it should read, for example 24 Aug or TBD.' },
      { key: 'title', header: 'Title', type: 'text', width: 280, help: 'Event name.' },
      { key: 'tag', header: 'Tag', type: 'text', width: 140, help: 'Category such as Community or Education.' },
      { key: 'emoji', header: 'Emoji', type: 'text', width: 80, help: 'Optional emoji shown after the tag.' },
      { key: 'location', header: 'Location line', type: 'text', width: 280, help: 'For example: 3 locations: Basel, Zug, and Zurich' },
      { key: 'details', header: 'Details line', type: 'text', width: 280, help: 'For example: Lunch, games, and fun' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'pastEvents', sheet: 'Past Events', required: ['title'],
    intro: 'Events that have happened. The Year column creates the year buttons on the Events page automatically.',
    columns: [
      { key: 'year', header: 'Year', type: 'text', width: 70, help: 'For example 2025.' },
      { key: 'date', header: 'Date', type: 'text', width: 140, help: 'For example 12 Oct or 21 & 25 Dec.' },
      { key: 'title', header: 'Title', type: 'text', width: 320, help: 'Event name.' },
      { key: 'tag', header: 'Tag', type: 'text', width: 140, help: 'Category such as Community or Education.' },
      { key: 'emoji', header: 'Emoji', type: 'text', width: 80, help: 'Optional emoji shown after the tag.' },
      { key: 'minutes', header: 'Link', type: 'url', width: 280, help: 'The web address or Google Drive link the button opens, for example the minutes. A button only appears when Button text is filled in too.' },
      { key: 'minutesLabel', header: 'Button text', type: 'text', width: 220, help: 'The words on the button that opens the link, for example Download meeting minutes. Leave empty and no button is shown.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Within a year, lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'agm', sheet: 'AGM Docs', required: ['title'],
    intro: 'Annual General Meeting documents. Each row becomes a card with a download link.',
    columns: [
      { key: 'title', header: 'Title', type: 'text', width: 260, help: 'For example AGM 2026.' },
      { key: 'date', header: 'Date', type: 'text', width: 180, help: 'For example September 24, 2026.' },
      { key: 'file', header: 'File link', type: 'url', width: 360, help: 'Google Drive share link or web address of the document.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'carousel', sheet: 'Home Carousel', required: ['photo'],
    intro: 'The big photos at the top of the home page. The caption under the photo changes with each photo.',
    columns: [
      { key: 'photo', header: 'Photo', type: 'image', width: 280, help: 'Google Drive share link. A wide photo works best.' },
      { key: 'title', header: 'Caption title', type: 'text', width: 260, help: 'For example National Day Celebration.' },
      { key: 'date', header: 'Date', type: 'text', width: 160, help: 'For example Aug 24, 2021. The word "on" is added for you.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'eventPhotos', sheet: 'Home Event Photos', required: ['type', 'photo'],
    intro: 'The photo strip under "Events across the year". Each Event type becomes a button; its photos appear when it is clicked.',
    columns: [
      { key: 'type', header: 'Event type', type: 'text', width: 200, help: 'For example National Day, Chinese New Year, Ski trips. Rows with the same type are grouped.' },
      { key: 'emoji', header: 'Emoji', type: 'text', width: 80, help: 'Emoji shown on the button. Fill it in on the first row of each type.' },
      { key: 'photo', header: 'Photo', type: 'image', width: 300, help: 'Google Drive share link.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first. Types appear in the order of their first photo.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'partners', sheet: 'Home Partners', required: ['label'],
    intro: 'The Partners card on the home page. Use one Quote row for the message, and one Link row for each partner link.',
    columns: [
      { key: 'kind', header: 'Kind', type: 'kind', width: 90, values: ['Quote', 'Link'], help: 'Quote (the message and who said it) or Link (a partner website).' },
      { key: 'label', header: 'Name or label', type: 'text', width: 300, help: 'Quote: the person\'s name. Link: the text of the link.' },
      { key: 'subtitle', header: 'Subtitle', type: 'text', width: 320, help: 'Quote only: their title or role (press Alt+Enter for extra lines).' },
      { key: 'text', header: 'Quote text', type: 'text', width: 420, help: 'Quote only: the message. Leave a blank line between paragraphs.' },
      { key: 'photo', header: 'Photo', type: 'image', width: 220, help: 'Quote only: Google Drive share link of their photo.' },
      { key: 'url', header: 'Web address', type: 'url', width: 300, help: 'Link only: where the link goes.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'about', sheet: 'About', required: ['section'],
    intro: 'Text on the About Us page. Section decides where a row goes. Wrap words in **double asterisks** to make them bold.',
    columns: [
      { key: 'section', header: 'Section', type: 'section', width: 110, values: ['Intro', 'Vision', 'Mission', 'Strategy'], help: 'Intro (paragraphs at the top), Vision, Mission, or Strategy (one row per point).' },
      { key: 'heading', header: 'Heading', type: 'text', width: 300, help: 'Strategy rows: the point\'s title. Other sections: leave blank.' },
      { key: 'text', header: 'Text', type: 'text', width: 520, help: 'The text. Use **bold** for bold words.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first within a section.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
  {
    key: 'lifeTips', sheet: 'Life Tips', required: ['topic'],
    intro: 'The Life in Switzerland page. Topic "Intro" is the paragraph at the top. Every other topic becomes a button; its rows are the tips shown.',
    columns: [
      { key: 'topic', header: 'Topic', type: 'text', width: 160, help: 'Intro, or a topic such as Taxes, Recycling, Cultural Norms. Rows with the same topic are grouped.' },
      { key: 'heading', header: 'Heading', type: 'text', width: 260, help: 'Bold heading of the tip.' },
      { key: 'text', header: 'Text', type: 'text', width: 560, help: 'The tip. Use **bold** for bold words.' },
      { key: 'order', header: 'Order', type: 'order', width: 70, help: 'Lower numbers come first. Topics appear in the order of their first tip.' },
      { key: 'show', header: 'Show', type: 'show', width: 70, help: 'Untick to hide.' },
    ],
  },
];

const SETTINGS_SPEC = {
  key: 'settings', sheet: 'Settings',
  help: [
    ['instagram', 'https://www.instagram.com/temasekclubswitzerland/', 'Instagram link in the top menu on every page.'],
    ['facebook', 'https://www.facebook.com/groups/TemasekClubSwitzerland', 'Facebook link in the top menu.'],
    ['linkedin', 'https://www.linkedin.com/company/temasek-club-switzerland/', 'LinkedIn link in the top menu.'],
    ['life_photo_1', 'assets/life-lucerne.jpg', 'Left photo at the top of Life in Switzerland (Google Drive link).'],
    ['life_photo_2', 'assets/life-rack-railway.png', 'Right photo at the top of Life in Switzerland.'],
    ['join_home', '**Ideas:** Volunteer, organize activities, spread the word about your business, share suggestions', 'First line of the Join us card on the home page. **bold** works.'],
    ['join_events', '**Volunteer, organize an activity, or share suggestions**', 'First line of the Join us card on the Events page.'],
    ['join_team', '**Join the team**', 'First line of the Join us card on the Team page.'],
    ['join_sponsors', '**Support our initiatives**', 'First line of the Join us card on the Sponsors page.'],
    ['join_life', '**Ideas:** Volunteer, organize activities, spread the word about your business, share suggestions', 'First line of the Join us card on Life in Switzerland.'],
    ['join_local', '**Spread the word about your business**', 'First line of the Join us card on Local Businesses.'],
  ],
};

const MESSAGES_HEADERS = ['Time', 'Page', 'Email', 'Topic', 'Message', 'Status'];

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'content';
  if (action === 'ping') return json_({ ok: true });
  if (action === 'content') {
    try { return ContentService.createTextOutput(contentText_()).setMimeType(ContentService.MimeType.JSON); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  return json_({ ok: false, error: 'Unknown action' });
}

/* Reading all the tabs takes several seconds, so the answer is kept for a minute and shared by every visitor.
   Editing the sheet clears it (onEdit below), so changes still show up almost at once. */
const CONTENT_CACHE_KEY = 'content_v1';
const CONTENT_CACHE_SECONDS = 60;

function contentText_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CONTENT_CACHE_KEY);
  if (hit) return hit;
  const text = JSON.stringify({ ok: true, generated: new Date().toISOString(), data: buildContent_() });
  try { if (text.length < 90000) cache.put(CONTENT_CACHE_KEY, text, CONTENT_CACHE_SECONDS); } catch (err) { /* too big or busy: just answer without keeping it */ }
  return text;
}

/* Runs by itself whenever someone edits the sheet by hand */
function onEdit() {
  try { CacheService.getScriptCache().remove(CONTENT_CACHE_KEY); } catch (err) { /* nothing to clear */ }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  return json_(handleContact_(body));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Reading the sheet                                                   */
/* ------------------------------------------------------------------ */

function buildContent_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {};
  TABS.forEach(function (spec) { data[spec.key] = readTab_(ss, spec); });
  data.settings = readSettings_(ss);
  return data;
}

function normKey_(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function readTab_(ss, spec) {
  const sh = ss.getSheetByName(spec.sheet);
  if (!sh) return [];
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(normKey_);
  const index = {};
  spec.columns.forEach(function (col) {
    let i = headers.indexOf(normKey_(col.header));
    if (i < 0) i = headers.indexOf(normKey_(col.key));
    index[col.key] = i;
  });
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const item = {};
    let show = true, order = null;
    spec.columns.forEach(function (col) {
      const raw = index[col.key] >= 0 ? String(row[index[col.key]] || '') : '';
      if (col.type === 'show') { show = parseShow_(raw); return; }
      if (col.type === 'order') { order = parseOrder_(raw); return; }
      item[col.key] = cleanValue_(raw, col);
    });
    const hasRequired = spec.required.every(function (k) { return String(item[k] || '').trim() !== ''; });
    if (!hasRequired || !show) continue;
    out.push({ item: item, order: order, row: r });
  }
  out.sort(function (a, b) {
    const ao = a.order === null ? Infinity : a.order, bo = b.order === null ? Infinity : b.order;
    return ao !== bo ? ao - bo : a.row - b.row;
  });
  return out.map(function (x) { return x.item; });
}

function readSettings_(ss) {
  const sh = ss.getSheetByName(SETTINGS_SPEC.sheet);
  const out = {};
  if (!sh) return out;
  const values = sh.getDataRange().getDisplayValues();
  for (let r = 1; r < values.length; r++) {
    const key = String(values[r][0] || '').trim();
    if (!key) continue;
    const raw = String(values[r][1] || '');
    out[key] = /^(instagram|facebook|linkedin|whatsapp)$/.test(key) ? cleanUrl_(raw, key) :
               /_photo_/.test(key) ? toImage_(raw) : raw.trim();
  }
  return out;
}

function parseShow_(raw) {
  const v = String(raw).trim().toLowerCase();
  return !(v === 'false' || v === 'no' || v === '0' || v === 'hide' || v === 'hidden');
}

function parseOrder_(raw) {
  const n = parseFloat(String(raw).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function cleanValue_(raw, col) {
  const text = String(raw).replace(/\r/g, '').trim();
  switch (col.type) {
    case 'image': return toImage_(text);
    case 'url': return cleanUrl_(text, 'url');
    case 'instagram': return cleanUrl_(text, 'instagram');
    case 'whatsapp': return cleanUrl_(text, 'whatsapp');
    case 'status': return /^past$/i.test(text) ? 'Past' : 'Current';
    case 'kind': return /^link$/i.test(text) ? 'Link' : 'Quote';
    case 'section': return titleCase_(text);
    default: return text;
  }
}

function titleCase_(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }

/* Links ------------------------------------------------------------- */

function driveId_(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : '';
}

function isGoogleHost_(url) { return /^(https?:\/\/)?(drive|docs)\.google\.com\//i.test(url); }

function toImage_(v) {
  const url = String(v || '').trim();
  if (!url) return '';
  if (isGoogleHost_(url)) { const id = driveId_(url); return id ? CONFIG.IMAGE_HOST + id : ''; }
  return cleanUrl_(url, 'url');
}

function cleanUrl_(v, kind) {
  let url = String(v || '').trim();
  if (!url) return '';
  if (kind === 'whatsapp' && /^\+?[\d\s()\-]{7,}$/.test(url)) return 'https://wa.me/' + url.replace(/\D/g, '');
  if (kind === 'instagram' && /^@?[A-Za-z0-9._]+$/.test(url)) return 'https://www.instagram.com/' + url.replace(/^@/, '') + '/';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) return '';          // other schemes (javascript:, data:, mailto:) are dropped
  if (/^\/\//.test(url)) return 'https:' + url;
  const first = url.split('/')[0];
  if (first.indexOf('.') > -1 && first.indexOf(' ') === -1 && /^(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(first)) return 'https://' + url;
  return url;                                                  // a file inside the website, such as assets/team/photo.jpg
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */

function handleContact_(b) {
  const honeypot = String(b.company || '').trim();
  if (honeypot) return { ok: true };                           // a bot filled the hidden field: pretend it worked

  const email = String(b.email || '').trim();
  const message = String(b.message || '').trim();
  const topic = String(b.topic || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);   // one short line; line breaks removed so it is safe in an email subject
  const page = String(b.page || '').trim().slice(0, 120) || 'Website';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { ok: false, error: 'Please enter a valid email address.' };
  if (!message) return { ok: false, error: 'Please write a message.' };
  if (message.length > CONFIG.MAX_MESSAGE_LENGTH) return { ok: false, error: 'The message is too long. Please keep it under ' + CONFIG.MAX_MESSAGE_LENGTH + ' characters.' };

  if (rateLimited_(email)) return { ok: false, error: 'Too many messages in a short time. Please try again later.' };

  let status = 'Sent';
  try {
    MailApp.sendEmail({
      to: CONFIG.RECIPIENT,
      replyTo: email,
      name: 'TCS website',
      subject: topic ? '[TCS website] ' + topic : 'Website message (' + page + ')',
      body: 'A message was sent from the Temasek Club Switzerland website.\n\n' +
            'Page: ' + page + '\nFrom: ' + email + '\n' + (topic ? 'Topic: ' + topic + '\n' : '') + '\n' + message + '\n',
    });
  } catch (err) {
    status = 'EMAIL FAILED: ' + String(err && err.message || err);
  }
  logMessage_({ time: new Date(), page: page, email: email, topic: topic, message: message, status: status });
  if (status !== 'Sent') return { ok: false, error: 'Sorry, the message could not be sent. Please email ' + CONFIG.RECIPIENT + ' directly.' };
  return { ok: true };
}

function rateLimited_(email) {
  const cache = CacheService.getScriptCache();
  const bucket = Math.floor(Date.now() / 3600000);
  const keys = ['rl:' + bucket + ':' + email.toLowerCase().slice(0, 100), 'rl:' + bucket + ':all'];
  const limits = [CONFIG.LIMIT_PER_EMAIL_PER_HOUR, CONFIG.LIMIT_ALL_PER_HOUR];
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) { /* carry on without the lock */ }
  try {
    const counts = keys.map(function (k) { return parseInt(cache.get(k) || '0', 10); });
    if (counts[0] >= limits[0] || counts[1] >= limits[1]) return true;
    keys.forEach(function (k, i) { cache.put(k, String(counts[i] + 1), 3700); });
    return false;
  } finally { try { lock.releaseLock(); } catch (e) { /* not held */ } }
}

function logMessage_(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Messages');
  if (!sh) { sh = ss.insertSheet('Messages'); sh.appendRow(MESSAGES_HEADERS); }
  let headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(normKey_);
  if (headers.indexOf('topic') < 0) {                      // a Messages tab made before the Topic field existed: add the column after Email
    const at = Math.max(0, headers.indexOf('email')) + 1;
    sh.insertColumnAfter(at);
    sh.getRange(1, at + 1).setValue('Topic').setFontWeight('bold').setBackground('#e6dc94');
    headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normKey_);
  }
  // each value goes under its own heading, so the columns can be moved around without breaking anything
  sh.appendRow(headers.map(function (h) { return entry[h] === undefined ? '' : entry[h]; }));
}

/* ------------------------------------------------------------------ */
/* Set-up: creates the tabs with headers, dropdowns, tick boxes and     */
/* example rows. Safe to run again: tabs that already exist are left alone. */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TCS website')
    .addItem('Set up sheets (first time only)', 'setupSheet')
    .addItem('Check my content for problems', 'checkContent')
    .addToUi();
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const created = [];
  const existed = [];

  TABS.forEach(function (spec) {
    if (ss.getSheetByName(spec.sheet)) { existed.push(spec.sheet); return; }
    const sh = ss.insertSheet(spec.sheet);
    buildTab_(sh, spec);
    created.push(spec.sheet);
  });

  if (!ss.getSheetByName(SETTINGS_SPEC.sheet)) {
    buildSettings_(ss.insertSheet(SETTINGS_SPEC.sheet));
    created.push(SETTINGS_SPEC.sheet);
  } else existed.push(SETTINGS_SPEC.sheet);

  if (!ss.getSheetByName('Messages')) {
    const m = ss.insertSheet('Messages');
    m.appendRow(MESSAGES_HEADERS);
    m.setFrozenRows(1);
    m.getRange(1, 1, 1, MESSAGES_HEADERS.length).setFontWeight('bold').setBackground('#e6dc94');
    m.setColumnWidth(1, 150); m.setColumnWidth(2, 140); m.setColumnWidth(3, 220); m.setColumnWidth(4, 500); m.setColumnWidth(5, 200);
    created.push('Messages');
  }

  if (!ss.getSheetByName('README')) {
    buildReadme_(ss.insertSheet('README', 0));
    created.push('README');
  }

  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  const msg = (created.length ? 'Created: ' + created.join(', ') + '.' : 'Nothing new to create.') +
              (existed.length ? '\nAlready there (left untouched): ' + existed.join(', ') + '.' : '');
  try { SpreadsheetApp.getUi().alert('TCS website', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
  return msg;
}

function buildTab_(sh, spec) {
  const headers = spec.columns.map(function (c) { return c.header; });
  const sample = SAMPLE[spec.key] || [];
  const rows = Math.max(sample.length, 1);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e6dc94').setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 32);
  const MAX_ROWS = 300;

  spec.columns.forEach(function (col, i) {
    const c = i + 1;
    sh.setColumnWidth(c, col.width || 160);
    sh.getRange(1, c).setNote(col.help || '');
    const body = sh.getRange(2, c, MAX_ROWS, 1);
    if (col.type !== 'order' && col.type !== 'show') body.setNumberFormat('@');     // keep text exactly as typed
    if (col.type === 'show') { body.insertCheckboxes(); body.setValue(true); }   // empty rows start ticked, so a new row is shown without extra work
    if (col.values) body.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(col.values, true).setAllowInvalid(false).build());
    if (col.type === 'order') body.setDataValidation(SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(true).build());
  });
  sh.getRange(2, 1, MAX_ROWS, headers.length).setWrap(true).setVerticalAlignment('top');

  if (sample.length) {
    const grid = sample.map(function (rowObj) {
      return spec.columns.map(function (col) {
        if (col.type === 'show') return true;
        const v = rowObj[col.key];
        return v === undefined ? '' : v;
      });
    });
    sh.getRange(2, 1, grid.length, headers.length).setValues(grid);
    const showCol = spec.columns.findIndex(function (c) { return c.type === 'show'; }) + 1;
    if (showCol) sh.getRange(2, showCol, grid.length, 1).setValue(true);
  }

  const p = sh.getRange(1, 1, 1, headers.length).protect();
  p.setWarningOnly(true).setDescription('Header row: the website finds columns by these names');
  sh.getRange(1, headers.length + 2).setValue(spec.intro || '').setFontStyle('italic').setWrap(false);
}

function buildSettings_(sh) {
  sh.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'What it does']]).setFontWeight('bold').setBackground('#e6dc94');
  sh.setFrozenRows(1);
  const rows = SETTINGS_SPEC.help.map(function (r) { return [r[0], r[1], r[2]]; });
  sh.getRange(2, 1, rows.length, 2).setNumberFormat('@');
  sh.getRange(2, 1, rows.length, 3).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 520); sh.setColumnWidth(3, 420);
  sh.getRange(2, 1, rows.length, 1).setFontColor('#666666');
  sh.getRange(1, 1, 1, 3).protect().setWarningOnly(true);
}

function buildReadme_(sh) {
  const lines = [
    ['How to update the Temasek Club Switzerland website'],
    [''],
    ['The website reads this sheet every time someone opens a page. Change a row here, reload the website, and the change is there.'],
    [''],
    ['TO EDIT'],
    ['1. Open the tab you need (Team, Sponsors, Local Businesses, Events, Past Events, AGM Docs and so on).'],
    ['2. Change a cell, or add a row at the bottom of the table. Do not leave blank rows in the middle.'],
    ['3. To hide something without deleting it, untick its Show box.'],
    ['4. The Order column decides who comes first (1 is first). Rows without an order come last.'],
    [''],
    ['PHOTOS AND LOGOS'],
    ['1. Upload the photo to the club\'s shared Google Drive folder.'],
    ['2. Right-click it, choose Share, set General access to "Anyone with the link", and copy the link.'],
    ['3. Paste the link into the Photo or Logo cell. A square photo is best for people, a wide photo for the home page.'],
    [''],
    ['GOOD TO KNOW'],
    ['- Do not rename the tabs or the header row (the yellow row at the top of each tab).'],
    ['- Each tab has a short note in its header cells (hover over a header). Cells show hints if you hover.'],
    ['- Messages from the website\'s "Join us" form arrive by email and are also saved in the Messages tab.'],
    ['- Use the menu TCS website > Check my content for problems to find blank names, broken links and similar slips.'],
    ['- Everything in this sheet is public: anyone who knows the website\'s data address can read it. Never type private information here.'],
  ];
  sh.getRange(1, 1, lines.length, 1).setValues(lines).setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(1, 760);
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  [5, 11, 16].forEach(function (r) { sh.getRange(r, 1).setFontWeight('bold'); });
}

/* ------------------------------------------------------------------ */
/* Content check (menu: TCS website > Check my content for problems)    */
/* ------------------------------------------------------------------ */

function checkContent() {
  const problems = findProblems_();
  const text = problems.length ? problems.slice(0, 40).join('\n') + (problems.length > 40 ? '\n...and ' + (problems.length - 40) + ' more.' : '')
                               : 'No problems found.';
  try { SpreadsheetApp.getUi().alert('Content check', text, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(text); }
  return problems;
}

function findProblems_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const problems = [];
  TABS.forEach(function (spec) {
    const sh = ss.getSheetByName(spec.sheet);
    if (!sh) { problems.push('The tab "' + spec.sheet + '" is missing.'); return; }
    const values = sh.getDataRange().getDisplayValues();
    if (values.length < 2) return;
    const headers = values[0].map(normKey_);
    spec.columns.forEach(function (col) {
      if (headers.indexOf(normKey_(col.header)) < 0) problems.push(spec.sheet + ': the column "' + col.header + '" is missing or was renamed.');
    });
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const filled = row.some(function (v) { return String(v).trim() !== '' && String(v).toUpperCase() !== 'TRUE' && String(v).toUpperCase() !== 'FALSE'; });
      if (!filled) continue;
      spec.columns.forEach(function (col) {
        const i = headers.indexOf(normKey_(col.header));
        if (i < 0) return;
        const v = String(row[i] || '').trim();
        if (spec.required.indexOf(col.key) > -1 && !v) problems.push(spec.sheet + ' row ' + (r + 1) + ': "' + col.header + '" is empty, so this row is not shown.');
        if (v && (col.type === 'image' || col.type === 'url') && cleanValue_(v, col) === '') problems.push(spec.sheet + ' row ' + (r + 1) + ': the link in "' + col.header + '" could not be understood.');
        if (v && col.type === 'image' && isGoogleHost_(v) && !driveId_(v)) problems.push(spec.sheet + ' row ' + (r + 1) + ': this Drive link has no file in it. Copy the link of the photo itself, not of a folder.');
      });
      if (spec.key === 'pastEvents') {                      // a button needs both its link and its words
        const link = String(row[headers.indexOf(normKey_('Link'))] || '').trim(), words = String(row[headers.indexOf(normKey_('Button text'))] || '').trim();
        if (link && !words) problems.push(spec.sheet + ' row ' + (r + 1) + ': there is a link but "Button text" is empty, so no button is shown.');
        if (words && !link) problems.push(spec.sheet + ' row ' + (r + 1) + ': "Button text" is filled in but "Link" is empty, so no button is shown.');
      }
    }
  });
  return problems;
}

/* ------------------------------------------------------------------ */
/* Example rows written by "Set up sheets". Photos here point at files  */
/* inside the website; replace them with Google Drive links when ready. */
/* ------------------------------------------------------------------ */

const SAMPLE = {
  team: [
    { name: 'Sophia Kay Leen Iten', role: 'President', photo: 'assets/team/sophia-iten.png', status: 'Current', order: 1 },
    { name: 'Ethel Hui Yan Tan', role: 'Vice President', photo: 'assets/team/ethel-tan.png', status: 'Current', order: 2 },
    { name: 'Evelyn Foo-Ogulkanmis', role: 'Communications Lead', photo: 'assets/team/evelyn-foo.png', status: 'Current', order: 3 },
    { name: 'Sebastian Ong', role: 'Community Lead (Zurich)', photo: 'assets/team/sebastian-ong.jpeg', status: 'Current', order: 4 },
    { name: 'Bobby Wei Jian Chin', role: 'Community Lead (Basel)', photo: 'assets/team/bobby-chin.jpeg', status: 'Current', order: 5 },
    { name: 'Lingxi Tang', role: 'Education Lead (East)', photo: 'assets/team/lingxi-tang.jpeg', status: 'Current', order: 6 },
    { name: 'Neha Thakkar', role: 'Professional Lead', photo: 'assets/team/neha-thakkar.jpeg', status: 'Current', order: 7 },
    { name: 'Celine Yu Ting Chew', role: 'Community Lead (Geneva)', photo: 'assets/team/celine-chew.jpg', status: 'Current', order: 8 },
    { name: 'James Winston Tumbokon', role: 'Education Lead (West)', photo: 'assets/team/james-tumbokon.jpeg', status: 'Current', order: 9 },
    { name: 'Audrey Au Yong Lyn', role: 'International Organisations Lead', photo: 'assets/team/audrey-lyn.jpeg', status: 'Current', order: 10 },
    { name: 'Amanda Yen Yi Ng', role: 'Treasurer', photo: 'assets/team/amanda-ng.png', status: 'Current', order: 11 },
    { name: 'Sumathi V Selvaretnam', role: 'President (2018–2023)\nCommunity Lead (2024)', photo: 'assets/team/sumathi-selvaretnam.jpeg', status: 'Past', order: 1 },
    { name: 'Denise Lim', role: 'Education Lead (2022–2023)\nVice President (2023–2024)', photo: 'assets/team/denise-lim.jpeg', status: 'Past', order: 2 },
    { name: 'Mun How Mong (Shaun)', role: 'President (2023–2025)', photo: 'assets/team/shaun-mong.jpeg', status: 'Past', order: 3 },
    { name: 'Zi Xuan Ng', role: 'Education Lead (2022–2023)\nVice President (2023–2025)', photo: 'assets/team/zixuan-ng.jpeg', status: 'Past', order: 4 },
  ],
  sponsors: [
    { name: 'Company', description: 'Asian groceries, delivered', logo: 'assets/logo-pending.png', status: 'Current', order: 1 },
    { name: 'Company', description: 'Catering for events', logo: 'assets/logo-pending.png', status: 'Current', order: 2 },
    { name: 'Company', description: 'Travel and flight deals', logo: 'assets/logo-pending.png', status: 'Current', order: 3 },
    { name: 'Company', description: 'Wealth advisory services', logo: 'assets/logo-pending.png', status: 'Current', order: 4 },
    { name: 'Company', description: 'Printing and signage', logo: 'assets/logo-pending.png', status: 'Current', order: 5 },
    { name: 'Company', description: 'Local coffee roasters', logo: 'assets/logo-pending.png', status: 'Current', order: 6 },
  ],
  businesses: [
    { name: 'Pandan Treasures', category: 'Baked Goods', logo: 'assets/pandan-treasures.png', order: 1 },
    { name: 'Pandan Treasures', category: 'Baked Goods', logo: 'assets/pandan-treasures.png', order: 2 },
  ],
  events: [
    { date: 'TBD', title: '60th National Day Lunch', tag: 'Community', emoji: '🤝🏻', location: '3 locations: Basel, Zug, and Zurich', details: 'Lunch, games, and fun', order: 1 },
  ],
  pastEvents: [
    { year: '2025', date: '21 & 25 Dec', title: 'Christmas Lunch', tag: 'Community', emoji: '🤝🏻', minutes: 'https://singaporeans.ch/wp-content/uploads/2025/05/agm2025_final_v2.pdf', minutesLabel: 'Download meeting minutes', order: 1 },
    { year: '2025', date: '12 Oct', title: 'Uri Hike', tag: 'Community', emoji: '🤝🏻', order: 2 },
    { year: '2025', date: '20 Sept', title: 'TCS Student & Young Professionals Get-Together', tag: 'Education', emoji: '📚', order: 3 },
  ],
  agm: [
    { title: 'AGM 2026', date: 'June 2026', file: 'https://singaporeans.ch/wp-content/uploads/2026/06/tcs-agm-june-2026.pdf', order: 1 },
    { title: 'AGM 2025', date: 'May 2025', file: 'https://singaporeans.ch/wp-content/uploads/2025/05/agm2025_final_v2.pdf', order: 2 },
    { title: 'AGM 2024', date: '', file: 'https://singaporeans.ch/wp-content/uploads/2023/11/tcs-agm-2024.pdf', order: 3 },
  ],
  carousel: [
    { photo: 'assets/hero-1.webp', title: 'National Day Celebration', date: 'Aug 24, 2021', order: 1 },
    { photo: 'assets/hero-4.webp', title: 'National Day Lunch', date: 'Aug 12, 2023', order: 2 },
    { photo: 'assets/hero-5.webp', title: 'Community Dinner', date: 'Nov 9, 2024', order: 3 },
    { photo: 'assets/hero-6.webp', title: 'Community Meet-up', date: 'Mar 15, 2025', order: 4 },
  ],
  eventPhotos: [
    { type: 'National Day', emoji: '🇸🇬', photo: 'assets/events-strip-1.png', order: 1 },
    { type: 'National Day', photo: 'assets/events-strip-2.png', order: 2 },
    { type: 'National Day', photo: 'assets/hero-5.webp', order: 3 },
    { type: 'National Day', photo: 'assets/hero-6.webp', order: 4 },
    { type: 'Chinese New Year', emoji: '🧧', photo: 'assets/placeholder-cny-1.svg', order: 5 },
    { type: 'Chinese New Year', photo: 'assets/placeholder-cny-2.svg', order: 6 },
    { type: 'Chinese New Year', photo: 'assets/placeholder-cny-3.svg', order: 7 },
    { type: 'Chinese New Year', photo: 'assets/placeholder-cny-4.svg', order: 8 },
    { type: 'Ski trips', emoji: '🎿', photo: 'assets/placeholder-ski-1.svg', order: 9 },
    { type: 'Ski trips', photo: 'assets/placeholder-ski-2.svg', order: 10 },
    { type: 'Ski trips', photo: 'assets/placeholder-ski-3.svg', order: 11 },
    { type: 'Ski trips', photo: 'assets/placeholder-ski-4.svg', order: 12 },
    { type: 'Hiking', emoji: '🥾', photo: 'assets/placeholder-hiking-1.svg', order: 13 },
    { type: 'Hiking', photo: 'assets/placeholder-hiking-2.svg', order: 14 },
    { type: 'Hiking', photo: 'assets/placeholder-hiking-3.svg', order: 15 },
    { type: 'Hiking', photo: 'assets/placeholder-hiking-4.svg', order: 16 },
  ],
  partners: [
    {
      kind: 'Quote', label: 'Ambassador Tan Hung Seng',
      subtitle: 'TCS Honorary Advisor\nPermanent Representative of Singapore\nWorld Trade Organization and World Intellectual Property Organization',
      text: '“The Temasek Club Switzerland (TCS) plays an extremely important role in helping overseas Singaporeans in Switzerland to stay connected to one another and to Singapore.\n\nTCS has done very well in organising a range of meaningful events and activities that enable Singaporeans to get to know each other, to support each other, and to create a home away from home.\n\nThe Singapore Mission in Geneva is pleased to support TCS in its efforts to foster a greater sense of belonging to our Little Red Dot.”',
      photo: 'assets/ambassador.png', order: 1,
    },
    { kind: 'Link', label: 'Permanent Mission of Singapore in Geneva', url: 'https://www.mfa.gov.sg/overseas-mission/geneva-wto', order: 2 },
    { kind: 'Link', label: 'Singapore Global Network (SGN)', url: 'https://singaporeglobalnetwork.gov.sg/', order: 3 },
    { kind: 'Link', label: 'France-Singapore Students and Young Professionals Association (FSSYPA)', url: 'https://www.facebook.com/groups/FSSYPA', order: 4 },
  ],
  about: [
    { section: 'Intro', text: 'Founded in 2001, Temasek Club Switzerland (TCS) is a **non-profit, non-governmental organisation managed by Singaporeans living in Switzerland**. Membership is open to all Singaporeans and friends of Singapore who are presently residing or previously resided in Switzerland.', order: 1 },
    { section: 'Intro', text: 'For over two decades, TCS has been serving the Singapore community in Switzerland. Our community has grown and evolved, offering numerous events and initiatives to connect and support our members. TCS is supported by the Permanent Mission of Singapore in Geneva and the Singapore Global Network.', order: 2 },
    { section: 'Vision', text: 'To be the cornerstone for Singaporeans in Switzerland, fostering a vibrant and connected community that embodies the Singapore Spirit through social, educational and professional exchanges, and global engagement.', order: 1 },
    { section: 'Mission', text: 'TCS strives to build and sustain a dynamic network for Singaporeans and friends of Singapore in Switzerland, offering enriching cultural experiences, robust educational support, professional development opportunities, and fostering connections with international friends and organisations.', order: 1 },
    { section: 'Strategy', heading: 'Cultivating the Singapore Spirit', text: 'TCS strives to represent, cultivate, and sustain the “Singapore Spirit” in Switzerland by initiating and maintaining relationships with Singaporeans currently living or who have previously resided in Switzerland. We aim to foster a sense of community and connection so that everyone feels at home, no matter how far they are from Singapore.', order: 1 },
    { section: 'Strategy', heading: 'Strengthening the Singaporean Identity', text: 'TCS hopes to strengthen the Singaporean identity in Switzerland and the broader European neighbourhood by keeping in touch with overseas Singaporeans and organising relevant activities. Our events and initiatives are designed to celebrate our culture, heritage, and shared experiences, reinforcing a strong sense of belonging and national pride.', order: 2 },
    { section: 'Strategy', heading: 'Supporting SGN and Collaborative Platforms', text: 'TCS coordinates with and supports the Singapore Global Network (SGN) and other communities to facilitate information exchange, engage in meaningful dialogue, and participate in joint projects. Our collaboration aims to create a cohesive and supportive network for all Singaporeans in Switzerland.', order: 3 },
    { section: 'Strategy', heading: 'Focused on Four Pillars', text: 'Community, Education, Professional, and International Organizations', order: 4 },
  ],
  lifeTips: [
    { topic: 'Intro', text: 'It takes time to adapt to a new place, and you are not alone—please reach out to the community for support! Below are some basic tips for getting acquainted with Switzerland.', order: 0 },
    { topic: 'Taxes', heading: 'Three levels of tax', text: 'Income is taxed at the federal, cantonal, and municipal levels. Total tax varies a lot depending on where you live (e.g. Zug and Schwyz are generally lower, while Geneva and Vaud are higher).', order: 1 },
    { topic: 'Taxes', heading: 'Withholding at source', text: "If you hold a B permit (and aren't yet a C permit holder or Swiss citizen), tax is typically deducted directly from your salary. The rate depends on your canton, marital status, children, and sometimes religion.", order: 2 },
    { topic: 'Taxes', heading: 'When you file a return', text: 'Higher earners (roughly above CHF 120,000 gross per year) are usually required to file an ordinary tax return even if taxed at source. Others may be able to request one, which can be worthwhile if they have deductions to claim. C permit holders and citizens file annually.', order: 3 },
    { topic: 'Taxes', heading: 'Filing deadlines', text: 'The tax year is the calendar year, and returns are commonly due around 31 March, though this varies by canton, and extensions are usually available.', order: 4 },
    { topic: 'Taxes', heading: 'Wealth tax', text: 'Unlike Singapore, Switzerland levies an annual cantonal tax on net wealth, and you generally need to declare worldwide assets, including Singapore bank accounts, investments, and property.', order: 5 },
    { topic: 'Taxes', heading: 'Church tax', text: "In many cantons, this applies if you register as a member of a recognised church. Singaporeans of other or no religion typically aren't affected, but make sure your registration is accurate.", order: 6 },
    { topic: 'Taxes', heading: 'Deductions', text: 'Contributions to the Pillar 3a private pension, certain pension fund buy-ins, health insurance premiums (within limits), and commuting costs are commonly deductible.', order: 7 },
    { topic: 'Taxes', heading: 'Capital gains', text: 'Gains on private investments are generally not taxed, though dividends, interest, and rental income are.', order: 8 },
    { topic: 'Taxes', heading: 'Double taxation', text: "Singapore and Switzerland have a double taxation agreement, which helps avoid being taxed twice on the same income. It's also worth checking your Singapore tax residency status with IRAS when you move.", order: 9 },
    { topic: 'Recycling', heading: 'Coming soon', text: 'Tips on recycling are coming soon.', order: 10 },
    { topic: 'Cultural Norms', heading: 'Coming soon', text: 'Tips on cultural norms are coming soon.', order: 11 },
  ],
};
