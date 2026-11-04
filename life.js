/* Life in Switzerland: switch the helpful-information topic (the topic buttons are built from the content sheet) */
document.addEventListener('click', e => {
  const chip = e.target.closest('.info .chip');
  if (!chip) return;
  document.querySelectorAll('.info .chip').forEach(c => {
    const on = c === chip;
    c.classList.toggle('chip--active', on);
    c.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('.info__list').forEach(l => { l.hidden = l.dataset.topic !== chip.dataset.topic; });
});
