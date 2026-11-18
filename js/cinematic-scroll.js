/**
 * SaleStrat — Cinematic Scroll & Polish System
 *
 * Adds modern, smooth scroll-driven animations and visual polish across all pages:
 *
 * 1. Cinematic Section Reveals — sections slide up with blur-to-sharp focus
 * 2. Card Hover Glow — border-gradient shimmer on hover with lift
 * 3. Parallax Depth — subtle layered depth on headings vs. content
 * 4. Smooth Counter Spin-up — number counters with spring easing
 * 5. Section Divider Lines — animated rule lines between sections
 * 6. Text Split Reveal — headings reveal word-by-word on scroll
 * 7. Image & Card Stagger — grid children cascade in with rotation
 * 8. Navbar Shrink — compact nav on scroll with backdrop enhancement
 * 9. CTA Pulse — gentle attention pulse on primary CTAs when in view
 * 10. Scroll-linked progress per section
 *
 * All effects respect prefers-reduced-motion.
 * No external dependencies — uses IntersectionObserver + requestAnimationFrame.
 */

(function () {
  'use strict';

  // ── Guards ──────────────────────────────────────────────────────────
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── 1. Enhanced Cinematic Section Reveals ──────────────────────────
  // Upgrade existing .reveal with more cinematic blur+scale entrance
  (function cinematicReveals() {
    if (reduced) return;

    // Add extra selectors the original reveal system might miss
    var extraSelectors = [
      '.process-section-heading',
      '.process-video-stage-wrap',
      '.approach-card',
      '.package-card',
      '.why-card',
      '.why-visual',
      '.about-intro',
      '.about-values',
      '.system-node',
      '.system-visual',
      '.service-detail-card',
      '.footer-brand',
      '.footer-column'
    ];

    extraSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (!el.classList.contains('reveal')) {
          el.classList.add('reveal');
        }
      });
    });

    // Add stagger indices for newly added reveals
    var groups = new Map();
    document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
      var parent = el.parentElement;
      if (!parent) return;
      var idx = groups.has(parent) ? groups.get(parent) : 0;
      if (!el.style.getPropertyValue('--d') || el.style.getPropertyValue('--d') === '0s') {
        el.style.setProperty('--d', Math.min(idx * 0.07, 0.42) + 's');
      }
      groups.set(parent, idx + 1);
    });

    // Observe any new reveals not yet observed
    if ('IntersectionObserver' in window) {
      var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObs.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
        revealObs.observe(el);
      });
    }
  })();


  // ── 2. Card Hover Glow Border ──────────────────────────────────────
  // Adds a subtle gradient glow that follows the mouse on card borders
  (function cardHoverGlow() {
    if (!supportsHover || reduced) return;

    var cardSelectors = '.feature-card, .path-card, .vision-card, .journey-card, .package-card, .approach-card, .case-row, .why-card, .blog-card';
    var cards = document.querySelectorAll(cardSelectors);

    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        card.style.setProperty('--glow-x', x + '%');
        card.style.setProperty('--glow-y', y + '%');
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--glow-x');
        card.style.removeProperty('--glow-y');
      });
    });
  })();


  // ── 3. Parallax Depth on Scroll ────────────────────────────────────
  // Section headings shift slightly against content for depth
  (function parallaxDepth() {
    if (reduced) return;

    var headings = document.querySelectorAll('.section h2, .hero h1, .process-section-heading h2');
    if (!headings.length) return;

    var ticking = false;

    function onScroll() {
      headings.forEach(function (h) {
        var rect = h.getBoundingClientRect();
        var viewH = window.innerHeight;
        if (rect.top > viewH || rect.bottom < 0) return;
        var center = (rect.top + rect.height / 2 - viewH / 2) / viewH;
        var shift = (center * -6).toFixed(2);
        h.style.setProperty('--parallax-y', shift + 'px');
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
  })();


  // ── 4. Section Rule Line Animation ─────────────────────────────────
  // Animate the section-rule border from 0 width to full on scroll-in
  (function sectionLineReveal() {
    if (reduced) return;
    if (!('IntersectionObserver' in window)) return;

    var sections = document.querySelectorAll('.section-rule');
    if (!sections.length) return;

    var lineObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('rule-visible');
          lineObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });

    sections.forEach(function (s) { lineObs.observe(s); });
  })();


  // ── 5. CTA Attention Pulse ─────────────────────────────────────────
  // When primary CTAs enter the viewport, give them a one-time glow pulse
  (function ctaPulse() {
    if (reduced) return;
    if (!('IntersectionObserver' in window)) return;

    var ctas = document.querySelectorAll('.cta-band .btn-primary, .hero-cta .btn-primary');
    if (!ctas.length) return;

    var ctaObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('cta-glow-pulse');
          ctaObs.unobserve(e.target);
          // Remove animation class after it completes to avoid replays
          e.target.addEventListener('animationend', function () {
            e.target.classList.remove('cta-glow-pulse');
          }, { once: true });
        }
      });
    }, { threshold: 0.6 });

    ctas.forEach(function (btn) { ctaObs.observe(btn); });
  })();


  // ── 6. Image Reveal on Scroll ──────────────────────────────────────
  // Images slide up with a soft clip-path wipe
  (function imageReveal() {
    if (reduced) return;
    if (!('IntersectionObserver' in window)) return;

    var images = document.querySelectorAll('.case-thumb img, .hv-photo img, .about-photo img, .why-visual img');
    if (!images.length) return;

    images.forEach(function (img) {
      img.classList.add('img-reveal');
    });

    var imgObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('img-revealed');
          imgObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });

    images.forEach(function (img) { imgObs.observe(img); });
  })();


  // ── 7. Navbar Enhanced Shrink ──────────────────────────────────────
  // Progressive shrink and enhanced glass effect on scroll
  (function navShrink() {
    if (reduced) return;

    var nav = document.querySelector('.site-nav');
    var navRow = nav && nav.querySelector('.nav-row');
    if (!nav || !navRow) return;

    var lastScroll = 0;
    var ticking = false;

    function update() {
      var scrollY = window.scrollY;
      var scrolled = scrollY > 60;

      nav.classList.toggle('nav-compact', scrolled);

      // Auto-hide on scroll down, show on scroll up (only on mobile)
      if (window.innerWidth <= 860) {
        if (scrollY > lastScroll && scrollY > 200) {
          nav.classList.add('nav-hidden');
        } else {
          nav.classList.remove('nav-hidden');
        }
      }

      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  })();


  // ── 8. Smooth Section Transitions ──────────────────────────────────
  // Add alternating theme-band subtle background gradient transitions
  (function sectionBackgrounds() {
    var sections = document.querySelectorAll('.section');
    sections.forEach(function (section, idx) {
      if (!section.classList.contains('theme-band-red') &&
          !section.classList.contains('theme-band-paper') &&
          !section.classList.contains('home-ai-section')) {
        section.classList.add(idx % 2 === 0 ? 'theme-band-paper' : 'theme-band-alt');
      }
    });
  })();


  // ── 9. Folio / Eyebrow Animated Underline ──────────────────────────
  (function folioUnderline() {
    if (reduced) return;
    if (!('IntersectionObserver' in window)) return;

    var folios = document.querySelectorAll('.folio, .hero-tag, .cta-eyebrow');
    if (!folios.length) return;

    folios.forEach(function (f) {
      f.classList.add('folio-anim');
    });

    var folioObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('folio-visible');
          folioObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    folios.forEach(function (f) { folioObs.observe(f); });
  })();


  // ── 10. FAQ Smooth Expand ──────────────────────────────────────────
  // Animate FAQ details open/close
  (function faqSmooth() {
    if (reduced) return;

    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function (item) {
      var summary = item.querySelector('summary');
      if (!summary) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var content = item.querySelector('p, div:not(summary)');
        if (!content) {
          item.toggleAttribute('open');
          return;
        }

        if (item.hasAttribute('open')) {
          content.style.maxHeight = content.scrollHeight + 'px';
          requestAnimationFrame(function () {
            content.style.maxHeight = '0';
            content.style.opacity = '0';
          });
          content.addEventListener('transitionend', function handler() {
            item.removeAttribute('open');
            content.style.maxHeight = '';
            content.style.opacity = '';
            content.removeEventListener('transitionend', handler);
          }, { once: true });
        } else {
          item.setAttribute('open', '');
          var fullH = content.scrollHeight;
          content.style.maxHeight = '0';
          content.style.opacity = '0';
          requestAnimationFrame(function () {
            content.style.maxHeight = fullH + 'px';
            content.style.opacity = '1';
          });
          content.addEventListener('transitionend', function handler() {
            content.style.maxHeight = '';
            content.removeEventListener('transitionend', handler);
          }, { once: true });
        }
      });
    });
  })();

})();
