// ==UserScript==
// @name         Chess.com - Hide opponent
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Hides the opponent's name, rating, flag, and badge
// @author       Timothé Maammar
// @match        https://www.chess.com/play/*
// @match        https://www.chess.com/game/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const HIDDEN_TEXT = '???';

  function hideOpponent() {
  
    // On /game/ and /play/, the opponent is always located in #board-layout-player-top
    const topPlayer = document.querySelector('#board-layout-player-top');
    if (!topPlayer) return;

    // Name
    const usernameEl = topPlayer.querySelector('.cc-user-username-white');
    if (usernameEl && usernameEl.textContent.trim() !== HIDDEN_TEXT) {
      usernameEl.textContent = HIDDEN_TEXT;
    }

    // Rating
    const ratingEl = topPlayer.querySelector('.cc-user-rating-white');
    if (ratingEl) {
      ratingEl.style.visibility = 'hidden';
    }

    // Flag
    const flagEl = topPlayer.querySelector('[class*="cc-country-flag"]');
    if (flagEl) {
      flagEl.style.visibility = 'hidden';
    }

    // Badge
    const badgeEl = topPlayer.querySelector('[class*="cc-user-badge"]');
    if (badgeEl) {
      badgeEl.style.visibility = 'hidden';
    }

    // Avatar
    // const avatarEl = topPlayer.querySelector('[class*="cc-avatar"]');
    // if (avatarEl) avatarEl.style.visibility = 'hidden';
  }

  // MutationObserver to handle dynamic loading (Vue.js SPA)
  const observer = new MutationObserver(() => {
    hideOpponent();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial call
  hideOpponent();
})();
