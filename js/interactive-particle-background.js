/**
 * InteractiveParticleBackground
 * 
 * High-performance, interactive particle bloom and dynamic flow field
 * inspired by the Google Antigravity hero backgrounds. Styled with SaleStrat's
 * bespoke brand palette.
 * 
 * Features:
 * - Fluid Anti-Gravity Motion: Particles inherit velocity and wake from mouse movement
 * - Proximity Bloom: Particles bloom with an ethereal luminous corona, expand in size,
 *   and brighten with an incandescent spark core when hovered or scrolled over
 * - Smooth Attack & Decay: Fast bloom response with a lingering glowing wake
 * - Cursor Scroll Interaction: Continues tracking cursor relative to canvas during page
 *   scrolls and wheel events, blooming particles as they scroll under the cursor and
 *   imparting floaty buoyant lift
 * - Ambient Cursor Aura: Warm radial spotlight around cursor illuminating the background
 * - Theme Awareness: Seamlessly switches between light and dark palettes when theme toggles
 * - DevicePixelRatio scaling, automatic pause on background tab and off-screen
 * - Full respect for prefers-reduced-motion
 */

(function (global) {
  'use strict';

  var LIGHT_PALETTE = [
    { base: '#5C1224', bloom: 'rgba(215, 38, 65, ', core: '#C81E38', spark: '#FFF0F2', weight: 0.28 },
    { base: '#A40D27', bloom: 'rgba(240, 30, 65, ', core: '#F52548', spark: '#FFF2F4', weight: 0.32 },
    { base: '#E25C4B', bloom: 'rgba(255, 115, 90, ', core: '#FF6E58', spark: '#FFF8F2', weight: 0.18 },
    { base: '#D99BA5', bloom: 'rgba(235, 145, 160, ', core: '#F08FA2', spark: '#FFF5F8', weight: 0.12 },
    { base: '#C99E5C', bloom: 'rgba(250, 190, 85, ', core: '#FFBF48', spark: '#FFFDF5', weight: 0.10 }
  ];

  var DARK_PALETTE = [
    { base: '#FF4058', bloom: 'rgba(255, 64, 88, ', core: '#FF5E73', spark: '#FFFFFF', weight: 0.30 },
    { base: '#F21D3B', bloom: 'rgba(255, 45, 75, ', core: '#FF3D5A', spark: '#FFFFFF', weight: 0.30 },
    { base: '#FF6978', bloom: 'rgba(255, 120, 135, ', core: '#FF8896', spark: '#FFFFFF', weight: 0.18 },
    { base: '#FFB347', bloom: 'rgba(255, 190, 85, ', core: '#FFC85E', spark: '#FFFDF5', weight: 0.12 },
    { base: '#FF9AA7', bloom: 'rgba(255, 170, 185, ', core: '#FFB3BF', spark: '#FFFFFF', weight: 0.10 }
  ];

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

    function pickWeightedPalette(palette) {
      var roll = Math.random();
      var sum = 0;
        for (var i = 0; i < palette.length; i++) {
          sum += palette[i].weight;
          if (roll <= sum) return { item: palette[i], index: i };
        }
        return { item: palette[0], index: 0 };
      }

      function isDarkModeActive() {
        if (typeof document === 'undefined') return false;
        var doc = document.documentElement;
        var themeAttr = doc.getAttribute('data-theme');
        if (themeAttr === 'dark') return true;
        if (themeAttr === 'light') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      class InteractiveParticleBackground {
        constructor(options) {
          options = options || {};

          this.canvas = typeof options.canvas === 'string'
            ? document.querySelector(options.canvas)
            : options.canvas;

          if (!this.canvas) {
            console.warn('[InteractiveParticleBackground] Canvas element not found.');
            return;
          }

          this.container = options.container
            ? (typeof options.container === 'string' ? document.querySelector(options.container) : options.container)
            : (this.canvas.parentElement || document.body);

          this.ctx = this.canvas.getContext('2d');
          if (!this.ctx) return;

          // Styling & Config
          this.isDark = isDarkModeActive();
          this.bloomRadius = options.bloomRadius || 170;
          this.repelRadius = options.repelRadius || 155;
          this.repelForce = options.repelForce || 1.35;
          this.returnSpring = options.returnSpring || 0.038;
          this.damping = options.damping || 0.90;

          // Dimensions & Canvas State
          this.width = 0;
          this.height = 0;
          this.dpr = 1;
          this.origin = { x: 0, y: 0 };

          // Particles & Ripples
          this.particles = [];
          this.ripples = [];

          // Pointer State
          this.pointer = {
            x: -9999,
            y: -9999,
            clientX: -9999,
            clientY: -9999,
            vx: 0,
            vy: 0,
            speed: 0,
            active: false,
            lastTime: 0,
            lastRippleTime: 0,
            lastRippleX: -9999,
            lastRippleY: -9999
          };

          this.lastScrollY = typeof window !== 'undefined'
            ? (window.pageYOffset || document.documentElement.scrollTop || 0)
            : 0;

          // Lifecycle & Performance State
          this.rafId = 0;
          this.lastTime = 0;
          this.inView = true;
          this.isTabActive = !document.hidden;

          // Motion Preference
          this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
          this.reducedMotion = this.motionQuery.matches;

          // Bind methods
          this.tick = this.tick.bind(this);
          this.handleResize = this.handleResize.bind(this);
          this.handleTouchMove = this.handleTouchMove.bind(this);
          this.handleTouchEnd = this.handleTouchEnd.bind(this);
          this.handleVisibility = this.handleVisibility.bind(this);
          this.handleMotionChange = this.handleMotionChange.bind(this);
          this.handleThemeChange = this.handleThemeChange.bind(this);

          this.init();
        }

        init() {
          this.setupCanvas();
          this.setupEvents();
          this.setupObservers();
          this.updateDimensions();

          if (this.reducedMotion) {
            this.renderStatic();
          } else {
            this.start();
          }
        }

        setupCanvas() {
          this.canvas.style.position = 'absolute';
          this.canvas.style.top = '0';
          this.canvas.style.left = '0';
          this.canvas.style.width = '100%';
          this.canvas.style.height = '100%';
          this.canvas.style.pointerEvents = 'none';
          this.canvas.style.userSelect = 'none';
          this.canvas.setAttribute('aria-hidden', 'true');
        }

        setupEvents() {
          var _this = this;

          this.handleWindowPointerMove = function (e) {
            _this.updatePointerFromEvent(e);
            _this.requestTick();
          };

          this.handleWindowPointerDown = function (e) {
            _this.updatePointerFromEvent(e);
            if (_this.pointer.active) {
              _this.addRipple(_this.pointer.x, _this.pointer.y, 1.4);
            }
            _this.requestTick();
          };

          this.handleWindowPointerLeave = function () {
            _this.pointer.active = false;
            _this.pointer.x = -9999;
            _this.pointer.y = -9999;
            _this.pointer.clientX = -9999;
            _this.pointer.clientY = -9999;
            _this.pointer.vx = 0;
            _this.pointer.vy = 0;
            _this.pointer.speed = 0;
            _this.requestTick();
          };

          this.handleWindowScroll = function () {
            _this.handleScroll();
          };

          this.handleWindowWheel = function (e) {
            _this.handleWheel(e);
          };

          window.addEventListener('pointermove', this.handleWindowPointerMove, { passive: true });
          window.addEventListener('pointerdown', this.handleWindowPointerDown, { passive: true });
          document.addEventListener('mouseleave', this.handleWindowPointerLeave, { passive: true });
          window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
          window.addEventListener('wheel', this.handleWindowWheel, { passive: true });

          var target = this.container;
          target.addEventListener('touchmove', this.handleTouchMove, { passive: true });
          target.addEventListener('touchend', this.handleTouchEnd, { passive: true });
          target.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });

          document.addEventListener('visibilitychange', this.handleVisibility);

          if (this.motionQuery.addEventListener) {
            this.motionQuery.addEventListener('change', this.handleMotionChange);
          } else if (this.motionQuery.addListener) {
            this.motionQuery.addListener(this.handleMotionChange);
          }

          if (typeof window !== 'undefined' && window.MutationObserver) {
            this.themeObserver = new MutationObserver(function () {
              _this.handleThemeChange();
            });
            this.themeObserver.observe(document.documentElement, {
              attributes: true,
              attributeFilter: ['data-theme']
            });
          }
        }

        setupObservers() {
          if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(this.handleResize);
            this.resizeObserver.observe(this.container);
          } else {
            window.addEventListener('resize', this.handleResize, { passive: true });
          }

          if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
              this.inView = entries[0].isIntersecting;
              if (this.inView) {
                if (!this.reducedMotion && this.isTabActive) this.start();
              } else {
                this.stop();
              }
          }, { threshold: 0.02, rootMargin: '80px 0px' });
          this.intersectionObserver.observe(this.container);
        }
      }

      handleResize() {
        this.updateDimensions();
      }

      updateDimensions() {
        var rect = this.container.getBoundingClientRect();
        var newWidth = Math.round(rect.width) || window.innerWidth;
        var newHeight = Math.round(rect.height) || (this.container.offsetHeight || 640);

        if (newWidth <= 0 || newHeight <= 0) return;

        this.width = newWidth;
        this.height = newHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        if (this.width >= 860) {
          this.origin.x = this.width * 0.54;
          this.origin.y = this.height * 0.44;
        } else {
          this.origin.x = this.width * 0.50;
          this.origin.y = this.height * 0.38;
        }

        this.createParticles();

        if (this.reducedMotion) {
          this.renderStatic();
        } else {
          this.requestTick();
        }
      }

      createParticles() {
        var w = this.width;
        var h = this.height;

        var baseCount = Math.round((w * h) / 1650);
        var particleCount = clamp(baseCount, 210, 560);

        var cornerDist = Math.hypot(
          Math.max(this.origin.x, w - this.origin.x),
          Math.max(this.origin.y, h - this.origin.y)
        );
        var maxRadius = cornerDist * 1.05;
        var minRadius = Math.max(20, Math.min(w, h) * 0.05);

        var spokes = w >= 860 ? 46 : 30;
        var newParticles = [];
        var activePalette = this.isDark ? DARK_PALETTE : LIGHT_PALETTE;

        for (var i = 0; i < particleCount; i++) {
          var distribution = Math.random();
          var baseAngle;
          var baseRadius;

          if (distribution < 0.68) {
            var spokeIdx = i % spokes;
            var spokeAngle = (spokeIdx / spokes) * Math.PI * 2;
            var jitter = (Math.random() - 0.5) * ((Math.PI * 2 / spokes) * 0.42);
            baseAngle = spokeAngle + jitter;
            var rRatio = Math.pow(Math.random(), 0.76);
            baseRadius = minRadius + (maxRadius - minRadius) * rRatio;
          } else if (distribution < 0.91) {
            var orbitBands = [0.24, 0.43, 0.64, 0.84];
            var orbitBand = orbitBands[Math.floor(Math.random() * orbitBands.length)];
            baseAngle = Math.random() * Math.PI * 2;
            baseRadius = minRadius + (maxRadius - minRadius) * orbitBand + (Math.random() - 0.5) * maxRadius * 0.055;
          } else {
            baseAngle = Math.random() * Math.PI * 2;
            baseRadius = minRadius + (maxRadius - minRadius) * Math.sqrt(Math.random());
          }

          var tierRoll = Math.random();
          var size;
          var alpha;
          var isGlowNode = false;

          // Depth factor (z) gives 3D parallax and varied responsiveness
          var z = 0.65 + Math.random() * 0.85;

          if (tierRoll > 0.90) {
            size = (2.5 + Math.random() * 1.0) * (0.8 + z * 0.25);
            alpha = 0.65 + Math.random() * 0.25;
            isGlowNode = true;
          } else if (tierRoll > 0.70) {
            size = (1.4 + Math.random() * 0.8) * (0.8 + z * 0.22);
            alpha = 0.44 + Math.random() * 0.28;
          } else {
            size = (0.75 + Math.random() * 0.7) * (0.8 + z * 0.2);
            alpha = 0.28 + Math.random() * 0.28;
          }

          var palSelection = pickWeightedPalette(activePalette);
          var palObj = palSelection.item;
          var palIndex = palSelection.index;

          var isAccentTrail = palIndex === 2 || palIndex === 4;
          var isEnergyTrail = isAccentTrail && Math.random() < 0.24;
          var spinSpeed = (Math.random() - 0.5) * 0.00012;
          var radialSpeed = 0.00045 + Math.random() * 0.00085;
          var radialPhase = Math.random() * Math.PI * 2;
          var radialAmp = 5 + Math.random() * 14;

          var swaySpeedX = 0.0006 + Math.random() * 0.0007;
          var swaySpeedY = 0.0005 + Math.random() * 0.0007;
          var swayPhaseX = Math.random() * Math.PI * 2;
          var swayPhaseY = Math.random() * Math.PI * 2;
          var swayAmp = 2 + Math.random() * 6;
          var streakLength = isEnergyTrail ? 12 + Math.random() * 14 : 3.5 + Math.random() * 8.5;

          var initialX = this.origin.x + Math.cos(baseAngle) * baseRadius;
          var initialY = this.origin.y + Math.sin(baseAngle) * baseRadius;

          newParticles.push({
            baseAngle: baseAngle,
            baseRadius: baseRadius,
            spinSpeed: spinSpeed,
            radialSpeed: radialSpeed,
            radialPhase: radialPhase,
            radialAmp: radialAmp,
            swaySpeedX: swaySpeedX,
            swaySpeedY: swaySpeedY,
            swayPhaseX: swayPhaseX,
            swayPhaseY: swayPhaseY,
            swayAmp: swayAmp,
            size: size,
            alpha: alpha,
            z: z,
            bloom: 0,
            targetBloom: 0,
            paletteIndex: palIndex,
            palette: palObj,
            isGlowNode: isGlowNode,
            isEnergyTrail: isEnergyTrail,
            streakLength: streakLength,
            orbitDirection: Math.random() < 0.5 ? -1 : 1,
            breatheSpeed: 0.0007 + Math.random() * 0.0011,
            breathePhase: Math.random() * Math.PI * 2,
            x: initialX,
            y: initialY,
            vx: 0,
            vy: 0
          });
        }

        this.particles = newParticles;
      }

      handleThemeChange() {
        var currentDark = isDarkModeActive();
        if (this.isDark === currentDark) return;
        this.isDark = currentDark;
        var activePalette = this.isDark ? DARK_PALETTE : LIGHT_PALETTE;

        for (var i = 0; i < this.particles.length; i++) {
          var p = this.particles[i];
          p.palette = activePalette[p.paletteIndex % activePalette.length];
        }

        this.requestTick();
      }

      addRipple(x, y, intensity) {
        if (this.reducedMotion) return;
        intensity = intensity || 1.0;
        this.ripples.push({
          x: x,
          y: y,
          born: performance.now(),
          duration: 1200,
          speed: 0.28,
          intensity: intensity
        });

          if (this.ripples.length > 6) {
            this.ripples.shift();
          }
        }

        updatePointerFromEvent(event) {
          if (this.reducedMotion) return;
          this.pointer.clientX = event.clientX;
          this.pointer.clientY = event.clientY;

          var rect = this.canvas.getBoundingClientRect();
          var margin = 60;
          var isInside = (
            event.clientX >= rect.left - margin &&
            event.clientX <= rect.right + margin &&
            event.clientY >= rect.top - margin &&
            event.clientY <= rect.bottom + margin
          );

          if (!isInside) {
            this.pointer.active = false;
            this.pointer.vx *= 0.6;
            this.pointer.vy *= 0.6;
            return;
          }

          var newX = event.clientX - rect.left;
          var newY = event.clientY - rect.top;

          var now = performance.now();
          var dt = this.pointer.lastTime ? clamp((now - this.pointer.lastTime) / 16.67, 0.4, 3.0) : 1;
          this.pointer.lastTime = now;

          if (this.pointer.active && this.pointer.x > -9000) {
            var rawVx = (newX - this.pointer.x) / dt;
            var rawVy = (newY - this.pointer.y) / dt;
            // Smooth pointer velocity for organic fluid wake
            this.pointer.vx = this.pointer.vx * 0.58 + rawVx * 0.42;
            this.pointer.vy = this.pointer.vy * 0.58 + rawVy * 0.42;
            this.pointer.speed = Math.hypot(this.pointer.vx, this.pointer.vy);
          } else {
            this.pointer.vx = 0;
            this.pointer.vy = 0;
            this.pointer.speed = 0;
          }

          this.pointer.x = newX;
          this.pointer.y = newY;
          this.pointer.active = true;

          // Subtle ripple on movement
          var dist = Math.hypot(this.pointer.x - this.pointer.lastRippleX, this.pointer.y - this.pointer.lastRippleY);
            if (now - this.pointer.lastRippleTime > 190 && dist > 32 && this.pointer.speed > 3.2) {
              this.addRipple(this.pointer.x, this.pointer.y, 0.65);
              this.pointer.lastRippleTime = now;
              this.pointer.lastRippleX = this.pointer.x;
              this.pointer.lastRippleY = this.pointer.y;
            }
          }

            handleScroll() {
              if (this.reducedMotion) return;
            var currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            var scrollDy = currentScrollY - this.lastScrollY;
            this.lastScrollY = currentScrollY;

              if (this.pointer.clientX >= 0 && this.pointer.clientY >= 0) {
                var rect = this.canvas.getBoundingClientRect();
                var margin = 60;
                var isInside = (
                  this.pointer.clientX >= rect.left - margin &&
                  this.pointer.clientX <= rect.right + margin &&
                  this.pointer.clientY >= rect.top - margin &&
                  this.pointer.clientY <= rect.bottom + margin
                );

                if (isInside) {
                  var prevY = this.pointer.y;
                  this.pointer.x = this.pointer.clientX - rect.left;
                  this.pointer.y = this.pointer.clientY - rect.top;
                  var moveY = this.pointer.y - prevY;
                  this.pointer.vy = this.pointer.vy * 0.5 + (moveY * 0.5);
                  this.pointer.speed = Math.hypot(this.pointer.vx, this.pointer.vy);
                  this.pointer.active = true;
                } else {
                  this.pointer.active = false;
                }
              }

              // Impart buoyant vertical anti-gravity breeze when scrolling
              if (Math.abs(scrollDy) > 0.5 && this.inView) {
                var impulse = clamp(scrollDy * -0.042, -3.5, 3.5);
                for (var i = 0; i < this.particles.length; i++) {
                  var p = this.particles[i];
                  p.vy += impulse * p.z;
                  p.vx += Math.cos(p.baseAngle) * impulse * 0.25;
                }
              }

              this.requestTick();
            }

              handleWheel(e) {
                if (this.reducedMotion || !this.inView) return;
                if (e.deltaY) {
                  var wheelImpulse = clamp(e.deltaY * -0.022, -2.5, 2.5);
                  for (var i = 0; i < this.particles.length; i++) {
                    var p = this.particles[i];
                    p.vy += wheelImpulse * p.z;
                  }
                  this.requestTick();
                }
              }

              handleTouchMove(event) {
                if (this.reducedMotion || !event.touches || event.touches.length === 0) return;
                var touch = event.touches[0];
                this.updatePointerFromEvent(touch);
                this.requestTick();
              }

              handleTouchEnd() {
                this.pointer.active = false;
                this.pointer.x = -9999;
                this.pointer.y = -9999;
                this.pointer.clientX = -9999;
                this.pointer.clientY = -9999;
                this.requestTick();
              }

              handleVisibility() {
                this.isTabActive = !document.hidden;
                if (!this.isTabActive) {
                  this.stop();
                } else if (this.inView && !this.reducedMotion) {
                  this.start();
                }
              }

              handleMotionChange(event) {
                this.reducedMotion = event.matches;
                if (this.reducedMotion) {
                  this.stop();
                  this.renderStatic();
                } else {
                  this.start();
                }
              }

              start() {
                if (this.rafId || this.reducedMotion) return;
                this.lastTime = performance.now();
                this.rafId = window.requestAnimationFrame(this.tick);
              }

              stop() {
                if (this.rafId) {
                  window.cancelAnimationFrame(this.rafId);
                  this.rafId = 0;
                }
                this.lastTime = 0;
              }

              requestTick() {
                if (!this.rafId && this.inView && this.isTabActive && !this.reducedMotion) {
                  this.start();
                }
              }

              tick(time) {
                this.rafId = 0;
                if (!this.inView || !this.isTabActive || this.reducedMotion) return;

                var delta = this.lastTime ? (time - this.lastTime) / 16.67 : 1;
                delta = clamp(delta, 0.25, 2.2);
                this.lastTime = time;

                this.updateAndDraw(time, delta);

                this.rafId = window.requestAnimationFrame(this.tick);
              }

              updateAndDraw(time, dt) {
                var ctx = this.ctx;
                var w = this.width;
                var h = this.height;
                var isDark = this.isDark;

                ctx.clearRect(0, 0, w, h);

                this.drawOrbitGuides(time, isDark);

                var pointerActive = this.pointer.active;
                var px = this.pointer.x;
                var py = this.pointer.y;
                var cursorVx = this.pointer.vx;
                var cursorVy = this.pointer.vy;
                var cursorSpeed = this.pointer.speed;

                // Gradually decay pointer velocity when mouse stops
                this.pointer.vx *= Math.pow(0.85, dt);
                this.pointer.vy *= Math.pow(0.85, dt);
                this.pointer.speed = Math.hypot(this.pointer.vx, this.pointer.vy);

                // Ambient cursor spotlight aura in background
                if (pointerActive && px > -100 && px < w + 100 && py > -100 && py < h + 100) {
                  var cursorGlowR = 210;
                  var cursorGrad = ctx.createRadialGradient(px, py, 0, px, py, cursorGlowR);
                  if (isDark) {
                    cursorGrad.addColorStop(0, 'rgba(255, 50, 80, 0.14)');
                    cursorGrad.addColorStop(0.42, 'rgba(255, 105, 120, 0.05)');
                    cursorGrad.addColorStop(1, 'rgba(255, 50, 80, 0)');
                  } else {
                    cursorGrad.addColorStop(0, 'rgba(226, 92, 75, 0.08)');
                    cursorGrad.addColorStop(0.45, 'rgba(201, 158, 92, 0.03)');
                    cursorGrad.addColorStop(1, 'rgba(226, 92, 75, 0)');
                  }
                  ctx.save();
                  ctx.globalAlpha = 1;
                  ctx.fillStyle = cursorGrad;
                  ctx.beginPath();
                  ctx.arc(px, py, cursorGlowR, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();
                }

                var bloomR = this.bloomRadius;
                var repelR = this.repelRadius;
                var repelF = this.repelForce;
                var spring = this.returnSpring;
                var dampingPow = Math.pow(this.damping, dt);

                var activeRipples = this.ripples;
                var rippleCount = activeRipples.length;

                // Update & Render Particles
                for (var i = 0; i < this.particles.length; i++) {
                  var p = this.particles[i];

                  // 1. Natural harmonic anchor calculation
                  var curAngle = p.baseAngle + time * p.spinSpeed;
                  var curRadius = p.baseRadius + Math.sin(time * p.radialSpeed + p.radialPhase) * p.radialAmp;
                  var driftX = Math.sin(time * p.swaySpeedX + p.swayPhaseX) * p.swayAmp;
                  var driftY = Math.cos(time * p.swaySpeedY + p.swayPhaseY) * p.swayAmp;

                  var anchorX = this.origin.x + Math.cos(curAngle) * curRadius + driftX;
                  var anchorY = this.origin.y + Math.sin(curAngle) * curRadius + driftY;

                  // 2. Mouse Proximity Bloom & Dynamic Momentum ("Move as per the mouse")
                  if (pointerActive) {
                    var dx = p.x - px;
                    var dy = p.y - py;
                    var dist = Math.hypot(dx, dy);

                    // Proximity Bloom: particle lights up when cursor hovers or scrolls over it
                    if (dist < bloomR) {
                      var bloomProximity = 1 - (dist / bloomR);
                      var targetBloom = Math.pow(bloomProximity, 1.25);
                      // Dynamic excitation when cursor sweeps fast
                      if (cursorSpeed > 1.2) {
                        targetBloom = Math.min(1, targetBloom * (1 + Math.min(cursorSpeed * 0.08, 0.45)));
                      }
                      p.targetBloom = targetBloom;
                    } else {
                      p.targetBloom = 0;
                    }

                    // Anti-Gravity Movement: particles swept by cursor wake & parted organically
                    if (dist < repelR && dist > 0.1) {
                      var ratio = 1 - (dist / repelR);

                      // A) Drag Momentum: particles inherit velocity along mouse stroke
                      var dragFactor = Math.pow(ratio, 1.3) * (0.32 * p.z);
                      p.vx += cursorVx * dragFactor * dt;
                      p.vy += cursorVy * dragFactor * dt;

                      // B) Anti-gravity buoyant deflection & gentle tangential swirl
                      var unitX = dx / dist;
                      var unitY = dy / dist;
                      var swirlX = -unitY * p.orbitDirection;
                      var swirlY = unitX * p.orbitDirection;

                      var repelAcc = Math.pow(ratio, 1.6) * repelF * (1.6 * p.z);
                      p.vx += (unitX * 0.72 + swirlX * 0.38) * repelAcc * dt;
                      p.vy += (unitY * 0.72 + swirlY * 0.38) * repelAcc * dt;
                    }
                  } else {
                    p.targetBloom = 0;
                  }

                  // Fast attack (quick bloom on hover) and gentle decay (lingering glowing trail)
                  var bloomLerp = p.targetBloom > p.bloom ? 0.28 : 0.065;
                  p.bloom += (p.targetBloom - p.bloom) * bloomLerp * dt;
                  if (p.bloom < 0.005) p.bloom = 0;

                  // 3. Ripple Impulse & Shockwave Bloom
                  for (var r = 0; r < rippleCount; r++) {
                    var rip = activeRipples[r];
                    var age = time - rip.born;
                    if (age > 0 && age < rip.duration) {
                      var waveR = age * rip.speed;
                      var rx = p.x - rip.x;
                      var ry = p.y - rip.y;
                      var rDist = Math.hypot(rx, ry);
                      var deltaR = rDist - waveR;

                        if (Math.abs(deltaR) < 36 && rDist > 0.1) {
                          var waveProgress = 1 - (age / rip.duration);
                          var waveIntensity = Math.exp(-Math.pow(deltaR / 16, 2)) * waveProgress * rip.intensity;
                          p.vx += (rx / rDist) * waveIntensity * 0.65 * dt;
                          p.vy += (ry / rDist) * waveIntensity * 0.65 * dt;
                          // Ripple wave triggers bloom flare!
                          p.bloom = Math.min(1, p.bloom + waveIntensity * 0.52);
                        }
                      }
                    }

                    // 4. Spring Return towards Natural Anchor (Floaty anti-gravity suspension)
                    var pullX = anchorX - p.x;
                    var pullY = anchorY - p.y;
                    p.vx += pullX * spring * dt;
                    p.vy += pullY * spring * dt;

                    // 5. Damping Friction & Velocity Clamp
                    p.vx *= dampingPow;
                    p.vy *= dampingPow;
                    p.vx = clamp(p.vx, -12, 12);
                    p.vy = clamp(p.vy, -12, 12);

                    // 6. Position Integration
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;

                    // 7. Visual Rendering: Orbital flow vector & dynamic bloom states
                    var flowX = Math.cos(curAngle) * 0.36 - Math.sin(curAngle) * p.orbitDirection * 0.93;
                    var flowY = Math.sin(curAngle) * 0.36 + Math.cos(curAngle) * p.orbitDirection * 0.93;

                    var isBlooming = p.bloom > 0.02;

                    // A) Radiant atmospheric bloom halo around blooming particles
                    if (isBlooming) {
                      var glowRadius = (p.size * 3.2 + p.bloom * 18.0) * p.z;
                      var coronaAlpha = p.bloom * (isDark ? 0.62 : 0.44);

                      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
                      grad.addColorStop(0, p.palette.bloom + coronaAlpha.toFixed(3) + ')');
                      grad.addColorStop(0.35, p.palette.bloom + (coronaAlpha * 0.45).toFixed(3) + ')');
                      grad.addColorStop(1, p.palette.bloom + '0)');

                      ctx.save();
                      ctx.globalAlpha = 1;
                      ctx.fillStyle = grad;
                      ctx.beginPath();
                      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
                      ctx.fill();
                      ctx.restore();
                    }

                    // B) Particle Core & Streak
                    var currentSize = p.size * (1 + p.bloom * 1.45);
                    var currentStreak = p.streakLength * (1 + p.bloom * 0.85);
                    var breathe = 0.72 + Math.sin(time * p.breatheSpeed + p.breathePhase) * 0.28;
                    var baseAlpha = p.alpha * breathe * (p.isEnergyTrail ? 0.88 : 1);
                    var currentAlpha = clamp(baseAlpha + p.bloom * 0.65, 0, 1);

                    var renderColor = p.bloom > 0.25 ? p.palette.core : p.palette.base;

                    ctx.globalAlpha = currentAlpha;
                    ctx.fillStyle = renderColor;
                    ctx.strokeStyle = renderColor;
                    ctx.lineWidth = (p.isEnergyTrail ? 1.2 : Math.max(0.65, currentSize * 0.68)) * (1 + p.bloom * 0.5);
                    ctx.lineCap = 'round';

                    // Draw elongated flow streak
                    ctx.beginPath();
                    ctx.moveTo(p.x - flowX * currentStreak, p.y - flowY * currentStreak);
                    ctx.lineTo(p.x + flowX * currentSize, p.y + flowY * currentSize);
                    ctx.stroke();

                    // Draw particle node
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentSize * 0.62, 0, Math.PI * 2);
                    ctx.fill();

                      // C) Incandescent white/cream optical spark center on strong bloom
                      if (p.bloom > 0.22) {
                        var sparkAlpha = (p.bloom - 0.22) / 0.78;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, currentSize * 0.38, 0, Math.PI * 2);
                        ctx.fillStyle = p.palette.spark;
                        ctx.globalAlpha = sparkAlpha * (isDark ? 0.95 : 0.85);
                        ctx.fill();
                      }

                      // D) Ambient halo on designated glow nodes when not blooming
                      if (p.isGlowNode && !isBlooming) {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * 2.3, 0, Math.PI * 2);
                        ctx.globalAlpha = p.alpha * 0.22;
                        ctx.fillStyle = p.palette.base;
                        ctx.fill();
                      }
                    }

                    // Render Expanding Ripples
                    if (rippleCount > 0) {
                      var remainingRipples = [];
                      for (var k = 0; k < rippleCount; k++) {
                        var ripObj = activeRipples[k];
                        var rAge = time - ripObj.born;
                        if (rAge > 0 && rAge < ripObj.duration) {
                          remainingRipples.push(ripObj);
                          var rProgress = rAge / ripObj.duration;
                          var currentRadius = rAge * ripObj.speed;
                          var strokeAlpha = (1 - rProgress) * 0.24 * ripObj.intensity;

                          ctx.beginPath();
                          ctx.arc(ripObj.x, ripObj.y, currentRadius, 0, Math.PI * 2);
                          ctx.strokeStyle = isDark
                            ? 'rgba(255, 64, 88, ' + strokeAlpha.toFixed(3) + ')'
                            : 'rgba(226, 92, 75, ' + strokeAlpha.toFixed(3) + ')';
                          ctx.lineWidth = 1.15;
                          ctx.stroke();
                        }
                      }
                      this.ripples = remainingRipples;
                    }

                    ctx.globalAlpha = 1;
                  }

                    drawOrbitGuides(time, isDark) {
                      var ctx = this.ctx;
                      var w = this.width;
                      var h = this.height;
                      var limit = Math.hypot(w, h) * 0.42;

      var bands = isDark ? [
                        { x: 0.29, y: 0.19, rotation: -0.22, color: '255, 64, 88', phase: 0.2, length: Math.PI * 1.35, alpha: 0.14 },
                        { x: 0.48, y: 0.31, rotation: 0.18, color: '255, 105, 120', phase: 2.1, length: Math.PI * 1.5, alpha: 0.12 },
                        { x: 0.7, y: 0.43, rotation: -0.1, color: '255, 179, 71', phase: 4.0, length: Math.PI * 0.48, alpha: 0.16 }
                      ] : [
                        { x: 0.29, y: 0.19, rotation: -0.22, color: '92, 18, 36', phase: 0.2, length: Math.PI * 1.35, alpha: 0.105 },
                        { x: 0.48, y: 0.31, rotation: 0.18, color: '164, 13, 39', phase: 2.1, length: Math.PI * 1.5, alpha: 0.105 },
                        { x: 0.7, y: 0.43, rotation: -0.1, color: '201, 158, 92', phase: 4.0, length: Math.PI * 0.48, alpha: 0.12 }
                      ];

                      ctx.save();
                      ctx.lineWidth = 0.8;
                      for (var i = 0; i < bands.length; i++) {
                        var band = bands[i];
                        var rotation = band.rotation + time * (i === 2 ? -0.000012 : 0.000009);
                        var start = band.phase + time * 0.000018;
                        ctx.globalAlpha = band.alpha;
                        ctx.strokeStyle = 'rgba(' + band.color + ', 1)';
                        ctx.beginPath();
                        ctx.ellipse(
                          this.origin.x,
                          this.origin.y,
                          Math.min(limit * band.x, w * 0.72),
                          Math.min(limit * band.y, h * 0.7),
                          rotation,
                          start,
                          start + band.length
                        );
                        ctx.stroke();
                      }
                      ctx.restore();
                    }

                    renderStatic() {
                      var ctx = this.ctx;
                      var w = this.width;
                      var h = this.height;
                      var isDark = this.isDark;

                      ctx.clearRect(0, 0, w, h);
                      this.drawOrbitGuides(0, isDark);

                      for (var i = 0; i < this.particles.length; i++) {
                        var p = this.particles[i];
                        var staticX = this.origin.x + Math.cos(p.baseAngle) * p.baseRadius;
                        var staticY = this.origin.y + Math.sin(p.baseAngle) * p.baseRadius;

                        ctx.globalAlpha = p.alpha;
                        ctx.fillStyle = p.palette.base;
                        ctx.strokeStyle = p.palette.base;
                        ctx.lineWidth = p.isEnergyTrail ? 1.15 : Math.max(0.65, p.size * 0.72);
                        ctx.lineCap = 'round';

                        var flowX = Math.cos(p.baseAngle) * 0.36 - Math.sin(p.baseAngle) * p.orbitDirection * 0.93;
                        var flowY = Math.sin(p.baseAngle) * 0.36 + Math.cos(p.baseAngle) * p.orbitDirection * 0.93;

                        ctx.beginPath();
                        ctx.moveTo(staticX - flowX * p.streakLength, staticY - flowY * p.streakLength);
                        ctx.lineTo(staticX + flowX * p.size, staticY + flowY * p.size);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(staticX, staticY, p.size * 0.62, 0, Math.PI * 2);
                        ctx.fill();

                        if (p.isGlowNode) {
                          ctx.beginPath();
                          ctx.arc(staticX, staticY, p.size * 2.3, 0, Math.PI * 2);
                          ctx.globalAlpha = p.alpha * 0.22;
                          ctx.fill();
                        }
                      }

                      ctx.globalAlpha = 1;
                    }

                    destroy() {
                      this.stop();
                      if (this.resizeObserver) {
                        this.resizeObserver.disconnect();
                      } else {
                        window.removeEventListener('resize', this.handleResize);
                      }
                      if (this.intersectionObserver) {
                        this.intersectionObserver.disconnect();
                      }
                      if (this.themeObserver) {
                        this.themeObserver.disconnect();
                      }
                      document.removeEventListener('visibilitychange', this.handleVisibility);

                      window.removeEventListener('pointermove', this.handleWindowPointerMove);
                      window.removeEventListener('pointerdown', this.handleWindowPointerDown);
                      document.removeEventListener('mouseleave', this.handleWindowPointerLeave);
                      window.removeEventListener('scroll', this.handleWindowScroll);
                      window.removeEventListener('wheel', this.handleWindowWheel);

                      var target = this.container;
                      target.removeEventListener('touchmove', this.handleTouchMove);
                      target.removeEventListener('touchend', this.handleTouchEnd);
                      target.removeEventListener('touchcancel', this.handleTouchEnd);
                    }

    static initAll(selector) {
                      selector = selector || '[data-radial-particles], [data-interactive-particles]';
                      var canvases = document.querySelectorAll(selector);
                      var instances = [];
                      canvases.forEach(function (canvas) {
                        if (!canvas._particleInstance) {
                          var inst = new InteractiveParticleBackground({ canvas: canvas });
                          canvas._particleInstance = inst;
                          instances.push(inst);
                        }
                      });
                      return instances;
                    }
                  }

                  // Auto-initialize when DOM is ready
                  if (typeof document !== 'undefined') {
                    if (document.readyState === 'loading') {
                      document.addEventListener('DOMContentLoaded', function () {
                        InteractiveParticleBackground.initAll();
                      });
                    } else {
                      InteractiveParticleBackground.initAll();
                    }
                  }

                  // Expose globally
                  global.InteractiveParticleBackground = InteractiveParticleBackground;

                }) (typeof window !== 'undefined' ? window : this);
