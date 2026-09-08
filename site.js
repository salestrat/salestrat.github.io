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
              networkContext.strokeStyle = 'rgba(111, 190, 177, ' + ((1 - distance / 68) * 0.16).toFixed(3) + ')';
              networkContext.lineWidth = 0.7;
              networkContext.beginPath();
              networkContext.moveTo(particle.drawX, particle.drawY);
              networkContext.lineTo(other.drawX, other.drawY);
              networkContext.stroke();
            }
          });
        });
        particles.forEach(function (particle) {
          networkContext.fillStyle = particle.accent ? '#FF8B59' : '#67D5B0';
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
    var amount = max > 0 ? window.scrollY / max : 0;
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

// Inject the animated aurora backdrop once (kept out of HTML to avoid repeating
// the same markup on every page).
(function () {
  var aurora = document.createElement('div');
  aurora.className = 'bg-aurora';
  aurora.setAttribute('aria-hidden', 'true');
  aurora.innerHTML = '<span></span><span></span><span></span>';
  document.body.prepend(aurora);
})();

// A quiet site-wide particle field carries the same connected-data language
// behind every page without competing with readable content.
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  canvas.className = 'site-particle-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var context = canvas.getContext('2d');
  if (!context) return;
  var particles = [];
  var pointer = { x: 0.5, y: 0.5 };
  var easedPointer = { x: 0.5, y: 0.5 };
  var frame = 0;
  var resize = function () {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(window.innerWidth * ratio));
    canvas.height = Math.max(1, Math.round(window.innerHeight * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    var count = window.innerWidth < 700 ? 34 : 62;
    if (particles.length > count) particles.length = count;
    if (particles.length < count) {
      for (var i = 0; i < count; i += 1) {
        if (particles[i]) continue;
        particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.00016,
          vy: (Math.random() - 0.5) * 0.00012,
          size: i % 11 === 0 ? 2.2 : 1,
          accent: i % 8 === 0
        });
      }
    }
  };
  var draw = function (time) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    easedPointer.x += (pointer.x - easedPointer.x) * 0.08;
    easedPointer.y += (pointer.y - easedPointer.y) * 0.08;
    context.clearRect(0, 0, width, height);
    particles.forEach(function (particle, index) {
      if (!reduced) {
        particle.x += particle.vx;
        particle.y += particle.vy + Math.sin(time * 0.00035 + index) * 0.00004;
        if (particle.x < -0.04) particle.x = 1.04;
        if (particle.x > 1.04) particle.x = -0.04;
        if (particle.y < -0.04) particle.y = 1.04;
        if (particle.y > 1.04) particle.y = -0.04;
      }
      particle.drawX = particle.x * width + (easedPointer.x - 0.5) * 18;
      particle.drawY = particle.y * height + (easedPointer.y - 0.5) * 12;
    });
    particles.forEach(function (particle, index) {
      particles.slice(index + 1).forEach(function (other) {
        var dx = particle.drawX - other.drawX;
        var dy = particle.drawY - other.drawY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 118) {
          context.strokeStyle = 'rgba(111, 190, 177, ' + ((1 - distance / 118) * 0.12).toFixed(3) + ')';
          context.lineWidth = .6;
          context.beginPath();
          context.moveTo(particle.drawX, particle.drawY);
          context.lineTo(other.drawX, other.drawY);
          context.stroke();
        }
      });
    });
    particles.forEach(function (particle) {
      context.fillStyle = particle.accent ? '#FF8B59' : '#67D5B0';
      context.globalAlpha = particle.size > 2 ? .66 : .38;
      context.beginPath();
      context.arc(particle.drawX, particle.drawY, particle.size, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
    if (!reduced && !document.hidden) frame = window.requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', function (event) {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = event.clientY / window.innerHeight;
  }, { passive: true });
  draw(0);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
    } else if (!reduced) {
      frame = window.requestAnimationFrame(draw);
    }
  });
})();

// Mobile nav toggle
(function () {
  var btn = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      links.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      links.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
})();

// Desktop-only magnetic magnifying-glass cursor.
(function () {
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduced) return;
  var cursor = document.createElement('span');
  cursor.className = 'magnetic-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);
  var targetX = -50, targetY = -50, currentX = -50, currentY = -50;
  var visible = false;
  var frame = 0;
  function render() {
    currentX += (targetX - currentX) * .22;
    currentY += (targetY - currentY) * .22;
    cursor.style.transform = 'translate3d(' + currentX.toFixed(2) + 'px, ' + currentY.toFixed(2) + 'px, 0) translate(-50%, -50%) scale(' + (cursor.classList.contains('is-hovering') ? '1.18' : '.82') + ')';
    if (Math.abs(targetX - currentX) > .1 || Math.abs(targetY - currentY) > .1) frame = requestAnimationFrame(render);
    else frame = 0;
  }
  document.addEventListener('pointermove', function (event) {
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) {
      visible = true;
      cursor.classList.add('is-visible');
    }
    if (!frame) frame = requestAnimationFrame(render);
  }, { passive: true });
  document.addEventListener('pointerover', function (event) {
    var target = event.target.closest('a, button, [role="button"], input, textarea, select, [data-tilt]');
    if (target) cursor.classList.add('is-hovering');
  }, { passive: true });
  document.addEventListener('pointerout', function (event) {
    var target = event.target.closest('a, button, [role="button"], input, textarea, select, [data-tilt]');
    if (target && !target.contains(event.relatedTarget)) cursor.classList.remove('is-hovering');
  }, { passive: true });
  document.addEventListener('pointerleave', function () {
    cursor.classList.remove('is-visible', 'is-hovering');
    visible = false;
  });
})();

// Staggered, orchestrated scroll-reveal — one quiet pass, cascading within
// each group rather than popping in all at once.
(function () {
  document.querySelectorAll('.section > .container > .folio, .section > .container > h2, .section > .container > .lede, .post-header > *, .post-body > *, .ledger-cell, .marquee, .process-tab-list').forEach(function (el) {
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
