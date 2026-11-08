// The service constellation uses hover on desktop and tap-to-open on touch
// screens so the same discovery interaction works without a cursor.
(function () {
  document.querySelectorAll('[data-constellation]').forEach(function (map) {
    var core = map.querySelector('.constellation-core');
    if (!core) return;
    var glow = map.querySelector('.core-glow');
    var networkCanvas = map.querySelector('.core-network-canvas');
    var setGlow = function (open) {
      if (glow) glow.style.opacity = open ? '.82' : '.28';
    };
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (networkCanvas && networkCanvas.getContext) {
      var networkContext = networkCanvas.getContext('2d');
      var particles = [];
      var networkPointer = { x: 0.5, y: 0.5 };
      var resizeNetwork = function () {
        var bounds = networkCanvas.getBoundingClientRect();
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        networkCanvas.width = Math.max(1, Math.round(bounds.width * ratio));
        networkCanvas.height = Math.max(1, Math.round(bounds.height * ratio));
        networkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (!particles.length) {
          for (var i = 0; i < 118; i += 1) {
            var spread = Math.sin((i / 117) * Math.PI);
            particles.push({
              x: i / 117,
              y: 0.5 + (Math.random() - 0.5) * (0.2 + spread * 0.54),
              vx: (Math.random() - 0.5) * 0.00024,
              vy: (Math.random() - 0.5) * 0.00018,
              size: i % 13 === 0 ? 2.8 : (i % 4 === 0 ? 1.8 : 1.1),
              accent: i % 7 === 0
            });
          }
        }
      };
      var drawNetwork = function (time) {
        var bounds = networkCanvas.getBoundingClientRect();
        var width = bounds.width;
        var height = bounds.height;
        networkContext.clearRect(0, 0, width, height);
        particles.forEach(function (particle, index) {
          if (!reduced) {
            particle.x += particle.vx;
            particle.y += particle.vy + Math.sin(time * 0.0008 + index) * 0.00008;
            if (particle.x > 1.04) particle.x = -0.04;
            if (particle.x < -0.04) particle.x = 1.04;
            if (particle.y < 0.12 || particle.y > 0.88) particle.vy *= -1;
          }
          particle.drawX = particle.x * width + (networkPointer.x - 0.5) * 10;
          particle.drawY = particle.y * height + (networkPointer.y - 0.5) * 6;
        });
        particles.forEach(function (particle, index) {
          particles.slice(index + 1).forEach(function (other) {
            var dx = particle.drawX - other.drawX;
            var dy = particle.drawY - other.drawY;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 68) {
              networkContext.strokeStyle = 'rgba(217, 54, 31, ' + ((1 - distance / 68) * 0.18).toFixed(3) + ')';
              networkContext.lineWidth = 0.7;
              networkContext.beginPath();
              networkContext.moveTo(particle.drawX, particle.drawY);
              networkContext.lineTo(other.drawX, other.drawY);
              networkContext.stroke();
            }
          });
        });
        particles.forEach(function (particle) {
          networkContext.fillStyle = particle.accent ? '#F26A52' : '#D9361F';
          networkContext.globalAlpha = particle.size > 2 ? 0.94 : 0.76;
          networkContext.beginPath();
          networkContext.arc(particle.drawX, particle.drawY, particle.size, 0, Math.PI * 2);
          networkContext.fill();
        });
        networkContext.globalAlpha = 1;
        if (!reduced) window.requestAnimationFrame(drawNetwork);
      };
      resizeNetwork();
      window.addEventListener('resize', resizeNetwork);
      map.addEventListener('pointermove', function (event) {
        var bounds = networkCanvas.getBoundingClientRect();
        networkPointer.x = (event.clientX - bounds.left) / bounds.width;
        networkPointer.y = (event.clientY - bounds.top) / bounds.height;
      });
      drawNetwork(0);
    }
    if (!reduced && window.matchMedia('(hover: hover)').matches) {
      core.addEventListener('mouseenter', function () {
        map.classList.add('is-open');
        core.setAttribute('aria-expanded', 'true');
        setGlow(true);
      });
      map.addEventListener('mouseleave', function () {
        map.classList.remove('is-open');
        core.setAttribute('aria-expanded', 'false');
        setGlow(false);
      });
      map.addEventListener('pointermove', function (e) {
        var rect = map.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        var y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        map.style.setProperty('--mx', (x * 4).toFixed(2) + 'deg');
        map.style.setProperty('--my', (y * -4).toFixed(2) + 'deg');
        core.style.setProperty('--core-rx', (y * -12).toFixed(2) + 'deg');
        core.style.setProperty('--core-ry', (x * 12).toFixed(2) + 'deg');
      });
      map.addEventListener('pointerleave', function () {
        map.style.setProperty('--mx', '0deg');
        map.style.setProperty('--my', '0deg');
        core.style.setProperty('--core-rx', '0deg');
        core.style.setProperty('--core-ry', '0deg');
      });
    }
    core.addEventListener('click', function () {
      var open = map.classList.toggle('is-open');
      core.setAttribute('aria-expanded', String(open));
      setGlow(open);
    });
    map.querySelectorAll('.service-node').forEach(function (node) {
      node.addEventListener('click', function () {
        map.classList.remove('is-open');
        core.setAttribute('aria-expanded', 'false');
        setGlow(false);
      });
    });
  });
})();

// One passive scroll loop powers the progress indicator and subtle depth motion.
// Keeping all scroll work in requestAnimationFrame avoids layout thrashing.
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  var ticking = false;

  function updateScrollEffects() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var amount = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    progress.style.transform = 'scaleX(' + amount + ')';
    if (!reduced) {
      var heroVisual = document.querySelector('.hero-visual');
      if (heroVisual && window.scrollY < window.innerHeight * 1.15) {
        heroVisual.style.setProperty('--scroll-y', Math.min(window.scrollY * 0.08, 28).toFixed(2) + 'px');
      }
      document.body.classList.toggle('has-scrolled', window.scrollY > 24);
      document.querySelectorAll('.section').forEach(function (section) {
        var rect = section.getBoundingClientRect();
        section.style.setProperty('--section-drift', Math.max(-26, Math.min(26, (window.innerHeight * .5 - (rect.top + rect.height * .2)) * .035)).toFixed(2) + 'px');
      });
      document.querySelectorAll('[data-scroll-story]').forEach(function (story) {
        var rect = story.getBoundingClientRect();
        var travel = Math.max(rect.height - window.innerHeight, 1);
        var progressValue = Math.max(0, Math.min(1, -rect.top / travel));
        story.style.setProperty('--story-progress', progressValue.toFixed(3));
        var activeStep = Math.min(2, Math.floor(progressValue * 3));
        story.querySelectorAll('[data-story-step]').forEach(function (step) {
          step.classList.toggle('is-active', Number(step.dataset.storyStep) === activeStep);
        });
      });
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollEffects);
      ticking = true;
    }
  }, { passive: true });
  updateScrollEffects();
})();

// Staggered, orchestrated scroll-reveal — one quiet pass, cascading within
// each group rather than popping in all at once.
(function () {
  document.querySelectorAll('.hero .container > *, .hero-grid > *, .section > .container > .folio, .section > .container > h2, .section > .container > .lede, .feature-grid > *, .path-grid > *, .vision-grid > *, .case-list > *, .case-row, .blog-grid > *, .post-header > *, .post-body > *, .post-cta, .ledger-cell, .marquee, .process-tab-list, .process-panels, .journey-grid > *, .cta-band').forEach(function (el) {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    return;
  }
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

// Search and filter the insight library while keeping its featured guide visible.
(function () {
  var library = document.querySelector('.blog-library');
  if (!library) return;
  var entries = Array.prototype.slice.call(library.querySelectorAll('[data-blog-entry]'));
  var buttons = Array.prototype.slice.call(library.querySelectorAll('[data-blog-filter]'));
  var search = library.querySelector('[data-blog-search]');
  var results = library.querySelector('[data-blog-results]');
  var emptyMessage = library.querySelector('[data-blog-empty]');
  var activeFilter = 'all';

  function updateLibrary() {
    var query = search ? search.value.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];
    var visibleCount = 0;
    entries.forEach(function (entry) {
      var category = entry.getAttribute('data-category');
      var text = (entry.getAttribute('data-search') || entry.textContent).toLowerCase();
      var matches = (activeFilter === 'all' || category === activeFilter) && query.every(function (term) { return text.indexOf(term) !== -1; });
      entry.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    if (results) {
      results.textContent = visibleCount === 1 ? 'Showing 1 guide' : 'Showing ' + visibleCount + ' guides';
    }
    if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      activeFilter = button.getAttribute('data-blog-filter');
      buttons.forEach(function (item) {
        var active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateLibrary();
    });
  });
  if (search) search.addEventListener('input', updateLibrary);
  updateLibrary();
})();

// Keep the process narrative focused: one step and its explanation at a time.
(function () {
  var tabs = document.querySelector('[data-process-tabs]');
  if (!tabs) return;
  var buttons = tabs.querySelectorAll('[data-process-tab]');
  var panels = tabs.querySelectorAll('[data-process-panel]');
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      var id = button.getAttribute('data-process-tab');
      buttons.forEach(function (item) {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var active = panel.getAttribute('data-process-panel') === id;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
    });
  });
})();

// Animate key business numbers once when they enter the viewport.
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var counters = document.querySelectorAll('.ledger-fig, .case-stat-fig, .cta-metric strong');
  if (!counters.length) return;
  counters.forEach(function (el) {
    var original = el.textContent.trim();
    var match = original.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
    if (!match || original.indexOf('–') !== -1) return;
    var prefix = match[1], target = Number(match[2]), suffix = match[3];
    function render(value) { el.textContent = prefix + (target % 1 ? value.toFixed(1) : Math.round(value)) + suffix; }
    if (reduced || !('IntersectionObserver' in window)) { render(target); return; }
    render(0);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var start = performance.now();
        function tick(now) {
          var progress = Math.min(1, (now - start) / 1100);
          render(target * (1 - Math.pow(1 - progress, 3)));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.unobserve(el);
      });
    }, { threshold: .55 });
    observer.observe(el);
  });
})();

// 3D pointer-tilt on cards marked [data-tilt] — desktop hover only, skipped
// on touch devices and when the user prefers reduced motion.
(function () {
  var supportsHover = window.matchMedia('(hover: hover)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!supportsHover || reduced) return;
  document.querySelectorAll('[data-tilt]').forEach(function (card) {
    var targetX = 0, targetY = 0, currentX = 0, currentY = 0, frame = 0;
    function animate() {
      currentX += (targetX - currentX) * .16;
      currentY += (targetY - currentY) * .16;
      card.style.setProperty('--ry', currentX.toFixed(2) + 'deg');
      card.style.setProperty('--rx', currentY.toFixed(2) + 'deg');
      if (Math.abs(targetX - currentX) > .02 || Math.abs(targetY - currentY) > .02) frame = requestAnimationFrame(animate);
      else frame = 0;
    }
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      targetX = px * 10;
      targetY = py * -10;
      if (!frame) frame = requestAnimationFrame(animate);
    });
    card.addEventListener('pointerleave', function () {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(animate);
    });
  });
})();

// Interactive storefront preview: product selection and a gentle desktop tilt.
(function () {
  var demo = document.querySelector('[data-store-demo]');
  if (!demo) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var windowCard = demo.querySelector('[data-store-tilt]');
  var status = demo.querySelector('[data-store-status]');
  var count = demo.querySelector('[data-cart-count]');
  var products = demo.querySelectorAll('.store-product');

  products.forEach(function (product) {
    product.addEventListener('click', function () {
      products.forEach(function (item) { item.classList.remove('is-selected'); });
      product.classList.add('is-selected');
      if (status) status.textContent = product.getAttribute('data-product') + ' selected';
      if (count) count.textContent = '3';
    });
  });

  if (reduced || !window.matchMedia('(hover: hover)').matches || !windowCard) return;
  var targetX = 0, targetY = 0, currentX = -8, currentY = 5, frame = 0;
  function animateCard() {
    currentX += (targetX - currentX) * .14;
    currentY += (targetY - currentY) * .14;
    windowCard.style.transform = 'rotateX(' + currentY.toFixed(2) + 'deg) rotateY(' + currentX.toFixed(2) + 'deg) rotateZ(1deg)';
    if (Math.abs(targetX - currentX) > .02 || Math.abs(targetY - currentY) > .02) frame = requestAnimationFrame(animateCard);
    else frame = 0;
  }
  windowCard.addEventListener('pointermove', function (event) {
    var bounds = windowCard.getBoundingClientRect();
    var x = (event.clientX - bounds.left) / bounds.width - 0.5;
    var y = (event.clientY - bounds.top) / bounds.height - 0.5;
    targetX = -8 + x * 12;
    targetY = 5 - y * 8;
    if (!frame) frame = requestAnimationFrame(animateCard);
  });
  windowCard.addEventListener('pointerleave', function () {
    targetX = -8;
    targetY = 5;
    if (!frame) frame = requestAnimationFrame(animateCard);
  });
})();

// Interactive growth dashboard: switch channels and gently tilt on desktop.
(function () {
  var demo = document.querySelector('[data-growth-demo]');
  if (!demo) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dashboard = demo.querySelector('[data-growth-tilt]');
  var value = demo.querySelector('[data-growth-value]');
  var status = demo.querySelector('[data-growth-status]');
  var channels = demo.querySelectorAll('.growth-channel');
  var messages = { SEO: 'SEO is bringing qualified demand', 'Meta Ads': 'Meta Ads are scaling reach', Store: 'Your store is converting attention' };

  channels.forEach(function (channel) {
    channel.addEventListener('click', function () {
      channels.forEach(function (item) { item.classList.remove('is-selected'); });
      channel.classList.add('is-selected');
      if (value) value.textContent = channel.getAttribute('data-growth-value');
      if (status) status.textContent = messages[channel.getAttribute('data-growth-channel')];
    });
  });

  if (reduced || !window.matchMedia('(hover: hover)').matches || !dashboard) return;
  var targetX = 0, targetY = 0, currentX = -8, currentY = 5, frame = 0;
  function animateDashboard() {
    currentX += (targetX - currentX) * .14;
    currentY += (targetY - currentY) * .14;
    dashboard.style.transform = 'rotateX(' + currentY.toFixed(2) + 'deg) rotateY(' + currentX.toFixed(2) + 'deg) rotateZ(1deg)';
    if (Math.abs(targetX - currentX) > .02 || Math.abs(targetY - currentY) > .02) frame = requestAnimationFrame(animateDashboard);
    else frame = 0;
  }
  dashboard.addEventListener('pointermove', function (event) {
    var bounds = dashboard.getBoundingClientRect();
    var x = (event.clientX - bounds.left) / bounds.width - 0.5;
    var y = (event.clientY - bounds.top) / bounds.height - 0.5;
    targetX = -8 + x * 12;
    targetY = 5 - y * 8;
    if (!frame) frame = requestAnimationFrame(animateDashboard);
  });
  dashboard.addEventListener('pointerleave', function () {
    targetX = -8;
    targetY = 5;
    if (!frame) frame = requestAnimationFrame(animateDashboard);
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

// Let visitors choose a starting point and carry that context into direct
// contact links without changing the existing booking destination.
(function () {
  var options = [
    { label: 'Build or relaunch', message: 'I am looking to build or relaunch a website or online store.' },
    { label: 'Improve what I have', message: 'I would like to improve my current website, store, or marketing.' },
    { label: 'I am still exploring', message: 'I am exploring what could help my business and would like to talk it through.' }
  ];

  document.querySelectorAll('.cta-band, .post-cta').forEach(function (panel) {
    var actions = panel.querySelector('.cta-actions');
    if (!actions && panel.classList.contains('post-cta')) {
      var existingLinks = Array.prototype.slice.call(panel.querySelectorAll(':scope > a.btn'));
      if (existingLinks.length) {
        actions = document.createElement('div');
        actions.className = 'cta-actions';
        existingLinks[0].parentNode.insertBefore(actions, existingLinks[0]);
        existingLinks.forEach(function (link) { actions.appendChild(link); });
      }
    }
    if (!actions) return;

    var copy = panel.querySelector('.cta-copy') || panel;
    var prompt = document.createElement('div');
    prompt.className = 'cta-intents';
    prompt.innerHTML = '<span class="cta-intents-label">A good place to start</span>' +
      '<div class="cta-intent-options" role="group" aria-label="Choose a conversation topic"></div>' +
      '<p class="cta-intent-status" role="status" aria-live="polite">Pick a topic to personalize your message, or just say hello.</p>';
    var optionsContainer = prompt.querySelector('.cta-intent-options');
    options.forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cta-intent';
      button.textContent = option.label;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        optionsContainer.querySelectorAll('.cta-intent').forEach(function (item) {
          item.setAttribute('aria-pressed', String(item === button));
        });
        prompt.querySelector('.cta-intent-status').textContent = option.label + ' is a good place to start. Choose email or WhatsApp and I’ll take it from there.';
        var subject = 'A conversation with SaleStrat';
        var body = 'Hello SaleStrat,\n\n' + option.message + '\n\n';
        actions.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
          link.href = 'mailto:info.salestrat@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        });
        actions.querySelectorAll('a[href*="wa.me/"]').forEach(function (link) {
          link.href = 'https://wa.me/917757075336?text=' + encodeURIComponent('Hello SaleStrat! ' + option.message);
        });
      });
      optionsContainer.appendChild(button);
    });

    var lede = copy.querySelector('.lede, p');
    if (lede) lede.insertAdjacentElement('afterend', prompt);
    else copy.appendChild(prompt);

    if (!actions.querySelector('a[href^="mailto:"]')) {
      var email = document.createElement('a');
      email.href = 'mailto:info.salestrat@gmail.com';
      email.className = 'btn btn-outline';
      email.textContent = 'Email SaleStrat';
      actions.appendChild(email);
    }
    if (!actions.querySelector('a[href*="wa.me/"]')) {
      var whatsapp = document.createElement('a');
      whatsapp.href = 'https://wa.me/917757075336';
      whatsapp.className = 'btn btn-outline';
      whatsapp.target = '_blank';
      whatsapp.rel = 'noopener';
      whatsapp.textContent = 'WhatsApp';
      actions.appendChild(whatsapp);
    }
  });
})();

// Shared accessibility, theme, scroll-spy, and page-navigation controls.
(function () {
  var root = document.documentElement;
  var nav = document.querySelector('.site-nav');
  var navRow = nav && nav.querySelector('.nav-row');
  var menuButton = nav && nav.querySelector('.nav-toggle');
  var menu = nav && nav.querySelector('.nav-links');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  var themePreference = root.getAttribute('data-theme-source') === 'system'
    ? null
    : root.getAttribute('data-theme');

  function readThemePreference() {
    try {
      return window.localStorage.getItem('salestrat-theme');
    } catch (error) {
      console.warn('SaleStrat could not read the saved theme preference.', error);
      return null;
    }
  }

  function saveThemePreference(value) {
    try {
      window.localStorage.setItem('salestrat-theme', value);
    } catch (error) {
      console.warn('SaleStrat could not save the theme preference.', error);
    }
  }

  if (!themePreference) themePreference = readThemePreference();
  function resolvedTheme() {
    return themePreference === 'light' || themePreference === 'dark'
      ? themePreference
      : (themeMedia.matches ? 'dark' : 'light');
  }

  var themeButton;
  function updateThemeButton() {
    if (!themeButton) return;
    var activeTheme = resolvedTheme();
    var nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
    themeButton.setAttribute('aria-label', 'Switch to ' + nextTheme + ' mode');
    themeButton.setAttribute('title', 'Switch to ' + nextTheme + ' mode');
    themeButton.querySelector('.theme-toggle-icon').textContent = activeTheme === 'dark' ? '☼' : '☾';
    themeButton.querySelector('.theme-toggle-label').textContent = activeTheme === 'dark' ? 'Dark' : 'Light';
  }

  function setTheme(theme, persist) {
    themePreference = theme;
    root.setAttribute('data-theme', theme);
    if (persist) {
      root.removeAttribute('data-theme-source');
      saveThemePreference(theme);
    }
    updateThemeButton();
  }

  if (navRow) {
    themeButton = document.createElement('button');
    themeButton.type = 'button';
    themeButton.className = 'theme-toggle';
    themeButton.setAttribute('aria-label', 'Change color theme');
    themeButton.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
    if (menuButton) navRow.insertBefore(themeButton, menuButton);
    else navRow.appendChild(themeButton);
    updateThemeButton();
    themeButton.addEventListener('click', function () {
      document.body.classList.add('theme-switching');
      setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark', true);
      window.setTimeout(function () { document.body.classList.remove('theme-switching'); }, 220);
    });
  }

  themeMedia.addEventListener('change', function () {
    if (themePreference !== 'light' && themePreference !== 'dark') {
      if (root.getAttribute('data-theme-source') === 'system') {
        root.setAttribute('data-theme', themeMedia.matches ? 'dark' : 'light');
      }
      updateThemeButton();
    }
  });

  var main = document.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'main-content';
    main.tabIndex = -1;
    var skipLink = document.createElement('a');
    skipLink.className = 'skip-link';
    skipLink.href = '#' + main.id;
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  if (menuButton && menu) {
    function syncMenuState() {
      var isMobile = window.matchMedia('(max-width: 1080px)').matches;
      var isOpen = menu.classList.contains('open');
      menu.inert = isMobile && !isOpen;
      if (!isMobile) {
        menu.classList.remove('open');
        menu.inert = false;
        menuButton.setAttribute('aria-expanded', 'false');
      }
    }
    syncMenuState();
    menuButton.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menu.inert = !open && window.matchMedia('(max-width: 1080px)').matches;
      if (open) {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menu.inert = window.matchMedia('(max-width: 1080px)').matches;
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menu.inert = true;
        menuButton.focus();
      }
    });
    window.addEventListener('resize', syncMenuState);
  }

  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('[data-scroll-spy]'));
  var spySections = spyLinks.map(function (link) {
    return document.getElementById(link.getAttribute('data-scroll-spy'));
  }).filter(Boolean);

  if (spyLinks.length && spySections.length) {
    function updateScrollSpy() {
      var marker = 120;
      var activeSection = null;
      spySections.forEach(function (section) {
        var rect = section.getBoundingClientRect();
        if (rect.top <= marker && rect.bottom > marker) activeSection = section;
      });
      spyLinks.forEach(function (link) {
        var active = activeSection && link.getAttribute('data-scroll-spy') === activeSection.id;
        if (active) link.setAttribute('aria-current', 'location');
        else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
      });
    }
    var spyFrame = 0;
    window.addEventListener('scroll', function () {
      if (spyFrame) return;
      spyFrame = window.requestAnimationFrame(function () {
        updateScrollSpy();
        spyFrame = 0;
      });
    }, { passive: true });
    window.addEventListener('resize', updateScrollSpy);
    updateScrollSpy();
  }

  var sections = document.querySelectorAll('main > .section');
  if (sections.length) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach(function (section) { section.classList.add('visible'); });
    } else {
      var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          sectionObserver.unobserve(entry.target);
        });
      }, { threshold: 0.08 });
      sections.forEach(function (section) {
        section.classList.add('shutter-reveal');
        sectionObserver.observe(section);
      });
    }
  }

  var backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.textContent = '↑';
  backToTop.inert = true;
  backToTop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backToTop);
  function updateBackToTop() {
    var visible = window.scrollY > 420;
    backToTop.classList.toggle('is-visible', visible);
    backToTop.inert = !visible;
    backToTop.setAttribute('aria-hidden', String(!visible));
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  updateBackToTop();

  document.querySelectorAll('[data-count]').forEach(function (counter) {
    var target = Number(counter.getAttribute('data-count'));
    if (!Number.isFinite(target)) return;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      counter.textContent = String(target);
      return;
    }
    counter.textContent = '0';
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var start = performance.now();
        function tick(now) {
          var progress = Math.min(1, (now - start) / 800);
          counter.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
        countObserver.unobserve(counter);
      });
    }, { threshold: 0.65 });
    countObserver.observe(counter);
  });
})();

// Draw an ambient network behind the homepage video; motion pauses off-screen.
(function () {
  var visual = document.querySelector('.hero-brand-visual');
  if (!visual) return;
  var canvas = visual.querySelector('.hero-brand-network');
  var context = canvas && canvas.getContext('2d');
  if (!canvas || !context) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var particles = [];
  var pointer = { x: 0, y: 0, active: false };
  var visible = true;
  var frame = 0;
  var width = 0;
  var height = 0;
  var pixelRatio = 1;

  function resize() {
    var bounds = visual.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (!particles.length) {
      var count = Math.max(32, Math.min(64, Math.round(width / 7)));
      for (var index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.00012,
          vy: (Math.random() - 0.5) * 0.00012,
          radius: index % 7 === 0 ? 2 : 1.25,
          accent: index % 5 === 0
        });
      }
    }
    requestDraw();
  }

  function draw(time) {
    frame = 0;
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);

    particles.forEach(function (particle, index) {
      if (!reduced) {
        particle.x += particle.vx;
        particle.y += particle.vy + Math.sin(time * 0.00035 + index) * 0.000035;
        if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.vy *= -1;
        particle.x = Math.max(0.015, Math.min(0.985, particle.x));
        particle.y = Math.max(0.025, Math.min(0.975, particle.y));
      }
      particle.drawX = particle.x * width;
      particle.drawY = particle.y * height;
      if (pointer.active) {
        var dx = particle.drawX - pointer.x;
        var dy = particle.drawY - pointer.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 150 && distance > 0) {
          particle.drawX += (dx / distance) * (150 - distance) * 0.045;
          particle.drawY += (dy / distance) * (150 - distance) * 0.045;
        }
      }
    });

    particles.forEach(function (particle, index) {
      for (var next = index + 1; next < particles.length; next += 1) {
        var other = particles[next];
        var dx = particle.drawX - other.drawX;
        var dy = particle.drawY - other.drawY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 88) {
          context.beginPath();
          context.moveTo(particle.drawX, particle.drawY);
          context.lineTo(other.drawX, other.drawY);
          context.strokeStyle = 'rgba(217, 54, 31, ' + ((1 - distance / 88) * 0.18).toFixed(3) + ')';
          context.lineWidth = 0.7;
          context.stroke();
        }
      }
      context.beginPath();
      context.arc(particle.drawX, particle.drawY, particle.radius, 0, Math.PI * 2);
      context.fillStyle = particle.accent ? '#F26A52' : '#D9361F';
      context.globalAlpha = particle.radius > 1.5 ? 0.82 : 0.52;
      context.fill();
    });
    context.globalAlpha = 1;

    if (!reduced && visible) frame = window.requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame) frame = window.requestAnimationFrame(draw);
  }

  visual.addEventListener('pointermove', function (event) {
    var bounds = visual.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    requestDraw();
  });
  visual.addEventListener('pointerleave', function () {
    pointer.active = false;
    requestDraw();
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) requestDraw();
      else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { threshold: 0.05 });
    observer.observe(visual);
  }
  window.addEventListener('resize', resize);
  resize();
})();

// Keep a soft accent under the pointer on commerce and service cards.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.journey-card, .home-platform-card, .path-card, .vision-card').forEach(function (card) {
    card.addEventListener('pointermove', function (event) {
      var bounds = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', ((event.clientX - bounds.left) / bounds.width * 100).toFixed(1) + '%');
      card.style.setProperty('--pointer-y', ((event.clientY - bounds.top) / bounds.height * 100).toFixed(1) + '%');
    });
  });
})();

// Keep overview videos muted for autoplay and provide custom playback controls.
(function () {
  document.querySelectorAll('[data-system-video]').forEach(function (player) {
    var video = player.querySelector('video');
    var screen = player.querySelector('.system-player-screen');
    var playToggle = player.querySelector('[data-video-play]');
    var toggle = player.querySelector('[data-video-mute]');
    var label = player.querySelector('[data-mute-label]');
    var status = player.querySelector('[data-video-status]');
    var seek = player.querySelector('[data-video-seek]');
    var currentTimeLabel = player.querySelector('[data-video-current]');
    var durationLabel = player.querySelector('[data-video-duration]');
    var backToggle = player.querySelector('[data-video-back]');
    var forwardToggle = player.querySelector('[data-video-forward]');
    var fullscreenToggle = player.querySelector('[data-video-fullscreen]');
    if (!video || !screen || !playToggle || !toggle || !label) return;

    video.muted = true;
    video.defaultMuted = true;

    function formatTime(value) {
      if (!Number.isFinite(value) || value < 0) return '0:00';
      var totalSeconds = Math.floor(value);
      var seconds = String(totalSeconds % 60).padStart(2, '0');
      var minutes = Math.floor(totalSeconds / 60);
      if (minutes >= 60) {
        return Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0') + ':' + seconds;
      }
      return minutes + ':' + seconds;
    }

    function updateSeekState() {
      var duration = Number.isFinite(video.duration) ? video.duration : 0;
      var currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      if (currentTimeLabel) currentTimeLabel.textContent = formatTime(currentTime);
      if (durationLabel) durationLabel.textContent = formatTime(duration);
      if (seek) {
        var progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
        seek.disabled = duration <= 0;
        seek.value = String(Math.round(progress * 10));
        seek.setAttribute('aria-valuetext', formatTime(currentTime) + ' of ' + formatTime(duration));
        seek.parentElement.style.setProperty('--seek-progress', progress + '%');
      }
    }

    function updateAudioState() {
      var isMuted = video.muted;
      toggle.classList.toggle('is-unmuted', !isMuted);
      toggle.setAttribute('aria-label', isMuted ? 'Unmute video' : 'Mute video');
      toggle.setAttribute('aria-pressed', String(!isMuted));
      label.textContent = isMuted ? 'Unmute video' : 'Mute video';
    }

    function updatePlaybackState() {
      var isPaused = video.paused;
      playToggle.classList.toggle('is-paused', isPaused);
      playToggle.setAttribute('aria-label', isPaused ? 'Play video' : 'Pause video');
      playToggle.setAttribute('aria-pressed', String(!isPaused));
      screen.classList.toggle('is-playing', !isPaused);
    }

    function startPlayback() {
      var playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(function () {
          updatePlaybackState();
          if (status) status.textContent = 'Playback is blocked by this browser. Press play to start the overview.';
        });
      }
    }

    function seekBy(seconds) {
      if (!Number.isFinite(video.duration)) return;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      updateSeekState();
    }

    playToggle.addEventListener('click', function (event) {
      event.stopPropagation();
      if (video.paused) startPlayback();
      else {
        video.pause();
        updatePlaybackState();
      }
    });

    video.addEventListener('playing', function () {
      updatePlaybackState();
      player.classList.add('is-playing');
      updateSeekState();
      if (status) status.textContent = video.muted ? 'Overview playing with sound off.' : 'Overview playing with sound on.';
    });
    video.addEventListener('pause', function () {
      updatePlaybackState();
      player.classList.remove('is-playing');
      if (status) status.textContent = 'Overview paused. Press play to continue.';
    });
    video.addEventListener('timeupdate', updateSeekState);
    video.addEventListener('durationchange', updateSeekState);
    video.addEventListener('loadedmetadata', updateSeekState);
    video.addEventListener('seeked', updateSeekState);
    video.addEventListener('error', function () {
      updatePlaybackState();
      player.classList.remove('is-playing');
      updateSeekState();
      if (status) status.textContent = 'The video could not load. Check that media/salestrat-system.mp4 is present.';
    });
    screen.addEventListener('click', function (event) {
      if (event.target.closest('.system-video-controls')) return;
      if (video.paused) startPlayback();
      else {
        video.pause();
        updatePlaybackState();
      }
    });
    if (seek) {
      seek.addEventListener('input', function () {
        if (!Number.isFinite(video.duration)) return;
        video.currentTime = video.duration * (Number(seek.value) / 1000);
        updateSeekState();
      });
    }
    if (backToggle) backToggle.addEventListener('click', function () { seekBy(-10); });
    if (forwardToggle) forwardToggle.addEventListener('click', function () { seekBy(10); });
    toggle.addEventListener('click', function () {
      video.muted = !video.muted;
      updateAudioState();
    });
    if (fullscreenToggle) {
      if (!player.requestFullscreen) {
        fullscreenToggle.hidden = true;
      } else {
        fullscreenToggle.addEventListener('click', function () {
          if (document.fullscreenElement === player) {
            document.exitFullscreen();
            return;
          }
          var request = player.requestFullscreen();
          if (request && typeof request.catch === 'function') {
            request.catch(function () {
              if (status) status.textContent = 'Fullscreen is unavailable in this browser.';
            });
          }
        });
        document.addEventListener('fullscreenchange', function () {
          var isFullscreen = document.fullscreenElement === player;
          fullscreenToggle.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
          player.classList.toggle('is-fullscreen', isFullscreen);
        });
      }
    }

    updateAudioState();
    updatePlaybackState();
    updateSeekState();
    startPlayback();
  });
})();

(function () {
  document.querySelectorAll('[data-xai-explorer]').forEach(function (explorer) {
    var tabs = Array.prototype.slice.call(explorer.querySelectorAll('[role="tab"]'));
    var panel = explorer.querySelector('[role="tabpanel"]');
    var title = explorer.querySelector('[data-xai-benefit-title]');
    var description = explorer.querySelector('[data-xai-benefit-description]');
    if (!tabs.length || !panel || !title || !description) return;

    function activate(tab, moveFocus) {
      tabs.forEach(function (item) {
        var selected = item === tab;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      title.textContent = tab.getAttribute('data-benefit-title');
      description.textContent = tab.getAttribute('data-benefit-description');
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        activate(tab, false);
      });
      tab.addEventListener('keydown', function (event) {
        var nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(tabs[nextIndex], true);
      });
    });

    var selectedTab = tabs.find(function (tab) {
      return tab.getAttribute('aria-selected') === 'true';
    }) || tabs[0];
    activate(selectedTab, false);
  });
})();

(function () {
  document.querySelectorAll('[data-impact-explorer]').forEach(function (explorer) {
    var tabs = Array.prototype.slice.call(explorer.querySelectorAll('[data-impact-tab]'));
    var panel = explorer.querySelector('[role="tabpanel"]');
    var title = panel && panel.querySelector('[data-impact-title]');
    var description = panel && panel.querySelector('[data-impact-description]');
    if (!tabs.length || !panel || !title || !description) return;

    function activate(tab, moveFocus) {
      tabs.forEach(function (item) {
        var selected = item === tab;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      title.textContent = tab.getAttribute('data-impact-title');
      description.textContent = tab.getAttribute('data-impact-description');
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        activate(tab, false);
      });
      tab.addEventListener('keydown', function (event) {
        var nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(tabs[nextIndex], true);
      });
    });

    var selectedTab = tabs.find(function (tab) {
      return tab.getAttribute('aria-selected') === 'true';
    }) || tabs[0];
    activate(selectedTab, false);
  });
})();

(function () {
  document.querySelectorAll('.ai-hero-dashboard').forEach(function (dashboard) {
    var steps = Array.prototype.slice.call(dashboard.querySelectorAll('[data-ai-workflow-step]'));
    var detail = dashboard.querySelector('[data-ai-workflow-detail]');
    if (!steps.length || !detail) return;

    steps.forEach(function (step) {
      step.addEventListener('click', function () {
        steps.forEach(function (item) {
          var selected = item === step;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
        detail.textContent = step.getAttribute('data-ai-workflow-copy');
      });
    });
  });
})();
