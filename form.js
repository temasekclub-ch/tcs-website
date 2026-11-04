/* "Join us" contact form: sends the message to the Google Apps Script, which emails it to the club
   (temasekclub.ch@gmail.com) and keeps a copy in the sheet's Messages tab. */
(() => {
  const form = document.querySelector('form.join__panel');
  if (!form) return;
  const cfg = (window.TCS && window.TCS.config) || window.TCS_CONFIG || {};
  const api = (window.TCS && window.TCS.api) || cfg.api || '';
  const email = cfg.contactEmail || 'temasekclub.ch@gmail.com';
  const send = form.querySelector('.join__send');

  // a hidden field that people never see but spam robots fill in
  const trap = document.createElement('input');
  trap.type = 'text'; trap.name = 'company'; trap.tabIndex = -1; trap.autocomplete = 'off';
  trap.setAttribute('aria-hidden', 'true'); trap.className = 'join__trap';
  form.appendChild(trap);

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
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const address = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    if (!api) { say('The form is not connected yet. Please email ' + email + '.', 'error'); return; }

    send.disabled = true;
    say('Sending…');
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // keeps it a simple request, so no preflight is needed
        body: JSON.stringify({ email: address, message, page: document.title, company: trap.value }),
      });
      const out = await res.json();
      if (out && out.ok) { form.reset(); say('Thank you! Your message has been sent.'); }
      else say((out && out.error) || 'Sorry, the message could not be sent. Please email ' + email + '.', 'error');
    } catch (err) {
      say('Sorry, we could not reach the server. Please try again, or email ' + email + '.', 'error');
    } finally {
      send.disabled = false;
    }
  });
})();
