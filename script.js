/* ==========================================================================
   SaleStrat — shared script
   Used by /index.html, /services/design-build.html, /services/manage-grow.html
   ========================================================================== */

document.documentElement.classList.add('js');

var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- SCROLL ENGINE: Lenis on desktop, native on mobile ----
   Guarded so a failed/blocked CDN load can never take the rest of the
   page's JS down with it (mobile menu, chat, reveals all share this file). */
(function () {
  var isMobile = window.innerWidth <= 768;
  if (isMobile || prefersReducedMotion || typeof Lenis === 'undefined') return;
  try {
    var lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  } catch (e) { /* smooth scroll is an enhancement, not a requirement */ }
})();

/* ---- ANCHOR SCROLL (same-page only; cross-page "../index.html#x" links
   are left to normal browser navigation) ---- */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = this.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    var menu = document.getElementById('nav-menu');
    if (menu && menu.classList.contains('active')) toggleMenu(true);
  });
});

/* ---- MOBILE MENU ---- */
var mobileBtn = document.getElementById('mobile-menu-toggle');
var navMenu = document.getElementById('nav-menu');
function toggleMenu(forceClose) {
  if (!navMenu) return;
  var isActive = navMenu.classList.contains('active');
  if (forceClose || isActive) {
    navMenu.classList.remove('active');
    document.body.style.overflow = '';
  } else {
    navMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}
if (mobileBtn) mobileBtn.addEventListener('click', function () { toggleMenu(false); });

/* ---- THEME TOGGLE — defaults to system preference; a manual click
   overrides it for the rest of this visit (no persistence, so this stays
   safe in sandboxed preview contexts that block storage APIs). ---- */
(function () {
  var userSet = false;
  function applyDeviceTheme() {
    if (userSet) return;
    var light = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.classList.toggle('light-mode', !!light);
  }
  applyDeviceTheme();
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyDeviceTheme);
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      userSet = true;
      document.documentElement.classList.toggle('light-mode');
    });
  }
})();

/* ---- SCROLL PROGRESS BAR ---- */
(function () {
  var bar = document.getElementById('scroll-progress');
  if (!bar) return;
  function update() {
    var h = document.body.scrollHeight - window.innerHeight;
    bar.style.width = h > 0 ? Math.min((window.scrollY / h) * 100, 100) + '%' : '0%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---- SCROLL REVEAL — one-shot fade/rise ---- */
(function () {
  var elems = document.querySelectorAll('.reveal-elem');
  if (!elems.length) return;
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    elems.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  elems.forEach(function (el) { obs.observe(el); });
})();

/* ---- ACTIVE NAV HIGHLIGHT ---- */
(function () {
  var sections = document.querySelectorAll('section[id]');
  var links = document.querySelectorAll('.nav-links a[href^="#"]:not(.nav-cta)');
  if (!sections.length || !links.length) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (l) {
        l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function (s) { obs.observe(s); });
})();

/* ---- STAT COUNTER ---- */
(function () {
  var counters = document.querySelectorAll('.stat-n[data-count]');
  if (!counters.length) return;
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  function animateCounter(el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix !== undefined ? el.dataset.prefix : (suffix === 'L+' ? '₹' : '');
    var isFloat = target !== Math.floor(target);
    var duration = prefersReducedMotion ? 1 : 1400;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = easeOut(progress);
      var val = target * eased;
      el.textContent = prefix + (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + (isFloat ? target.toFixed(1) : target) + suffix;
    }
    requestAnimationFrame(step);
  }

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(function (c) { obs.observe(c); });
})();

/* ---- HERO WORD CYCLE — crossfades through a few outcome words ---- */
(function () {
  var el = document.getElementById('word-cycle');
  if (!el) return;
  var spans = el.querySelectorAll('span');
  if (spans.length < 2 || prefersReducedMotion) return;
  var i = 0;
  setInterval(function () {
    spans[i].classList.remove('on');
    i = (i + 1) % spans.length;
    spans[i].classList.add('on');
  }, 2600);
})();

/* ---- MINI TREND CHART on case cards ---- */
(function () {
  var boxes = document.querySelectorAll('.chart-box[data-trend]');
  boxes.forEach(function (box) {
    var vals = box.dataset.trend.split(',').map(Number);
    var color = box.dataset.color === 'o' ? 'var(--orange-2)' : 'var(--green-2)';
    var w = 240, h = 64, pad = 4;
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var range = (max - min) || 1;
    var pts = vals.map(function (v, i) {
      var x = pad + (i / (vals.length - 1)) * (w - pad * 2);
      var y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    var path = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var areaPath = path + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + h + ' L' + pts[0][0].toFixed(1) + ',' + h + ' Z';
    var uid = 'grad-' + Math.random().toString(36).slice(2, 8);
    box.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.35"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + areaPath + '" fill="url(#' + uid + ')" stroke="none"/>' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + pts[pts.length - 1][0].toFixed(1) + '" cy="' + pts[pts.length - 1][1].toFixed(1) + '" r="3.5" fill="' + color + '"/>' +
      '</svg>';
  });
})();

/* ==========================================================================
   CHATBOT — "StratAI"
   Knowledge base ported as-is from the original site; only the surrounding
   UI wiring was rebuilt to match the new markup.
   ========================================================================== */
(function () {
  var launcher = document.getElementById('chat-launcher');
  var win = document.getElementById('chat-window');
  if (!launcher || !win) return;

  var closeBtn = document.getElementById('chat-close');
  var messagesEl = document.getElementById('chat-messages');
  var qrEl = document.getElementById('chat-qr');
  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  var tooltip = document.getElementById('chat-tooltip');
  var notif = document.getElementById('chat-notif');
  var isOpen = false;
  var initialized = false;

  var KB = [
    {
      patterns: /^(hi|hello|hey|greetings|buddy|bro|man|mate|what's up|sup|how are you|howdy|hey there)[\s?!.]*$/i,
      answer: "Hey there! \ud83d\udc4b I'm **StratAI**, Suryaprakash's assistant here on the site.\n\nAre you looking to build a website/online store, or grow one you already have?"
    },
    {
      patterns: /(contact|reach|call|book|audit|hire|work|yes|sure|talk|meeting|whatsapp|schedule|let's do it|ok|okay|yep|yeah)/i,
      answer: "Perfect. Let's look at what you actually need and whether I'm the right fit. \n\nChoose how you'd like to connect below:\n\n<div class='sai-actions'><a href='https://calendly.com/s64861004/30min' target='_blank' class='sai-action-btn'>\ud83d\udcc5 Claim Free Audit</a><a href='https://wa.me/917757075336' target='_blank' class='sai-action-btn'>\ud83d\udcac WhatsApp</a></div>"
    },
    {
      patterns: /(what do you do|what do you offer|your services|what services|full services|everything you (do|offer)|services (do|you) provide)/i,
      answer: "I cover two things: \ud83c\udfaf\n\n**Design & Build** \u2014 website & online store design, UI/UX, Shopify/WooCommerce setup\n**Manage & Grow** \u2014 e-commerce management, Meta Ads, SEO, automation\n\nWhich one do you need right now?"
    },
    {
      patterns: /(ui\/ux|ux design|ui design|user experience|redesign|looks outdated|looks old)/i,
      answer: "A good design isn't just decoration \u2014 it's what makes someone trust you enough to buy or enquire. \ud83c\udfa8\n\nI design clean, mobile-first websites and store interfaces, built around how your actual customers browse and decide. Want to see the kind of layout I'd suggest for your business?"
    },
    {
      patterns: /(bad leads|junk leads|quality|cpl|cost per lead)/i,
      answer: "If you're getting cheap leads but zero sales, you're buying clicks, not intent. \ud83d\udcc9\n\nI fix this by overhauling your ad copy to act as a **filter, not a magnet**. We push CPA up slightly, but drastically increase your backend closing rate. Want me to audit your current creatives?"
    },
    {
      patterns: /(expensive|cpa|roas dropping|high cost)/i,
      answer: "When CPA spikes, it's usually one of three things: \n1. Creative fatigue.\n2. Broken tracking feeding bad data.\n3. Friction on the landing page or store.\n\nI run a quick audit to find exactly which one is bleeding your budget. Shall we take a look? \ud83d\udd0d"
    },
    {
      patterns: /(amazon|flipkart|meesho|marketplace|seller central|seller hub|a\+ content|acos\b)/i,
      answer: "Winning on Amazon & Flipkart isn't just about listing a product \u2014 it's rank, ads, and account health working together. \ud83c\udfc6\n\nI handle seller account setup, SEO-rich listings with A+ content, Sponsored Ads (PPC) to control your ACOS, and catalog/inventory sync so you never go out of stock. Want a free audit of your current listings?"
    },
    {
      patterns: /(rto\b|return to origin|refund|order management|dispatch|fulfilment|fulfillment|buy box)/i,
      answer: "High RTO and a lost Buy Box quietly kill marketplace margins. \ud83d\udce6\n\nI tighten listing accuracy, sizing/description clarity, and COD risk filters to cut RTO, and clean up your catalog to win back the Buy Box. Want me to look at your current numbers?"
    },
    {
      patterns: /(shopify|woocommerce|online store|store website|store design|ecommerce|e-commerce|cart|inventory|catalog)/i,
      answer: "Ads and traffic without a solid store behind them just burn budget. \ud83d\uded2\n\nI design and manage the full backend \u2014 brand-new Shopify/WooCommerce builds or fixes to your current one, catalog & inventory hygiene, checkout fixes, and automated abandoned-cart recovery \u2014 so every visitor actually converts. Want me to audit your store's checkout flow?"
    },
    {
      patterns: /(website|landing page|funnel|vsl|new site|need a site)/i,
      answer: "A good website is often the first thing that makes someone trust you enough to buy. \ud83c\udfa8\n\nI design and build clean, fast, mobile-friendly websites and online stores \u2014 with basic SEO built in from day one so people can actually find it. Want to see what that could look like for your business?"
    },
    {
      patterns: /(price|cost|rate|budget|fee|how much)/i,
      answer: "Depends on the lane. \ud83d\udcb0\n\n**Design & Build** is a one-time project fee based on scope \u2014 a few pages vs. a full store.\n**Manage & Grow** is a monthly retainer once you're live.\n\nTell me which one you need and I'll give you a straight answer, not a vague range."
    },
    {
      patterns: /(guarantee|promise|surety)/i,
      answer: "I won't guarantee a specific ROAS or ranking on day one \u2014 anyone who does is guessing. \n\nWhat I *do* guarantee: clean technical execution, transparent weekly updates, and honest advice even when it's not what you want to hear. Sound fair?"
    },
    {
      patterns: /(roas|roi|results|case study|proof|portfolio)/i,
      answer: "Numbers speak louder than words. Average across active client accounts: **3.2\u00d7 ROAS** and a **45%+ conversion uplift**.\n\nRecently, I took a buried Amazon listing to a **Top 5 category rank** and a fitness offer to **\u20b92L/month MRR in 60 days**. Scroll up to the Results section for the full breakdown, or ask me for references directly. What are you trying to hit this quarter?"
    },
    {
      patterns: /(automation|zapier|make|crm|hubspot|whatsapp bot|follow.?up)/i,
      answer: "Leads are useless if they rot in a spreadsheet or an unanswered WhatsApp. \ud83e\udd16\n\nI set up automated follow-ups \u2014 WhatsApp, email, or CRM (Zapier, HubSpot, Klaviyo) \u2014 so a lead gets a response within minutes, even when you're busy running the actual business. Should we map out your backend?"
    },
    {
      patterns: /(ads|meta|google|facebook|pmax|campaign)/i,
      answer: "Are you just throwing money at Meta hoping it sticks? \n\nI focus on **Algorithmic Media Buying** \u2014 using Meta Advantage+ and Google PMax to train the algorithm on high-intent buyers, forcing your cost-per-result down. Want me to run a free audit on your ad account?"
    },
    {
      patterns: /(sell online|start selling|launch (a |my )?(store|brand)|new brand|just starting out)/i,
      answer: "Perfect stage to start right. \ud83d\ude80\n\nFor a new business I usually sequence it as: **1)** Design & Build \u2014 a proper website or store, **2)** Manage & Grow \u2014 SEO and listings live, **3)** paid ads once the backend can actually handle the traffic. Which stage are you at?"
    },
    {
      patterns: /(jaipur|local|nearby|in person|meet up|meet in)/i,
      answer: "Yes \u2014 I'm based in Jaipur, and I work with businesses there and remotely across India. \ud83d\udccd\n\nHappy to hop on a call, or meet in person if that's easier for you. Want to grab a time?"
    },
    {
      patterns: /(timeline|when|how long|time)/i,
      answer: "Speed to market matters. \n\n\ud83c\udfa8 **Website/store build:** 2\u20133 weeks end-to-end\n\u26a1 **Ad campaigns:** Live in 3\u20135 days\n\ud83d\uded2\ufe0f **Marketplace listings:** Live in 5\u20137 days\n\nFirst real, measurable results usually show within **2\u20134 weeks** of launch. How quickly are you trying to move?"
    }
  ];

  var quickReplies = [
    { label: "\ud83c\udfa8 I need a website/store built", msg: "I need a website or online store built." },
    { label: "\ud83d\udcc8 I need help growing sales", msg: "I already have a website or store and want to grow sales." },
    { label: "\ud83d\udcb0 Pricing", msg: "How much do you charge?" },
    { label: "\ud83d\udcc5 Let's Talk", msg: "Yes, let's talk." }
  ];

  var GREETING = "Hey there! \ud83d\udc4b I'm **StratAI**, Suryaprakash's assistant here on the site.\n\nAre you looking to build a website/online store, or grow one you already have?";
  var FALLBACK = "I hear you \u2014 every business is a little different, so let me be straight instead of generic. \ud83d\ude42\n\nOpen to a quick, no-pressure call with Suryaprakash so he can give you a real answer instead of a canned one?\n\n<div class='sai-actions'><a href='https://calendly.com/s64861004/30min' target='_blank' class='sai-action-btn'>\ud83d\udcc5 Claim Free Audit</a></div>";

  function getBotReply(userMsg) {
    for (var i = 0; i < KB.length; i++) {
      if (KB[i].patterns.test(userMsg)) return KB[i].answer;
    }
    return FALLBACK;
  }

  function formatBotText(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function addMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    if (role === 'bot') div.innerHTML = formatBotText(text);
    else div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping(cb, duration) {
    var dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(dots);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setTimeout(function () {
      dots.remove();
      cb();
    }, prefersReducedMotion ? 50 : duration);
  }

  function renderQuickReplies(replies) {
    qrEl.innerHTML = '';
    replies.forEach(function (r) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qr-btn';
      btn.textContent = r.label;
      btn.addEventListener('click', function () { handleSend(r.msg); });
      qrEl.appendChild(btn);
    });
  }

  function handleSend(msgText) {
    var text = (msgText !== undefined ? msgText : input.value).trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    qrEl.innerHTML = '';
    showTyping(function () {
      addMsg(getBotReply(text), 'bot');
    }, 550 + Math.random() * 450);
  }

  function openChat() {
    isOpen = true;
    win.classList.add('open');
    launcher.classList.add('open');
    launcher.setAttribute('aria-expanded', 'true');
    if (tooltip) tooltip.classList.remove('show');
    if (notif) notif.style.display = 'none';
    if (!initialized) {
      initialized = true;
      showTyping(function () {
        addMsg(GREETING, 'bot');
        renderQuickReplies(quickReplies);
      }, 500);
    }
    input.focus();
  }
  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    launcher.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
  }

  launcher.setAttribute('aria-expanded', 'false');
  launcher.addEventListener('click', function () { isOpen ? closeChat() : openChat(); });
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  if (sendBtn) sendBtn.addEventListener('click', function () { handleSend(); });
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSend(); });

  if (!prefersReducedMotion) {
    setTimeout(function () {
      if (!isOpen && tooltip) tooltip.classList.add('show');
    }, 4000);
    setTimeout(function () {
      if (tooltip) tooltip.classList.remove('show');
    }, 10000);
  }
})();
