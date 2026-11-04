/* About Us, Strategy: the four pillars ("Community, Education, Professional, and International Organizations")
   become four separate pills (the commas and "and" are dropped). Hover, keyboard focus or a tap shows a short definition.
   The definitions are condensed from the "About Us" section of singaporeans.ch. Edit them here. */
(() => {
  const DEFINITIONS = [
    { re: /International Organi[sz]ations/, tip: 'Connecting Singaporeans to the many international organisations based in Geneva: a global network, with insights and opportunities for careers in the sector' },
    { re: /Community/, tip: 'Fostering a sense of belonging and camaraderie among Singaporeans in Switzerland, through social events that bring people together' },
    { re: /Education/, tip: 'Supporting Singaporean students and continuous learning within our community' },
    { re: /Professional/, tip: 'Supporting members’ career development with networking opportunities, professional growth resources and a place to exchange knowledge' }
  ];
  const ALL = new RegExp(DEFINITIONS.map(d => '(' + d.re.source + ')').join('|'), 'g');

  const apply = () => {
    document.querySelectorAll('[data-about="strategy"] p').forEach(p => {
      if (p.querySelector('.pillar')) return;                       // already done
      const text = p.textContent;
      if (!DEFINITIONS.every(d => d.re.test(text))) return;         // only the paragraph that lists the four pillars
      const frag = document.createDocumentFragment();
      let last = 0, n = 0;
      text.replace(ALL, (match, ...rest) => {
        const at = rest[DEFINITIONS.length];
        const def = DEFINITIONS.find(d => d.re.test(match));
        const id = 'pillar-tip-' + (++n);
        const word = document.createElement('span');
        word.className = 'pillar';
        word.tabIndex = 0;
        word.setAttribute('aria-describedby', id);
        word.appendChild(document.createTextNode(match));
        const tip = document.createElement('span');
        tip.className = 'pillar__tip';
        tip.id = id;
        tip.setAttribute('role', 'tooltip');
        tip.textContent = def.tip;
        word.appendChild(tip);
        frag.appendChild(word);
        last = at + match.length;
        return match;
      });
      p.classList.add('pillars');       // the commas and the "and" are dropped: each pillar is its own pill
      p.textContent = '';
      p.appendChild(frag);
    });
  };

  window.TCS_pillars = { apply };
  apply();
})();
