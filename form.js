/* "Join us" contact form: sends the message to the Google Apps Script, which emails it to the club
   (temasekclub.ch@gmail.com) and keeps a copy in the sheet's Messages tab. */
(() => {
  const form = document.querySelector('form.join__panel');
  if (!form) return;
  const cfg = (window.TCS && window.TCS.config) || window.TCS_CONFIG || {};
  const api = (window.TCS && window.TCS.api) || cfg.api || '';
  const email = cfg.contactEmail || 'temasekclub.ch@gmail.com';
  const send = form.querySelector('.join__send');
  const sendLabel = send.textContent.trim() || 'Send';
  let resetTimer = null;
  // The words appear letter by letter, left to right (like the caption on the home page), each time the button
  // changes state; the colour eases over at the same time.
  const words = document.createElement('span');
  words.className = 'join__send-words';
  send.replaceChildren(words);
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const STEP = { Sending: 45, Sent: 70, Send: 95 };               // ms between letters: "Send" after "Sent!" is the slowest
  const showWords = (text, step) => {
    words.replaceChildren();
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'join__send-char';
      c.style.setProperty('--d', (i * step) + 'ms');
      c.textContent = ch;
      words.appendChild(c);
    });
  };
  const label = (text, sent) => {
    send.classList.toggle('join__send--sent', !!sent);          // the colour fades (see styles.css)
    if (calm.matches) { words.textContent = text; return; }
    showWords(text, STEP[text.replace(/[!…]/g, '')] || 60);
  };
  label(sendLabel);

  let note;
  function say(text, kind) {
    if (!note) {
      note = document.createElement('p');
      note.className = 'join__note';
      note.setAttribute('role', 'status');
      form.appendChild(note);
    }
    note.textContent = text;
    note.classList.toggle('join__note--error', kind === 'error');
    // "Sending…" and "Sent!" are shown on the button itself, so only a problem is shown as visible text under it
    // (that way the card never grows after a successful send); screen readers still hear every message
    note.classList.toggle('sr-only', kind !== 'error');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const address = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    const topic = form.elements.topic ? form.elements.topic.value.trim() : '';
    if (!api) { say('The form is not connected yet. Please email ' + email + '.', 'error'); return; }

    clearTimeout(resetTimer);
    send.disabled = true;
    label('Sending…');
    say('Sending…');
    try {
      const pretend = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]fakesend=1\b/.test(location.search);   // testing only, on this computer
      if (pretend) await new Promise(ok => setTimeout(ok, 900));
      const res = pretend ? { json: async () => ({ ok: true }) } : await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // keeps it a simple request, so no preflight is needed
        body: JSON.stringify({ email: address, topic, message, page: document.title, company: trap.value }),
      });
      const out = await res.json();
      if (out && out.ok) {
        form.reset();
        label('Sent!', true);                                  // the button itself says it worked
        say('Thank you! Your message has been sent.');
        resetTimer = setTimeout(() => { label(sendLabel); setTimeout(() => { send.disabled = false; }, 900); }, 4000);   // back to "Send" after a few seconds
        return;
      }
      label(sendLabel);
      say((out && out.error) || 'Sorry, the message could not be sent. Please email ' + email + '.', 'error');
    } catch (err) {
      label(sendLabel);
      say('Sorry, we could not reach the server. Please try again, or email ' + email + '.', 'error');
    }
    send.disabled = false;
  });
})();
