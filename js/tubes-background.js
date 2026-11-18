/**
 * SaleStrat - 3D Interactive Neon Tubes Background
 * 
 * High-performance 3D interactive background featuring glowing neon tubes
 * that follow the user's cursor in 3D space with dynamic lighting and
 * click-to-randomize color spectra.
 * 
 * Built with WebGL, Three.js and threejs-components (concept by Kevin Levron).
 */

(function (global) {
  'use strict';

  var BRAND_LIGHT_PALETTE = {
    tubes: ["#A40D27", "#E25C4B", "#C99E5C"],
    lights: ["#F21D3B", "#FF8A65", "#FFD166", "#79091F"]
  };

  var BRAND_DARK_PALETTE = {
    tubes: ["#FF4058", "#FF6978", "#FFB347"],
    lights: ["#F21D3B", "#FF4081", "#FFD54F", "#9C27B0"]
  };

  // Curated vibrant neon spectra for click interactions
  var CURATED_PALETTES = [
    // 1. Kevin Levron's signature neon (from the reference implementation)
    {
      tubes: ["#f967fb", "#53bc28", "#6958d5"],
      lights: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"]
    },
    // 2. Electric Cyberpunk
    {
      tubes: ["#00f0ff", "#ff0077", "#ffe600"],
      lights: ["#00ffea", "#ff00aa", "#ffea00", "#7928ca"]
    },
    // 3. Matrix & Aurora
    {
      tubes: ["#00ff87", "#60efff", "#0061ff"],
      lights: ["#10b981", "#06b6d4", "#3b82f6", "#047857"]
    },
    // 4. Synthwave Sunset
    {
      tubes: ["#ff5e3a", "#ff2a68", "#ff9500"],
      lights: ["#ff3b30", "#ff9500", "#ffcc00", "#ff2d55"]
    },
    // 5. Cosmic Orchid & Ultraviolet
    {
      tubes: ["#9d4edd", "#7b2cbf", "#e0aaff"],
      lights: ["#c77dff", "#7b2cbf", "#3c096c", "#5a189a"]
    },
    // 6. SaleStrat Radiant Crimson Fire
    {
      tubes: ["#FF1744", "#FF5252", "#FFD700"],
      lights: ["#D50000", "#FF1744", "#FF9100", "#FFEA00"]
    }
  ];

  function randomHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  function isDarkMode() {
    if (typeof document === 'undefined') return false;
    var theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  class TubesBackgroundController {
    constructor(options) {
      options = options || {};
      this.canvas = typeof options.canvas === 'string'
        ? document.querySelector(options.canvas)
        : (options.canvas || document.getElementById('hero-tubes-canvas'));

      if (!this.canvas) {
        console.warn('[TubesBackground] Canvas element #hero-tubes-canvas not found.');
        return;
      }

      this.container = options.container
        ? (typeof options.container === 'string' ? document.querySelector(options.container) : options.container)
        : (this.canvas.parentElement || document.body);

      this.enableClickInteraction = options.enableClickInteraction !== false;
      this.app = null;
      this.paletteIndex = 0;
      this.userHasRandomized = false;

      this.init();
    }

    init() {
      var TubesCursor = window.TubesCursor;
      if (!TubesCursor) {
        console.warn('[TubesBackground] window.TubesCursor not loaded yet, retrying...');
        setTimeout(() => this.init(), 100);
        return;
      }

      try {
        var dark = isDarkMode();
        var initialPalette = dark ? BRAND_DARK_PALETTE : BRAND_LIGHT_PALETTE;

        this.app = TubesCursor(this.canvas, {
          tubes: {
            colors: initialPalette.tubes,
            lights: {
              intensity: dark ? 220 : 195,
              colors: initialPalette.lights
            }
          }
        });

        this.setupEventListeners();
        this.setupThemeObserver();
      } catch (err) {
        console.error('[TubesBackground] Error initializing 3D tubes:', err);
      }
    }

    setupEventListeners() {
      if (!this.enableClickInteraction || !this.container) return;

      var _this = this;
      this.container.addEventListener('click', function (e) {
        if (e.target.closest('a, button, input, textarea, select, .theme-toggle, .nav-toggle, [role="button"]')) {
          return;
        }
        _this.randomizeColors();
      });
    }

    setupThemeObserver() {
      if (typeof window === 'undefined' || !window.MutationObserver) return;
      var _this = this;
      this.themeObserver = new MutationObserver(function () {
        if (!_this.userHasRandomized && _this.app && _this.app.tubes) {
          var dark = isDarkMode();
          var p = dark ? BRAND_DARK_PALETTE : BRAND_LIGHT_PALETTE;
          _this.app.tubes.setColors(p.tubes);
          _this.app.tubes.setLightsColors(p.lights);
          _this.app.tubes.setLightsIntensity(dark ? 220 : 195);
        }
      });

      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    randomizeColors() {
      if (!this.app || !this.app.tubes) return;
      this.userHasRandomized = true;

      var tubesColors;
      var lightsColors;

      if (this.paletteIndex < CURATED_PALETTES.length) {
        var p = CURATED_PALETTES[this.paletteIndex];
        tubesColors = p.tubes;
        lightsColors = p.lights;
        this.paletteIndex++;
      } else {
        tubesColors = [randomHexColor(), randomHexColor(), randomHexColor()];
        lightsColors = [randomHexColor(), randomHexColor(), randomHexColor(), randomHexColor()];
        if (Math.random() < 0.35) {
          this.paletteIndex = 0;
        }
      }

      this.app.tubes.setColors(tubesColors);
      this.app.tubes.setLightsColors(lightsColors);
    }

    destroy() {
      if (this.themeObserver) this.themeObserver.disconnect();
      if (this.app && typeof this.app.dispose === 'function') {
        this.app.dispose();
      }
    }
  }

  // Auto-initialize
  function start() {
    if (!window.tubesBackgroundInstance) {
      window.tubesBackgroundInstance = new TubesBackgroundController();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  global.TubesBackgroundController = TubesBackgroundController;

})(typeof window !== 'undefined' ? window : this);
