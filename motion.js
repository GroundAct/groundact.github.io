// One entrance per section; content is visible by default if motion is unavailable.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [...document.querySelectorAll([
    '.section-heading', '.figure-panel', '.question-band', '.wide-figure',
    '.principle-panel', '.abstract', '.architecture-figure', '.metric-strip',
    '.evidence-card', '.scale-reference', '.results-card', '.results-footnote',
    '.closing-line', '.citation-section .container'
  ].join(','))];
  const activeAnimations = new Set();
  let observer;

  function reveal(element, instant = false) {
    if (instant) element.classList.add('motion-instant');
    element.classList.add('is-visible');
    observer?.unobserve(element);
  }

  function revealDestination() {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { return; }
    if (!target) return;
    targets.filter(element => target.contains(element) || element.contains(target))
      .forEach(element => reveal(element, true));
  }

  if (location.hash) document.documentElement.classList.add('skip-intro');
  if (!preference.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, {threshold: 0, rootMargin: '0px 0px -24px 0px'});

    targets.forEach(element => {
      if (element.hidden) return;
      const rect = element.getBoundingClientRect();
      // Restored scroll positions and anchor landings must never begin blank.
      if (rect.top < innerHeight && rect.bottom > 0) return;
      if (rect.bottom <= 0) return;
      element.classList.add('motion-reveal');
      // Fade controls in place so their hit areas never move during a click.
      if (element.querySelector('a, button, summary, [tabindex]')) {
        element.classList.add('motion-stationary');
      }
      if (element.matches('.principle-panel:nth-child(2), .figure-panel:nth-child(2)')) {
        element.style.setProperty('--reveal-delay', '80ms');
      }
      observer.observe(element);
    });
  }

  function settleMotion() {
    observer?.disconnect();
    targets.forEach(element => reveal(element, true));
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
  }

  preference.addEventListener('change', event => { if (event.matches) settleMotion(); });
  window.addEventListener('hashchange', revealDestination);
  window.addEventListener('beforeprint', settleMotion);
  window.addEventListener('pageshow', event => { if (event.persisted) settleMotion(); });
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.motion-reveal');
    if (element && !element.classList.contains('is-visible')) reveal(element, true);
  });
  document.addEventListener('groundact:panelchange', event => {
    const panel = event.detail;
    if (!(panel instanceof HTMLElement)) return;
    reveal(panel, true);
    if (preference.matches || !panel.animate) return;
    panel.getAnimations().forEach(animation => animation.cancel());
    const animation = panel.animate(
      [{opacity: .35, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}],
      {duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)'}
    );
    activeAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  });
  revealDestination();
})();
