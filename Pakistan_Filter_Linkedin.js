// ==UserScript==
// @name         LinkedIn Keyword Filter
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Hide LinkedIn feed posts containing specified keywords
// @author       Timothé Maammar
// @match        https://*.linkedin.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ─── KEYWORDS / PATTERNS TO FILTER ───────────────────────────────────────
  const FILTERS = [
    // All variants of Alhamdulillah
    /(?:[ae]l?[\s]?)?h[auo]?md[uo]?[\s]?(?:l+[iea]?l*[ae]h?i?|ella)/i,

  ];
  // ──────────────────────────────────────────────────────────────────────────

  function matchesAnyFilter(text) {
    return FILTERS.some(f =>
      f instanceof RegExp ? f.test(text) : text.includes(f)
    );
  }

  function hideMatchingPosts() {
    // role="listitem" is the stable selector for feed posts in LinkedIn's current DOM
    const posts = document.querySelectorAll('[role="listitem"]');
    let hidden = 0;

    posts.forEach(post => {
      if (post.dataset.kfFiltered) return;
      post.dataset.kfFiltered = 'true';

      const text = post.innerText || '';
      if (matchesAnyFilter(text)) {
        post.style.setProperty('display', 'none', 'important');
        hidden++;
        console.log('[KF] Post hidden:', text.slice(0, 80).replace(/\n/g, ' '));
      }
    });

    if (hidden > 0) console.log(`[KF] ${hidden} post(s) hidden this pass.`);
  }

  hideMatchingPosts();

  const observer = new MutationObserver(hideMatchingPosts);
  observer.observe(document.body, { childList: true, subtree: true });

})();
