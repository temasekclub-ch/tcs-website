/* Runs apps-script/Code.gs against a fake Google Sheets so the logic can be tested without Google.
   Usage: node tools/test-script.js [--write-sample]   (writes data/sample-content.json) */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');

/* ---- a tiny fake of the Google services the script uses ---- */
const noop = () => proxy();
function proxy(extra = {}) {
  return new Proxy(function () {}, {
    get: (t, k) => (k in extra ? extra[k] : k === 'then' ? undefined : noop),
    apply: () => proxy(),
  });
}
class FakeSheet {
  constructor(name) { this.name = name; this.rows = []; }
  getRange(r, c, nr = 1, nc = 1) {
    const sheet = this;
    return proxy({
      setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => { (sheet.rows[r - 1 + i] = sheet.rows[r - 1 + i] || [])[c - 1 + j] = v; })); return proxy(); },
      setValue(v) { (sheet.rows[r - 1] = sheet.rows[r - 1] || [])[c - 1] = v; return proxy(); },
    });
  }
  appendRow(row) { this.rows.push(row); }
  getDataRange() { const rows = this.rows; return { getDisplayValues: () => { const w = Math.max(0, ...rows.map(x => (x || []).length)); return rows.filter(Boolean).map(r => Array.from({ length: w }, (_, i) => { const v = r[i]; return v === undefined || v === null ? '' : v === true ? 'TRUE' : v === false ? 'FALSE' : v instanceof Date ? v.toISOString() : String(v); })); } }; }
  getLastRow() { return this.rows.length; }
  setFrozenRows() {} setRowHeight() {} setColumnWidth() {} getName() { return this.name; }
}
const sheets = {};
const ss = {
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = new FakeSheet(n)),
  getSheets: () => Object.values(sheets),
  deleteSheet: n => { delete sheets[n.name]; },
};
const sent = [];
const cacheStore = {};
const ctx = {
  console, Logger: { log: console.log },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, newDataValidation: () => proxy({ build: () => ({}) }), getUi: () => ({ alert: () => {}, ButtonSet: { OK: 1 }, createMenu: () => proxy() }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ text: s, setMimeType() { return this; } }) },
  MailApp: { sendEmail: m => { if (ctx.__failMail) throw new Error('quota'); sent.push(m); } },
  CacheService: { getScriptCache: () => ({ get: k => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; }, remove: k => { delete cacheStore[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

let failures = 0;
const check = (name, cond, extra) => { if (!cond) failures++; console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : '  ' + (extra || ''))); };
const get = params => { ctx.onEdit(); return JSON.parse(ctx.doGet({ parameter: params || {} }).text); };   // onEdit clears the one-minute content cache, as an edit in the sheet would
const post = obj => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).text);

/* ---- tests ---- */
ctx.setupSheet();
check('setup creates every tab', ['Team', 'Sponsors', 'Local Businesses', 'Events', 'Past Events', 'AGM Docs', 'Home Carousel', 'Home Event Photos', 'Home Partners', 'About', 'Life Tips', 'Settings', 'Messages', 'README'].every(n => sheets[n]));
const first = get();
check('content loads', first.ok === true && first.data && Array.isArray(first.data.team));
const d = first.data;
check('team: 11 current, 4 past', d.team.filter(x => x.status === 'Current').length === 11 && d.team.filter(x => x.status === 'Past').length === 4);
check('team: first is Sophia (order 1)', d.team[0].name === 'Sophia Kay Leen Iten');
check('multi-line role is kept', d.team.find(x => x.name === 'Denise Lim').role.includes('\n'));
{ ctx.onEdit(); const first = ctx.doGet({ parameter: {} }).text; const second = ctx.doGet({ parameter: {} }).text;
  check('the content answer is kept for a minute (same answer twice)', first === second);
  ctx.onEdit(); check('editing the sheet clears the kept answer', JSON.parse(ctx.doGet({ parameter: {} }).text).ok === true); }
check('past events carry a minutes link', d.pastEvents[0].minutes.startsWith('https://'));
check('past events carry their button text', d.pastEvents[0].minutesLabel === 'Download meeting minutes');
check('the button text column is called Button text', /Button text/.test(require('fs').readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8')));
check('AGM rows load', d.agm.length === 3);
check('about has Strategy items', d.about.filter(x => x.section === 'Strategy').length === 4);
check('life tips topics load', new Set(d.lifeTips.map(x => x.topic)).size === 4);
check('settings parsed', d.settings.instagram.startsWith('https://www.instagram.com') && d.settings.life_photo_1 === 'assets/life-lucerne.jpg');
check('relative assets are kept', d.carousel[0].photo === 'assets/hero-1.webp');

// editing behaviour
const team = sheets['Team'];
team.rows[1][5] = false;                                    // untick Show on row 2 (Sophia)
check('unticking Show hides a row', !get().data.team.some(x => x.name === 'Sophia Kay Leen Iten'));
team.rows[1][5] = true;
team.rows[2][3] = 'past';                                    // status typed in lower case
check('status is case-insensitive', get().data.team.find(x => x.name === 'Ethel Hui Yan Tan').status === 'Past');
team.rows[2][3] = 'Current';
team.rows[3][4] = '';                                        // clear an order
check('rows without an order go last', get().data.team.filter(x => x.status === 'Current').slice(-1)[0].name === 'Evelyn Foo-Ogulkanmis');
team.rows.push(['Zed Test', 'Tester', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing', 'Current', '', true]);
const zed = get().data.team.find(x => x.name === 'Zed Test');
check('Drive link becomes an image address', zed && zed.photo === 'https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
team.rows.push(['', 'No name', '', 'Current', '', true]);
check('rows without a name are skipped', !get().data.team.some(x => x.role === 'No name'));
sheets['Local Businesses'].rows[1][3] = '@pandantreasures';
sheets['Local Businesses'].rows[1][6] = '+41 79 123 45 67';
sheets['Local Businesses'].rows[1][7] = 'javascript:alert(1)';
sheets['Local Businesses'].rows[1][4] = 'www.facebook.com/pandan';
const biz = get().data.businesses[0];
check('instagram handle becomes a link', biz.instagram === 'https://www.instagram.com/pandantreasures/');
check('phone number becomes a WhatsApp link', biz.whatsapp === 'https://wa.me/41791234567');
check('dangerous links are dropped', biz.website === '');
check('bare domains get https', biz.facebook === 'https://www.facebook.com/pandan');
check('problem finder runs', Array.isArray(ctx.findProblems_()));

// contact form
check('valid message is sent', post({ email: 'a@b.ch', message: 'Hello', page: 'Team' }).ok === true && sent.length === 1);
check('email goes to the club', sent[0].to === 'temasekclub.ch@gmail.com' && sent[0].replyTo === 'a@b.ch');
check('message is logged in the sheet', sheets['Messages'].rows.length === 2 && sheets['Messages'].rows[1][4] === 'Sent');
check('bad email is rejected', post({ email: 'nope', message: 'x' }).ok === false);
check('empty message is rejected', post({ email: 'a@b.ch', message: '  ' }).ok === false);
check('huge message is rejected', post({ email: 'a@b.ch', message: 'x'.repeat(3001) }).ok === false);
check('honeypot is silently ignored', post({ email: 'a@b.ch', message: 'spam', company: 'Bot Inc' }).ok === true && sent.length === 1);
post({ email: 'rate@b.ch', message: '1' }); post({ email: 'rate@b.ch', message: '2' }); post({ email: 'rate@b.ch', message: '3' });
check('rate limit stops the 4th message in an hour', post({ email: 'rate@b.ch', message: '4' }).ok === false);
ctx.__failMail = true;
const failed = post({ email: 'fail@b.ch', message: 'x' });
check('failed email is reported and still logged', failed.ok === false && /EMAIL FAILED/.test(sheets['Messages'].rows.slice(-1)[0][4]));
ctx.__failMail = false;
check('unknown action is refused', get({ action: 'nope' }).ok === false);

if (process.argv.includes('--write-sample')) {
  // rebuild a clean sheet so the sample file shows the untouched example content
  Object.keys(sheets).forEach(k => delete sheets[k]);
  ctx.setupSheet();
  ctx.onEdit();
  const out = JSON.parse(ctx.doGet({ parameter: {} }).text);
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'sample-content.json'), JSON.stringify(out, null, 2));
  console.log('wrote data/sample-content.json');
}
console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
process.exit(failures ? 1 : 0);
