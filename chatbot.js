// StratAI — lightweight on-site assistant. Builds its own DOM so it doesn't
// need to be duplicated in every page's HTML.
(function () {
  var root = document.createElement('div');
  root.innerHTML =
    '<button class="sai-launcher" id="sai-launcher" aria-label="Open chat with StratAI">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<span class="sai-notif" id="sai-notif"></span>' +
    '</button>' +
    '<div class="sai-tooltip" id="sai-tooltip">Need a website, store, or growth plan? Ask StratAI 👋</div>' +
    '<div class="sai-window" id="sai-window">' +
      '<div class="sai-header">' +
        '<div><div class="sai-name">StratAI</div><div class="sai-sub">SaleStrat\u2019s on-site assistant</div></div>' +
        '<button class="sai-close" id="sai-close" aria-label="Close chat">\u2715</button>' +
      '</div>' +
      '<div class="sai-messages" id="sai-messages"></div>' +
      '<div class="sai-qr" id="sai-qr"></div>' +
      '<div class="sai-input-row">' +
        '<input id="sai-input" type="text" placeholder="Ask about services, pricing, timelines\u2026" />' +
        '<button class="sai-send" id="sai-send" aria-label="Send">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  var launcher = document.getElementById('sai-launcher');
  var win = document.getElementById('sai-window');
  var closeBtn = document.getElementById('sai-close');
  var messagesEl = document.getElementById('sai-messages');
  var qrEl = document.getElementById('sai-qr');
  var input = document.getElementById('sai-input');
  var sendBtn = document.getElementById('sai-send');
  var tooltip = document.getElementById('sai-tooltip');
  var notif = document.getElementById('sai-notif');
  var isOpen = false, initialized = false;

  var KB = [
    { patterns: /^(hi|hello|hey|greetings|what's up|sup|how are you|howdy)[\s?!.]*$/i,
      answer: "Hey there! \ud83d\udc4b I'm **StratAI**, Suryaprakash's assistant here on the site.\n\nAre you looking to build a website/online store, or grow one you already have?" },
    { patterns: /(contact|reach|call|book|audit|hire|talk|meeting|whatsapp|schedule|let's do it|^ok$|okay|yep|yeah)/i,
      answer: "Perfect. Let's look at what you actually need and whether I'm the right fit.\n\nChoose how you'd like to connect:\n\n<div class='sai-actions'><a href='https://calendly.com/info-salestrat/30min' target='_blank' class='sai-action-btn cal'>Claim Free Audit</a><a href='https://wa.me/917757075336' target='_blank' class='sai-action-btn wa'>WhatsApp</a></div>" },
    { patterns: /(what do you do|what do you offer|your services|what services|full services|everything you (do|offer))/i,
      answer: "I cover two things:\n\n**Design & Build** \u2014 website & online store design, UI/UX, Shopify/WooCommerce setup\n**Manage & Grow** \u2014 e-commerce management, Meta Ads, SEO, automation\n\nWhich one do you need right now?" },
    { patterns: /(ui\/ux|ux design|ui design|redesign|looks outdated|looks old)/i,
      answer: "A good design is what makes someone trust you enough to buy or enquire.\n\nI design clean, mobile-first websites and store interfaces, built around how your actual customers browse and decide. Want to see the kind of layout I'd suggest for your business?" },
    { patterns: /(bad leads|junk leads|quality|cpl|cost per lead)/i,
      answer: "If you're getting cheap leads but zero sales, you're buying clicks, not intent.\n\nI fix this by overhauling ad copy to act as a **filter, not a magnet** \u2014 CPA goes up slightly, but backend closing rate jumps. Want me to audit your current creatives?" },
    { patterns: /(expensive|cpa|roas dropping|high cost)/i,
      answer: "When CPA spikes, it's usually one of three things:\n1. Creative fatigue\n2. Broken tracking feeding bad data\n3. Friction on the landing page or store\n\nI run a quick audit to find which one is bleeding your budget. Shall we take a look?" },
    { patterns: /(amazon|flipkart|meesho|marketplace|seller central|seller hub|a\+ content|acos\b)/i,
      answer: "Winning on Amazon & Flipkart is rank, ads, and account health working together.\n\nI handle listing SEO with A+ content, Sponsored Ads to control ACOS, and catalog/inventory sync so you never go out of stock. Want a free audit of your current listings?" },
    { patterns: /(rto\b|return to origin|refund|order management|dispatch|fulfilment|fulfillment|buy box)/i,
      answer: "High RTO and a lost Buy Box quietly kill marketplace margins.\n\nI tighten listing accuracy and COD risk filters to cut RTO, and clean up your catalog to win back the Buy Box. Want me to look at your current numbers?" },
    { patterns: /(shopify|woocommerce|online store|store website|store design|ecommerce|e-commerce|cart|inventory|catalog)/i,
      answer: "Ads and traffic without a solid store behind them just burn budget.\n\nI design and manage the full backend \u2014 new Shopify/WooCommerce builds or fixes, catalog hygiene, checkout fixes, and automated abandoned-cart recovery. Want me to audit your store's checkout flow?" },
    { patterns: /(website|landing page|funnel|new site|need a site)/i,
      answer: "A good website is often the first thing that makes someone trust you enough to buy.\n\nI design and build clean, fast, mobile-friendly websites and stores \u2014 with basic SEO built in from day one. Want to see what that could look like for your business?" },
    { patterns: /(price|cost|rate|budget|fee|how much)/i,
      answer: "Depends on the lane.\n\n**Design & Build** is a one-time project fee based on scope.\n**Manage & Grow** is a monthly retainer once you're live.\n\nTell me which one you need and I'll give you a straight answer, not a vague range." },
    { patterns: /(guarantee|promise|surety)/i,
      answer: "I won't guarantee a specific ROAS or ranking on day one \u2014 anyone who does is guessing.\n\nWhat I *do* guarantee: clean technical execution, transparent weekly updates, and honest advice even when it's not what you want to hear. Fair?" },
    { patterns: /(roas|roi|results|case study|proof|portfolio)/i,
      answer: "Numbers speak louder than words. Average across active client accounts: **3.2\u00d7 ROAS** and a **45%+ conversion uplift**.\n\nScroll up to the Results section for the full breakdown, or ask me for references directly. What are you trying to hit this quarter?" },
    { patterns: /(automation|zapier|make|crm|hubspot|whatsapp bot|follow.?up)/i,
      answer: "Leads are useless if they rot in a spreadsheet or an unanswered WhatsApp.\n\nI set up automated follow-ups \u2014 WhatsApp, email, or CRM \u2014 so a lead gets a response within minutes. Should we map out your backend?" },
    { patterns: /(ads|meta|google|facebook|pmax|campaign)/i,
      answer: "Are you just throwing money at Meta hoping it sticks?\n\nI focus on training the algorithm on high-intent buyers \u2014 Meta Advantage+ and Google PMax \u2014 to bring cost-per-result down. Want me to run a free audit on your ad account?" },
    { patterns: /(sell online|start selling|launch (a |my )?(store|brand)|new brand|just starting out)/i,
      answer: "Perfect stage to start right.\n\nFor a new business I usually sequence it as: **1)** Design & Build \u2014 a proper website or store, **2)** Manage & Grow \u2014 SEO and listings live, **3)** paid ads once the backend can handle the traffic. Which stage are you at?" },
    { patterns: /(local|nearby|in person|meet up|meet in|where are you based|which city|time zone|remote)/i,
      answer: "I work with businesses wherever they are \u2014 everything runs over calls, screen-shares, and WhatsApp. \ud83d\udccd\n\nHappy to hop on a call at a time that suits your time zone. Want to grab one?" },
    { patterns: /(timeline|when|how long|time)/i,
      answer: "\ud83c\udfa8 **Website/store build:** 2\u20133 weeks end-to-end\n\u26a1 **Ad campaigns:** Live in 3\u20135 days\n\ud83d\udee0\ufe0f **Marketplace listings:** Live in 5\u20137 days\n\nFirst real, measurable results usually show within **2\u20134 weeks** of launch. How quickly are you trying to move?" }
  ];

  var quickReplies = [
    { label: "I need a website/store built", msg: "I need a website or online store built." },
    { label: "I need help growing sales", msg: "I already have a website or store and want to grow sales." },
    { label: "Pricing", msg: "How much do you charge?" },
    { label: "Let's talk", msg: "Yes, let's talk." }
  ];

  function getBotReply(userMsg) {
    for (var i = 0; i < KB.length; i++) {
      if (KB[i].patterns.test(userMsg)) return KB[i].answer;
    }
    return "Every business is a little different, so let me be straight instead of generic.\n\nOpen to a quick, no-pressure call with Suryaprakash?\n\n<div class='sai-actions'><a href='https://calendly.com/info-salestrat/30min' target='_blank' class='sai-action-btn cal'>Claim Free Audit</a></div>";
  }

  function addMsg(text, role) {
    var msg = document.createElement('div');
    msg.className = 'sai-msg ' + role;
    var av = document.createElement('div');
    av.className = 'sai-msg-avatar';
    av.textContent = role === 'bot' ? 'S' : 'U';
    var bubble = document.createElement('div');
    bubble.className = 'sai-bubble';
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    msg.appendChild(av); msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping(cb, duration) {
    var typing = document.createElement('div');
    typing.className = 'sai-msg bot'; typing.id = 'sai-typing';
    typing.innerHTML = '<div class="sai-msg-avatar">S</div><div class="sai-typing-bubble"><div class="sai-typing-dot"></div><div class="sai-typing-dot"></div><div class="sai-typing-dot"></div></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setTimeout(function () {
      var el = document.getElementById('sai-typing'); if (el) el.remove();
      cb();
    }, duration);
  }

  function renderQuickReplies(replies) {
    qrEl.innerHTML = '';
    replies.forEach(function (qr) {
      var btn = document.createElement('button');
      btn.textContent = qr.label;
      btn.addEventListener('click', function () { handleSend(qr.msg); });
      qrEl.appendChild(btn);
    });
  }

  function buildWaLink(userMsg) {
    return 'https://wa.me/917757075336?text=' + encodeURIComponent("Hi Suryaprakash! I was chatting with StratAI about: \"" + userMsg + "\". Can we talk?");
  }

  function handleSend(msgText) {
    msgText = (msgText || input.value).trim();
    if (!msgText) return;
    input.value = '';
    qrEl.innerHTML = '';
    addMsg(msgText, 'user');
    var reply = getBotReply(msgText);
    reply = reply.split("href='https://wa.me/917757075336'").join("href='" + buildWaLink(msgText) + "'");
    var typingTime = Math.min(600 + reply.length * 8, 2000);
    showTyping(function () { addMsg(reply, 'bot'); }, typingTime);
  }

  launcher.addEventListener('click', function () {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen) {
      tooltip.classList.remove('show');
      notif.style.display = 'none';
      input.focus();
      if (!initialized) {
        initialized = true;
        addMsg("\ud83d\udc4b Welcome! I'm **StratAI**, here to point you in the right direction.\n\nDo you need a website or store built, or help growing one that already exists?", 'bot');
        setTimeout(function () { renderQuickReplies(quickReplies); }, 500);
      }
    }
  });
  closeBtn.addEventListener('click', function () { isOpen = false; win.classList.remove('open'); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSend(); });
  sendBtn.addEventListener('click', function () { handleSend(); });

  setTimeout(function () { if (!isOpen) tooltip.classList.add('show'); }, 3000);
  setTimeout(function () { tooltip.classList.remove('show'); }, 8500);
})();
