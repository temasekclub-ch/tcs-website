/* Past events: switch the list by year (the year buttons are built from the content sheet, so listen on the document) */
document.addEventListener('click', e => {
  const tab = e.target.closest('.years .year');
  if (!tab) return;
  document.querySelectorAll('.years .year').forEach(t => t.setAttribute('aria-selected', t === tab));
  document.querySelectorAll('.past__list').forEach(l => { l.hidden = l.dataset.year !== tab.dataset.year; });
});
