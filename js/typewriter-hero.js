/**
 * SaleStrat - Homepage Hero Typewriter Revealing Effect
 * 
 * Reveals the hero headline with an organic typewriter sequence:
 * Line 1: "Get discovered."
 * Line 2: "Earn trust."
 * Line 3: "Make " + dynamic rotating words ("buying easier.", "stores convert.", "growth predictable.", "scaling sustainable.")
 * 
 * Features:
 * - Natural human typing cadence with micro-jitter
 * - Blinking glowing typewriter caret (|)
 * - Seamlessly triggers staggered reveal of context lede, CTAs, and trust metrics
 * - Respects prefers-reduced-motion (instant display for accessibility)
 * - Retains full semantic SEO text in DOM
 */

(function () {
  'use strict';

  function initTypewriter() {
    var heading = document.querySelector('.hero-typewriter-h1');
    if (!heading) return;

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hero = document.querySelector('.home-hero');

    if (reducedMotion) {
      if (hero) hero.classList.add('hero-headline-typed');
      return;
    }

    var line1 = heading.querySelector('.typewriter-line-1');
    var line2 = heading.querySelector('.typewriter-line-2');
    var dynamicTarget = heading.querySelector('.typewriter-dynamic-text');
    var caret = heading.querySelector('.typewriter-caret');

    if (!line1 || !line2 || !dynamicTarget || !caret) return;

    var text1 = line1.getAttribute('data-text') || line1.textContent.trim();
    var text2 = line2.getAttribute('data-text') || line2.textContent.trim();
    
    var rawPhrases = dynamicTarget.getAttribute('data-phrases');
    var phrases = ["buying easier.", "stores convert.", "growth predictable.", "scaling sustainable."];
    if (rawPhrases) {
      try {
        phrases = JSON.parse(rawPhrases);
      } catch (e) {}
    }

    // Clear contents for letter-by-letter reveal
    line1.textContent = '';
    line2.textContent = '';
    dynamicTarget.textContent = '';

    // Attach caret to line 1
    line1.appendChild(caret);

    var idx1 = 0;
    var idx2 = 0;
    var phraseIdx = 0;
    var charIdx = 0;
    var isDeleting = false;

    // Step 1: Type Line 1
    function typeLine1() {
      if (idx1 < text1.length) {
        line1.textContent = text1.substring(0, idx1 + 1);
        line1.appendChild(caret);
        idx1++;
        setTimeout(typeLine1, 48 + Math.random() * 18);
      } else {
        setTimeout(startLine2, 220);
      }
    }

    // Step 2: Type Line 2
    function startLine2() {
      line2.appendChild(caret);
      typeLine2();
    }

    function typeLine2() {
      if (idx2 < text2.length) {
        line2.textContent = text2.substring(0, idx2 + 1);
        line2.appendChild(caret);
        idx2++;
        setTimeout(typeLine2, 48 + Math.random() * 18);
      } else {
        setTimeout(startDynamicLine, 260);
      }
    }

    // Step 3: Type Dynamic Line 3
    function startDynamicLine() {
      dynamicTarget.appendChild(caret);
      // Trigger smooth staggered appearance of context & CTAs
      if (hero) {
        hero.classList.add('hero-headline-typed');
      }
      typeDynamicWord();
    }

    function typeDynamicWord() {
      var currentPhrase = phrases[phraseIdx];
      var speed = isDeleting ? 30 : 52;

      if (!isDeleting) {
        dynamicTarget.textContent = currentPhrase.substring(0, charIdx + 1);
        dynamicTarget.appendChild(caret);
        charIdx++;

        if (charIdx === currentPhrase.length) {
          isDeleting = true;
          // Pause on the finished phrase so user can read comfortably
          setTimeout(typeDynamicWord, 2200);
          return;
        }
      } else {
        dynamicTarget.textContent = currentPhrase.substring(0, charIdx - 1);
        dynamicTarget.appendChild(caret);
        charIdx--;

        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(typeDynamicWord, 420);
          return;
        }
      }

      setTimeout(typeDynamicWord, speed + Math.random() * 12);
    }

    // Start typing after initial smooth delay
    setTimeout(typeLine1, 320);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTypewriter);
    } else {
      initTypewriter();
    }
  }
})();
