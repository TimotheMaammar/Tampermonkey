// ==UserScript==
// @name         JustJoinIT - Company Name Extractor
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Extracts and displays company names from job listings on justjoin.it
// @author       Timothé Maammar
// @match        https://justjoin.it/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #jjit-extractor {
      position: fixed;
      top: 80px;
      right: 16px;
      z-index: 99999;
      width: 280px;
      max-height: 70vh;
      background: #1a1a2e;
      color: #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      font-family: sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #jjit-extractor header {
      background: #16213e;
      padding: 10px 14px;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    }
    #jjit-extractor header span { color: #a78bfa; }
    #jjit-extractor .toolbar {
      padding: 8px 10px;
      background: #0f3460;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    #jjit-extractor button {
      flex: 1;
      padding: 5px 8px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
    }
    #jjit-extractor .btn-copy   { background: #a78bfa; color: #1a1a2e; }
    #jjit-extractor .btn-clear  { background: #ef4444; color: #fff; }
    #jjit-extractor .btn-toggle { background: #374151; color: #e0e0e0; font-size: 11px; flex: 0 0 auto; }
    #jjit-extractor .btn-scroll-start { background: #22c55e; color: #fff; }
    #jjit-extractor .btn-scroll-stop  { background: #f97316; color: #fff; display: none; }
    #jjit-extractor #jjit-count {
      padding: 4px 14px;
      font-size: 11px;
      color: #9ca3af;
      background: #16213e;
    }
    #jjit-extractor #jjit-scroll-status {
      padding: 3px 14px;
      font-size: 10px;
      color: #22c55e;
      background: #16213e;
      display: none;
    }
    #jjit-extractor ul {
      margin: 0;
      padding: 8px 0;
      list-style: none;
      overflow-y: auto;
      flex: 1;
    }
    #jjit-extractor ul li {
      padding: 6px 14px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #jjit-extractor ul li:hover { background: #1e293b; }
    #jjit-extractor ul li .num  { color: #6b7280; font-size: 11px; min-width: 18px; }
    #jjit-extractor ul li .name { flex: 1; }
    #jjit-extractor ul li .badge {
      background: #a78bfa22;
      color: #a78bfa;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 10px;
    }
    #jjit-collapsed {
      position: fixed;
      top: 80px;
      right: 16px;
      z-index: 99999;
      background: #a78bfa;
      color: #1a1a2e;
      border: none;
      border-radius: 50%;
      width: 46px;
      height: 46px;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: none;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'jjit-extractor';
  panel.innerHTML = `
    <header>
      🏢 Companies <span id="jjit-badge">0</span>
      <button class="btn-toggle" id="jjit-minimize">−</button>
    </header>
    <div id="jjit-count">No listings detected</div>
    <div id="jjit-scroll-status">⏳ Scrolling...</div>
    <div class="toolbar">
      <button class="btn-copy"          id="jjit-copy">📋 Copy</button>
      <button class="btn-clear"         id="jjit-clear">🗑 Clear</button>
      <button class="btn-scroll-start"  id="jjit-scroll-start">▶ Auto-scroll</button>
      <button class="btn-scroll-stop"   id="jjit-scroll-stop">⏹ Stop</button>
    </div>
    <ul id="jjit-list"></ul>
  `;
  document.body.appendChild(panel);

  const collapseBtn = document.createElement('button');
  collapseBtn.id = 'jjit-collapsed';
  collapseBtn.textContent = '🏢';
  collapseBtn.title = 'Open extractor';
  document.body.appendChild(collapseBtn);

  // ── State ─────────────────────────────────────────────────────────
  const companies = new Map();
  let seenCards   = new WeakSet();

  // ── Selectors ─────────────────────────────────────────────────────
  function getCompanyFromCard(card) {
    const p = card.querySelector('p.mui-1pc4jlc');
    if (p) return p.textContent.trim();

    const icon = card.querySelector('svg.lucide-building');
    if (icon) {
      const sibling = icon.closest('div')?.parentElement?.querySelector('p');
      if (sibling) return sibling.textContent.trim();
    }

    const el = card.querySelector('[data-testid*="company"], [class*="company"], [class*="employer"]');
    if (el) return el.textContent.trim();

    return null;
  }

  function getCards() {
    let cards = Array.from(document.querySelectorAll('div.mui-hj05nv'));

    if (!cards.length) {
      cards = Array.from(document.querySelectorAll('h3')).map(h3 => {
        let el = h3.parentElement;
        for (let i = 0; i < 5; i++) {
          if (el?.querySelector('p.mui-1pc4jlc')) return el;
          el = el?.parentElement;
        }
        return null;
      }).filter(Boolean);
    }

    if (!cards.length) {
      cards = Array.from(document.querySelectorAll('article, [data-testid*="offer"], [class*="offerCard"]'));
    }

    return cards;
  }

  // ── Rendering ─────────────────────────────────────────────────────
  function renderList() {
    const list  = document.getElementById('jjit-list');
    const badge = document.getElementById('jjit-badge');
    const count = document.getElementById('jjit-count');

    list.innerHTML = '';
    const sorted = [...companies.entries()].sort((a, b) => b[1] - a[1]);

    sorted.forEach(([name, nb], i) => {
      const li = document.createElement('li');

      const numSpan       = document.createElement('span');
      numSpan.className   = 'num';
      numSpan.textContent = i + 1;

      const nameSpan       = document.createElement('span');
      nameSpan.className   = 'name';
      nameSpan.textContent = name;

      li.appendChild(numSpan);
      li.appendChild(nameSpan);

      if (nb > 1) {
        const badgeSpan       = document.createElement('span');
        badgeSpan.className   = 'badge';
        badgeSpan.textContent = nb;
        li.appendChild(badgeSpan);
      }

      list.appendChild(li);
    });

    const total = [...companies.values()].reduce((a, b) => a + b, 0);
    badge.textContent = companies.size;
    count.textContent = `${total} listing(s) · ${companies.size} unique company(ies)`;
  }

  // ── Extraction ────────────────────────────────────────────────────
  function extractCompanies() {
    let newFound = 0;
    getCards().forEach(card => {
      if (seenCards.has(card)) return;
      seenCards.add(card);
      const name = getCompanyFromCard(card);
      if (name) {
        companies.set(name, (companies.get(name) || 0) + 1);
        newFound++;
      }
    });
    if (newFound > 0) renderList();
    return newFound;
  }

  // ── Observer ──────────────────────────────────────────────────────
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(extractCompanies, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(extractCompanies, 1000);

  // ── Auto-scroll ───────────────────────────────────────────────────
  let scrollInterval = null;
  let noNewCount     = 0;       // how many cycles with no new company
  const MAX_NO_NEW   = 6;       // stop after ~3 s with nothing new
  const SCROLL_STEP  = 600;     // pixels per tick
  const SCROLL_DELAY = 500;     // ms between ticks

  const btnStart = document.getElementById('jjit-scroll-start');
  const btnStop  = document.getElementById('jjit-scroll-stop');
  const statusEl = document.getElementById('jjit-scroll-status');

  function setScrolling(active) {
    btnStart.style.display = active ? 'none' : '';
    btnStop.style.display  = active ? ''     : 'none';
    statusEl.style.display = active ? 'block': 'none';
  }

  function stopScroll(reason) {
    clearInterval(scrollInterval);
    scrollInterval = null;
    setScrolling(false);
    statusEl.style.display = 'block';
    statusEl.style.color   = '#a78bfa';
    statusEl.textContent   = reason;
    setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }

  function startScroll() {
    if (scrollInterval) return;
    noNewCount = 0;
    setScrolling(true);
    statusEl.textContent = '⏳ Scrolling...';
    statusEl.style.color = '#22c55e';

    scrollInterval = setInterval(() => {
      const before = companies.size;
      window.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' });

      setTimeout(() => {
        extractCompanies();
        const after = companies.size;

        const atBottom =
          window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;

        if (after === before) {
          noNewCount++;
        } else {
          noNewCount = 0;
        }

      }, SCROLL_DELAY);

    }, SCROLL_DELAY * 2);
  }

  btnStart.addEventListener('click', startScroll);
  btnStop.addEventListener('click',  () => stopScroll('⏹ Stopped manually'));

  // ── Copy button ───────────────────────────────────────────────────
  document.getElementById('jjit-copy').addEventListener('click', () => {
    const lines = [...companies.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, cnt]) => cnt > 1 ? `${name} (${cnt})` : name)
      .join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      const btn = document.getElementById('jjit-copy');
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
    });
  });

  // ── Clear button ──────────────────────────────────────────────────
  document.getElementById('jjit-clear').addEventListener('click', () => {
    companies.clear();
    seenCards = new WeakSet();
    renderList();
  });

  // ── Minimize / expand ─────────────────────────────────────────────
  document.getElementById('jjit-minimize').addEventListener('click', () => {
    panel.style.display = 'none';
    collapseBtn.style.display = 'flex';
  });
  collapseBtn.addEventListener('click', () => {
    panel.style.display = 'flex';
    collapseBtn.style.display = 'none';
  });

  // ── Drag & drop ───────────────────────────────────────────────────
  const headerEl = panel.querySelector('header');
  let dragging = false, ox = 0, oy = 0;

  headerEl.addEventListener('mousedown', e => {
    if (e.target.id === 'jjit-minimize') return;
    dragging = true;
    ox = e.clientX - panel.getBoundingClientRect().left;
    oy = e.clientY - panel.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    panel.style.right = 'auto';
    panel.style.left  = (e.clientX - ox) + 'px';
    panel.style.top   = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

})();
