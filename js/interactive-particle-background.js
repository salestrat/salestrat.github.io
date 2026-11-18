/**
 * InteractiveParticleBackground
 * 
 * High-performance, interactive radial burst particle system inspired by
 * Google Antigravity hero backgrounds. Styled with SaleStrat's brand palette.
 * 
 * Features:
 * - Radial waves and orbiting filaments in SaleStrat green and orange
 * - Fine directional streaks with subtle breathing and harmonic drift
 * - Mouse & touch repulsion: particles gently part away from the cursor
 * - Smooth spring-damped return to anchor positions when cursor leaves
 * - Subtle expanding ripple shockwaves on pointer movement and clicks
 * - DevicePixelRatio scaling, dynamic particle count, window resize handling
 * - Automatic pause on background tab (visibilitychange) and off-screen (IntersectionObserver)
 * - Full respect for prefers-reduced-motion
 */

(function (global) {
  'use strict';

  var DEFAULT_COLORS = [
    '#5C1224',
    '#A40D27',
    '#E25C4B',
    '#D99BA5',
    '#C99E5C'
  ];

  var DEFAULT_COLOR_WEIGHTS = [0.28, 0.32, 0.18, 0.12, 0.10];

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function pickWeightedColor(colors, weights) {
    var roll = Math.random();
    var sum = 0;
    for (var i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (roll <= sum) return colors[i];
    }
    return colors[0];
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
      this.colors = options.colors || DEFAULT_COLORS;
      this.colorWeights = options.colorWeights || DEFAULT_COLOR_WEIGHTS;
      this.repelRadius = options.repelRadius || 170;
      this.repelForce = options.repelForce || 1.25;
      this.returnSpring = options.returnSpring || 0.045;
      this.damping = options.damping || 0.88;

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
        active: false,
        lastRippleTime: 0,
        lastRippleX: -9999,
        lastRippleY: -9999
      };

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
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerLeave = this.handlePointerLeave.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleVisibility = this.handleVisibility.bind(this);
      this.handleMotionChange = this.handleMotionChange.bind(this);

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
      // Ensure canvas sits in the background without interfering with user interaction
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
      // Container captures mouse and touch events while canvas remains non-blocking
      var target = this.container;

      target.addEventListener('pointermove', this.handlePointerMove, { passive: true });
      target.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
      target.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
      target.addEventListener('pointercancel', this.handlePointerLeave, { passive: true });

      target.addEventListener('touchmove', this.handleTouchMove, { passive: true });
      target.addEventListener('touchend', this.handleTouchEnd, { passive: true });
      target.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });

      document.addEventListener('visibilitychange', this.handleVisibility);

      if (this.motionQuery.addEventListener) {
        this.motionQuery.addEventListener('change', this.handleMotionChange);
      } else if (this.motionQuery.addListener) {
        this.motionQuery.addListener(this.handleMotionChange);
      }
    }

    setupObservers() {
      // ResizeObserver handles dimension changes gracefully
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(this.container);
      } else {
        window.addEventListener('resize', this.handleResize, { passive: true });
      }

      // IntersectionObserver stops rendering when hero is out of viewport
      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          this.inView = entries[0].isIntersecting;
          if (this.inView) {
            if (!this.reducedMotion && this.isTabActive) this.start();
          } else {
            this.stop();
          }
        }, { threshold: 0.02, rootMargin: '60px 0px' });
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

      // Determine the radial epicenter:
      // Desktop: slightly right-of-center (focal balance next to hero text)
      // Mobile: centered in top-mid region
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
      var particleCount = clamp(baseCount, 190, 580);

      var cornerDist = Math.hypot(
        Math.max(this.origin.x, w - this.origin.x),
        Math.max(this.origin.y, h - this.origin.y)
      );
      var maxRadius = cornerDist * 1.04;
      var minRadius = Math.max(20, Math.min(w, h) * 0.05);

      // Radial burst structure: spokes + ambient scatter
      var spokes = w >= 860 ? 46 : 30;
      var newParticles = [];

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

        if (tierRoll > 0.90) {
          size = 2.6 + Math.random() * 1.0;
          alpha = 0.62 + Math.random() * 0.24;
          isGlowNode = true;
        } else if (tierRoll > 0.70) {
          size = 1.5 + Math.random() * 0.8;
          alpha = 0.42 + Math.random() * 0.28;
        } else {
          size = 0.8 + Math.random() * 0.7;
          alpha = 0.3 + Math.random() * 0.3;
        }

        var color = pickWeightedColor(this.colors, this.colorWeights);
        var isAccentTrail = color === '#E25C4B' || color === '#C99E5C';
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
        var streakLength = isEnergyTrail ? 12 + Math.random() * 14 : 3 + Math.random() * 8;

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
          color: color,
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

    addRipple(x, y, intensity) {
      if (this.reducedMotion) return;
      intensity = intensity || 1.0;
      this.ripples.push({
        x: x,
        y: y,
        born: performance.now(),
        duration: 1300,
        speed: 0.26,
        intensity: intensity
      });

      // Keep ripples array compact
      if (this.ripples.length > 7) {
        this.ripples.shift();
      }
    }

    updatePointerFromEvent(event) {
      var rect = this.canvas.getBoundingClientRect();
      this.pointer.x = event.clientX - rect.left;
      this.pointer.y = event.clientY - rect.top;
      this.pointer.active = true;

      // Spawn subtle ripple if cursor moved enough and time elapsed
      var now = performance.now();
      var dist = Math.hypot(this.pointer.x - this.pointer.lastRippleX, this.pointer.y - this.pointer.lastRippleY);
      if (now - this.pointer.lastRippleTime > 190 && dist > 24) {
        this.addRipple(this.pointer.x, this.pointer.y, 0.75);
        this.pointer.lastRippleTime = now;
        this.pointer.lastRippleX = this.pointer.x;
        this.pointer.lastRippleY = this.pointer.y;
      }
    }

    handlePointerMove(event) {
      if (this.reducedMotion) return;
      this.updatePointerFromEvent(event);
      this.requestTick();
    }

    handlePointerDown(event) {
      if (this.reducedMotion) return;
      this.updatePointerFromEvent(event);
      this.addRipple(this.pointer.x, this.pointer.y, 1.4);
      this.requestTick();
    }

    handlePointerLeave() {
      this.pointer.active = false;
      this.pointer.x = -9999;
      this.pointer.y = -9999;
      this.requestTick();
    }

    handleTouchMove(event) {
      if (this.reducedMotion || !event.touches || event.touches.length === 0) return;
      var touch = event.touches[0];
      var rect = this.canvas.getBoundingClientRect();
      this.pointer.x = touch.clientX - rect.left;
      this.pointer.y = touch.clientY - rect.top;
      this.pointer.active = true;

      var now = performance.now();
      var dist = Math.hypot(this.pointer.x - this.pointer.lastRippleX, this.pointer.y - this.pointer.lastRippleY);
      if (now - this.pointer.lastRippleTime > 200 && dist > 20) {
        this.addRipple(this.pointer.x, this.pointer.y, 0.8);
        this.pointer.lastRippleTime = now;
        this.pointer.lastRippleX = this.pointer.x;
        this.pointer.lastRippleY = this.pointer.y;
      }
      this.requestTick();
    }

    handleTouchEnd() {
      this.handlePointerLeave();
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

      ctx.clearRect(0, 0, w, h);

      this.drawOrbitGuides(time);

      var pointerActive = this.pointer.active;
      var px = this.pointer.x;
      var py = this.pointer.y;
      var repelR = this.repelRadius;
      var repelF = this.repelForce;
      var spring = this.returnSpring;
      var dampingPow = Math.pow(this.damping, dt);

      // Active ripples array
      var activeRipples = this.ripples;
      var rippleCount = activeRipples.length;

      // Update & Draw Particles
      for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];

        // 1. Calculate natural organic anchor position
        var curAngle = p.baseAngle + time * p.spinSpeed;
        var curRadius = p.baseRadius + Math.sin(time * p.radialSpeed + p.radialPhase) * p.radialAmp;
        var driftX = Math.sin(time * p.swaySpeedX + p.swayPhaseX) * p.swayAmp;
        var driftY = Math.cos(time * p.swaySpeedY + p.swayPhaseY) * p.swayAmp;

        var anchorX = this.origin.x + Math.cos(curAngle) * curRadius + driftX;
        var anchorY = this.origin.y + Math.sin(curAngle) * curRadius + driftY;

        // 2. Mouse Repulsion Force
        if (pointerActive) {
          var dx = p.x - px;
          var dy = p.y - py;
          var dist = Math.hypot(dx, dy);

          if (dist < repelR && dist > 0.1) {
            var ratio = 1 - (dist / repelR);
            var repelAcc = Math.pow(ratio, 1.5) * repelF * 1.35;
            p.vx += (dx / dist) * repelAcc * dt;
            p.vy += (dy / dist) * repelAcc * dt;
          }
        }

        // 3. Ripple Impulse Wave
        for (var r = 0; r < rippleCount; r++) {
          var rip = activeRipples[r];
          var age = time - rip.born;
          if (age > 0 && age < rip.duration) {
            var waveR = age * rip.speed;
            var rx = p.x - rip.x;
            var ry = p.y - rip.y;
            var rDist = Math.hypot(rx, ry);
            var deltaR = rDist - waveR;

            if (Math.abs(deltaR) < 32 && rDist > 0.1) {
              var waveProgress = 1 - (age / rip.duration);
              var waveIntensity = Math.exp(-Math.pow(deltaR / 15, 2)) * waveProgress * rip.intensity * 0.55;
              p.vx += (rx / rDist) * waveIntensity * dt;
              p.vy += (ry / rDist) * waveIntensity * dt;
            }
          }
        }

        // 4. Spring Return towards Anchor
        var pullX = anchorX - p.x;
        var pullY = anchorY - p.y;
        p.vx += pullX * spring * dt;
        p.vy += pullY * spring * dt;

        // 5. Damping Friction
        p.vx *= dampingPow;
        p.vy *= dampingPow;

        // 6. Velocity Clamp
        p.vx = clamp(p.vx, -8.5, 8.5);
        p.vy = clamp(p.vy, -8.5, 8.5);

        // 7. Position Integration
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 8. Render a fine streak along the particle's orbital flow.
        var flowX = Math.cos(curAngle) * 0.36 - Math.sin(curAngle) * p.orbitDirection * 0.93;
        var flowY = Math.sin(curAngle) * 0.36 + Math.cos(curAngle) * p.orbitDirection * 0.93;
        var breathe = 0.72 + Math.sin(time * p.breatheSpeed + p.breathePhase) * 0.28;
        ctx.globalAlpha = p.alpha * breathe * (p.isEnergyTrail ? 0.86 : 1);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.isEnergyTrail ? 1.15 : Math.max(0.65, p.size * 0.72);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - flowX * p.streakLength, p.y - flowY * p.streakLength);
        ctx.lineTo(p.x + flowX * p.size, p.y + flowY * p.size);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.62, 0, Math.PI * 2);
        ctx.fill();

        if (p.isGlowNode) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.3, 0, Math.PI * 2);
          ctx.globalAlpha = p.alpha * 0.22;
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
            var strokeAlpha = (1 - rProgress) * 0.20 * ripObj.intensity;

            ctx.beginPath();
            ctx.arc(ripObj.x, ripObj.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(226, 92, 75, ' + strokeAlpha.toFixed(3) + ')';
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
        }
        this.ripples = remainingRipples;
      }

      ctx.globalAlpha = 1;
    }

    drawOrbitGuides(time) {
      var ctx = this.ctx;
      var w = this.width;
      var h = this.height;
      var limit = Math.hypot(w, h) * 0.42;
      var bands = [
        { x: 0.29, y: 0.19, rotation: -0.22, color: '92, 18, 36', phase: 0.2, length: Math.PI * 1.35 },
        { x: 0.48, y: 0.31, rotation: 0.18, color: '164, 13, 39', phase: 2.1, length: Math.PI * 1.5 },
        { x: 0.7, y: 0.43, rotation: -0.1, color: '201, 158, 92', phase: 4.0, length: Math.PI * 0.48 }
      ];

      ctx.save();
      ctx.lineWidth = 0.8;
      for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        var rotation = band.rotation + time * (i === 2 ? -0.000012 : 0.000009);
        var start = band.phase + time * 0.000018;
        ctx.globalAlpha = i === 2 ? 0.12 : 0.105;
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

      ctx.clearRect(0, 0, w, h);
      this.drawOrbitGuides(0);

      for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];
        var staticX = this.origin.x + Math.cos(p.baseAngle) * p.baseRadius;
        var staticY = this.origin.y + Math.sin(p.baseAngle) * p.baseRadius;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.isEnergyTrail ? 1.15 : Math.max(0.65, p.size * 0.72);
        ctx.lineCap = 'round';
        ctx.beginPath();
        var flowX = Math.cos(p.baseAngle) * 0.36 - Math.sin(p.baseAngle) * p.orbitDirection * 0.93;
        var flowY = Math.sin(p.baseAngle) * 0.36 + Math.cos(p.baseAngle) * p.orbitDirection * 0.93;
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
      document.removeEventListener('visibilitychange', this.handleVisibility);

      var target = this.container;
      target.removeEventListener('pointermove', this.handlePointerMove);
      target.removeEventListener('pointerdown', this.handlePointerDown);
      target.removeEventListener('pointerleave', this.handlePointerLeave);
      target.removeEventListener('pointercancel', this.handlePointerLeave);
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

})(typeof window !== 'undefined' ? window : this);
