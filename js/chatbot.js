// StratAI — lightweight on-site assistant. Builds its own DOM so it doesn't
// need to be duplicated in every page's HTML.
(function () {
  var root = document.createElement('div');
  root.innerHTML =
    '<button class="sai-launcher" id="sai-launcher" aria-label="Open chat with StratAI" aria-controls="sai-window" aria-expanded="false">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<span class="sai-notif" id="sai-notif"></span>' +
    '</button>' +
    '<div class="sai-tooltip" id="sai-tooltip">Need a website, store, or growth plan? Ask StratAI 👋</div>' +
    '<div class="sai-window" id="sai-window" role="dialog" aria-modal="false" aria-labelledby="sai-name" aria-hidden="true" inert>' +
      '<div class="sai-header">' +
        '<div><div class="sai-name" id="sai-name">StratAI</div><div class="sai-sub">Website guide · please don’t share passwords or sensitive data</div></div>' +
        '<button class="sai-close" id="sai-close" aria-label="Close chat">\u2715</button>' +
      '</div>' +
      '<div class="sai-messages" id="sai-messages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="sai-qr" id="sai-qr"></div>' +
      '<div class="sai-input-row">' +
        '<input id="sai-input" type="text" aria-label="Message SaleStrat" placeholder="Ask about services, pricing, timelines\u2026" autocomplete="off" />' +
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
      answer: "Hey there! \ud83d\udc4b I'm **StratAI**, SaleStrat's website guide. I can help you find the right service information or contact option.\n\nAre you looking to build a website/online store, or improve one you already have?" },
    { patterns: /(contact|reach|call|book|audit|hire|talk|meeting|whatsapp|schedule|let's do it|^ok$|okay|yep|yeah)/i,
      answer: "Happy to help you take the next step.\n\nChoose how you'd like to connect:\n\n<div class='sai-actions'><a href='https://calendly.com/info-salestrat/30min' target='_blank' rel='noopener noreferrer' class='sai-action-btn cal'>Book a conversation</a><a href='https://wa.me/917757075336' target='_blank' rel='noopener noreferrer' class='sai-action-btn wa'>WhatsApp</a></div>" },
    { patterns: /(what do you do|what do you offer|your services|what services|full services|everything you (do|offer))/i,
      answer: "SaleStrat brings together two service areas:\n\n**Design & Build** \u2014 website and online store strategy, design, and development\n**Manage & Grow** \u2014 e-commerce and marketplace support, SEO, paid campaigns, and automation\n\nWhich one sounds closer to what you need?" },
    { patterns: /(ui\/ux|ux design|ui design|redesign|looks outdated|looks old)/i,
      answer: "A clear, mobile-friendly experience can help visitors understand your offer and decide what to do next.\n\nSaleStrat designs website and store experiences around your customers, content, and business goals. You can explore the **Design & Build** service or share what you would like to improve." },
    { patterns: /(bad leads|junk leads|quality|cpl|cost per lead)/i,
      answer: "Lead quality can be affected by several things: audience fit, offer clarity, campaign setup, landing-page experience, follow-up, or sales qualification.\n\nA useful review looks across the full journey before recommending changes. Results depend on your market and execution, so no particular improvement can be promised in advance." },
    { patterns: /(expensive|cpa|roas dropping|high cost)/i,
      answer: "A rising cost per acquisition can have different causes, including changing demand, creative fatigue, measurement issues, campaign settings, or friction after the click.\n\nReviewing the campaign and customer journey together is a sensible first step; the evidence will show which areas are worth testing." },
    { patterns: /(amazon|flipkart|meesho|marketplace|seller central|seller hub|a\+ content|acos\b)/i,
      answer: "Marketplace performance can depend on listing quality, product availability, pricing, reviews, advertising, and account health.\n\nSaleStrat can support listing and campaign improvements on platforms such as Amazon and Flipkart, depending on your account and scope. No ranking or sales outcome can be guaranteed." },
    { patterns: /(rto\b|return to origin|refund|order management|dispatch|fulfilment|fulfillment|buy box)/i,
      answer: "Returns, cancellations, and Buy Box changes can have multiple causes, from listing accuracy and delivery expectations to pricing and account performance.\n\nThe right response depends on the platform rules, available data, and your operations. A review can help identify what is actionable." },
    { patterns: /(shopify|woocommerce|online store|store website|store design|ecommerce|e-commerce|cart|inventory|catalog)/i,
      answer: "SaleStrat can help with Shopify or WooCommerce setup and improvements, catalog organization, checkout experience, and relevant customer follow-up.\n\nThe best starting point depends on your store, current setup, and the specific customer friction you want to address." },
    { patterns: /(website|landing page|funnel|new site|need a site)/i,
      answer: "SaleStrat designs and builds mobile-friendly websites and online stores with clear structure, useful content, and on-page SEO foundations.\n\nIf you share what the site needs to do and who it serves, I can suggest a suitable starting scope." },
    { patterns: /(price|cost|rate|budget|fee|how much)/i,
      answer: "Pricing depends on the work and its scope.\n\n**Design & Build** is scoped as a project. **Manage & Grow** is scoped around the ongoing support required.\n\nShare what you are looking for through the contact options and SaleStrat can discuss the relevant scope and quote." },
    { patterns: /(guarantee|promise|surety)/i,
      answer: "No specific sales, ranking, or return-on-ad-spend result can be guaranteed. Outcomes depend on factors such as your offer, audience, competition, budget, timing, and operations.\n\nThe work can be scoped clearly, progress communicated, and performance reviewed using agreed measures." },
    { patterns: /(roas|roi|results|case study|proof|portfolio)/i,
      answer: "The **Case studies** page is a framework for future client-approved examples. I only publish outcomes I can verify and share with permission.\n\nA useful evaluation starts by agreeing what success means and how it will be measured." },
    { patterns: /\b(seo|search ranking|google search|organic traffic|local seo)\b/i,
      answer: "SEO work can include technical foundations, site structure, useful content, and alignment with the searches your customers make. Local search visibility can also depend on accurate business information and your location.\n\nPriorities and results vary by site and competition; rankings or traffic levels cannot be guaranteed." },
    { patterns: /(salestratxai|artificial intelligence|\bai\b)/i,
      answer: "SaleStratXAI is SaleStrat's practical approach to exploring AI in marketing and connected business workflows.\n\nIt starts with a specific use case, checks whether AI is suitable, and considers human review, data handling, integration, and how to evaluate the result." },
    { patterns: /(automation|zapier|make|crm|hubspot|whatsapp bot|follow.?up)/i,
      answer: "Follow-up can be made more consistent with suitable email, CRM, or messaging workflows.\n\nAutomation should fit your tools, consent requirements, and response process; it does not by itself guarantee response times or conversions." },
    { patterns: /(ads|meta|google|facebook|pmax|campaign)/i,
      answer: "Paid campaigns work best when the objective, audience, creative, measurement, and post-click experience are considered together.\n\nSaleStrat can help review and manage suitable Meta and other paid campaigns. Performance depends on the offer, market, budget, and testing; cost reductions are not guaranteed." },
    { patterns: /(sell online|start selling|launch (a |my )?(store|brand)|new brand|just starting out)/i,
      answer: "A launch plan often starts with a clear offer and a reliable website or store, then builds discovery and customer follow-up around it. Paid campaigns may make sense when the offer, tracking, and customer journey are ready.\n\nThe sequence should be adapted to your budget, goals, and readiness. Where are you in that process?" },
    { patterns: /(where are you based|which city|meet in person|in-person meeting|meet up|do you work remotely|do you serve my area|time zone|remote support)/i,
      answer: "SaleStrat can discuss remote collaboration and the best way to work together based on your location and project needs. Use the contact options to arrange an initial conversation." },
    { patterns: /(timeline|launch date|how long|project duration|when can we start)/i,
      answer: "Timelines depend on scope, platform, content and assets, access, approvals, and any third-party dependencies.\n\nAfter understanding the work, SaleStrat can outline a realistic schedule and key milestones. Marketing results also take time to evaluate and are not guaranteed by a fixed date." }
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
    return "Every business is different. Share a little about what you want to improve, or choose a contact option to discuss it with SaleStrat.\n\n<div class='sai-actions'><a href='https://calendly.com/info-salestrat/30min' target='_blank' rel='noopener noreferrer' class='sai-action-btn cal'>Book a conversation</a><a href='https://wa.me/917757075336' target='_blank' rel='noopener noreferrer' class='sai-action-btn wa'>WhatsApp</a></div>";
  }

  function addMsg(text, role) {
    var msg = document.createElement('div');
    msg.className = 'sai-msg ' + role;
    var av = document.createElement('div');
    av.className = 'sai-msg-avatar';
    av.textContent = role === 'bot' ? 'S' : 'U';
    var bubble = document.createElement('div');
    bubble.className = 'sai-bubble';
    if (role === 'user') {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }
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
    return 'https://wa.me/917757075336?text=' + encodeURIComponent("Hi SaleStrat! I was chatting about: \"" + userMsg + "\". Can we talk?").replace(/'/g, '%27');
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
    win.setAttribute('aria-hidden', String(!isOpen));
    win.inert = !isOpen;
    launcher.setAttribute('aria-expanded', String(isOpen));
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
  closeBtn.addEventListener('click', function () { isOpen = false; win.classList.remove('open'); win.setAttribute('aria-hidden', 'true'); win.inert = true; launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false;
      win.classList.remove('open');
      win.setAttribute('aria-hidden', 'true');
      win.inert = true;
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSend(); });
  sendBtn.addEventListener('click', function () { handleSend(); });

})();
