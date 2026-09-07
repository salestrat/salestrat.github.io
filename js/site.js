// Mobile nav toggle
(function () {
  var btn = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', function () {
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { links.classList.remove('open'); });
  });
})();

// One quiet reveal pass on scroll (not per-card confetti — see frontend-design guidance)
(function () {
  if (!('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.reveal');
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  els.forEach(function (el) { obs.observe(el); });
})();

// Image fallback for local assets not present on disk (logo.png / self.jpg)
(function () {
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () {
      var span = document.createElement('span');
      span.textContent = img.dataset.fallback;
      span.className = 'nav-brand-fallback';
      span.style.display = 'inline-block';
      img.replaceWith(span);
    });
  });
})();
