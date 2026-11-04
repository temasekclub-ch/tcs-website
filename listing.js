/* Listing pages (Sponsors, Team): switch between Current and Past */
(() => {
  const tabs = document.querySelectorAll('.listing-tabs .year');
  const grids = document.querySelectorAll('.listing__grid');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', t === tab));
    grids.forEach(g => { g.hidden = g.dataset.tab !== tab.dataset.tab; });
  }));
})();
