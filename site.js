// Inject the animated aurora backdrop once (kept out of HTML to avoid repeating
// the same markup on every page).
(function () {
  var aurora = document.createElement('div');
  aurora.className = 'bg-aurora';
  aurora.setAttribute('aria-hidden', 'true');
  aurora.innerHTML = '<span></span><span></span><span></span>';
  document.body.prepend(aurora);
})();

// Mobile nav toggle
(function () {
  var btn = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', function () { links.classList.toggle('open'); });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { links.classList.remove('open'); });
  });
})();

// Staggered, orchestrated scroll-reveal — one quiet pass, cascading within
// each group rather than popping in all at once.
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  var seen = new Map();
  document.querySelectorAll('.reveal').forEach(function (el) {
    var parent = el.parentElement;
    var idx = seen.has(parent) ? seen.get(parent) : 0;
    el.style.setProperty('--d', Math.min(idx * 0.08, 0.4) + 's');
    seen.set(parent, idx + 1);
  });
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
})();

// 3D pointer-tilt on cards marked [data-tilt] — desktop hover only, skipped
// on touch devices and when the user prefers reduced motion.
(function () {
  var supportsHover = window.matchMedia('(hover: hover)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!supportsHover || reduced) return;
  document.querySelectorAll('[data-tilt]').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (py * -10).toFixed(2) + 'deg');
    });
    card.addEventListener('mouseleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();

// Duplicate marquee content so the CSS scroll loop is seamless.
(function () {
  document.querySelectorAll('.marquee-track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });
})();

// Image fallback for local assets not present on disk (logo.png / self.jpg)
(function () {
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () {
      var span = document.createElement('span');
      span.textContent = img.dataset.fallback;
      span.className = 'nav-brand-fallback';
      span.style.display = 'inline-flex';
      span.style.alignItems = 'center';
      span.style.justifyContent = 'center';
      span.style.width = '100%';
      span.style.height = '100%';
      img.replaceWith(span);
    });
  });
})();
