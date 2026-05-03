(function () {
  'use strict';

  const STORAGE_KEYS = {
    theme: 'doc-hub-theme',
    pinned: 'doc-hub-pinned',
    views: 'doc-hub-views',
    recent: 'doc-hub-recent'
  };

  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        if (typeof fallback === 'string') return raw;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const v = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, v);
      } catch (e) {}
    }
  };

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
  }

  function initTheme(buttons) {
    const saved = Store.get(STORAGE_KEYS.theme, null);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    (buttons || []).forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        Store.set(STORAGE_KEYS.theme, next);
        document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
      });
    });
  }

  function attachCopyButtons(scope) {
    const root = scope || document;
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        const text = (pre.querySelector('code') || pre).innerText;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'Copied';
        } catch (e) {
          btn.textContent = 'Error';
        }
        setTimeout(() => (btn.textContent = 'Copy'), 1200);
      });
      pre.appendChild(btn);
    });
  }

  function formatDateVN(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function relativeTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const day = 86400000;
    if (diff < day) return 'Hôm nay';
    if (diff < day * 2) return 'Hôm qua';
    if (diff < day * 7) return Math.floor(diff / day) + ' ngày trước';
    if (diff < day * 30) return Math.floor(diff / (day * 7)) + ' tuần trước';
    if (diff < day * 365) return Math.floor(diff / (day * 30)) + ' tháng trước';
    return Math.floor(diff / (day * 365)) + ' năm trước';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function unique(arr) {
    return Array.from(new Set(arr));
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), ms);
    };
  }

  window.DocHub = {
    STORAGE_KEYS,
    Store,
    applyTheme,
    initTheme,
    attachCopyButtons,
    formatDateVN,
    relativeTime,
    escapeHtml,
    unique,
    debounce
  };
})();
