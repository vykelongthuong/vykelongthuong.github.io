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

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function ensureUniqueId(base, used) {
    let next = base || 'section';
    let index = 1;
    while (used.has(next) || document.getElementById(next)) {
      next = (base || 'section') + '-' + index;
      index += 1;
    }
    used.add(next);
    return next;
  }

  function getDocDisplayTitle() {
    const title = (document.title || '').trim();
    return title || 'Tài liệu';
  }

  function injectDocEnhancementStyles() {
    if (document.getElementById('dochub-auto-enhance-style')) return;
    const style = document.createElement('style');
    style.id = 'dochub-auto-enhance-style';
    style.textContent = [
      '.dochub-breadcrumb{margin:0 0 14px;padding:10px 14px;border:1px solid var(--border,#dbe3ef);border-radius:12px;background:var(--panel,#fff);font-size:14px;color:var(--muted,#6b7280);}',
      '.dochub-breadcrumb a{color:var(--primary,#2563eb);text-decoration:none;}',
      '.dochub-breadcrumb a:hover{text-decoration:underline;}',
      '.dochub-auto-toc{margin:0 0 18px;padding:16px;border:1px solid var(--border,#dbe3ef);border-radius:14px;background:var(--panel,#fff);}',
      '.dochub-auto-toc h2{margin:0 0 12px;font-size:18px;line-height:1.2;}',
      '.dochub-auto-toc ul{list-style:none;padding:0;margin:0;display:grid;gap:8px;}',
      '.dochub-auto-toc li{margin:0;}',
      '.dochub-auto-toc a{display:block;padding:8px 10px;border:1px solid var(--border,#dbe3ef);border-radius:10px;color:var(--text,#1f2937);text-decoration:none;background:var(--panel-2,#f8fafc);}',
      '.dochub-auto-toc a:hover{border-color:var(--primary,#2563eb);color:var(--primary,#2563eb);}',
      '.dochub-auto-toc .toc-sub{padding-left:14px;}'
    ].join('');
    document.head.appendChild(style);
  }

  function buildBreadcrumb(target) {
    if (!target || document.querySelector('.dochub-breadcrumb')) return;
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'dochub-breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Breadcrumb');
    const current = escapeHtml(getDocDisplayTitle());
    breadcrumb.innerHTML = '<a href="../index.html">Kho Tài Liệu</a> <span>/</span> <span>' + current + '</span>';
    target.prepend(breadcrumb);
  }

  function findContentRoot() {
    return document.querySelector('main') || document.querySelector('article') || document.querySelector('.container') || document.body;
  }

  function shouldSkipAutoToc() {
    if (document.querySelector('#toc')) return true;
    if (document.querySelector('nav .toc, .toc, [data-dochub-toc]')) return true;
    return false;
  }

  function buildAutoToc(target) {
    if (!target || document.querySelector('.dochub-auto-toc')) return;
    if (shouldSkipAutoToc()) return;
    const headings = Array.from(target.querySelectorAll('h2, h3')).filter((heading) => {
      if (!heading.textContent || !heading.textContent.trim()) return false;
      const inside = heading.closest('nav, aside, header, footer, .dochub-auto-toc, .dochub-breadcrumb');
      return !inside;
    });
    if (headings.length < 3) return;

    const used = new Set();
    const list = document.createElement('ul');
    headings.forEach((heading) => {
      const baseId = slugify(heading.textContent);
      const finalId = heading.id || ensureUniqueId(baseId, used);
      heading.id = finalId;

      const item = document.createElement('li');
      if (heading.tagName.toLowerCase() === 'h3') item.className = 'toc-sub';
      const link = document.createElement('a');
      link.href = '#' + finalId;
      link.textContent = heading.textContent.trim();
      item.appendChild(link);
      list.appendChild(item);
    });

    const box = document.createElement('section');
    box.className = 'dochub-auto-toc';
    box.setAttribute('data-dochub-toc', 'true');
    const title = document.createElement('h2');
    title.textContent = 'Mục lục';
    box.appendChild(title);
    box.appendChild(list);
    const firstSection = target.querySelector('section');
    if (firstSection) {
      target.insertBefore(box, firstSection);
      return;
    }
    target.appendChild(box);
  }

  function initDocAutoEnhancements() {
    if (!window.location.pathname.includes('/docs/')) return;
    const root = findContentRoot();
    if (!root) return;
    injectDocEnhancementStyles();
    buildBreadcrumb(root);
    buildAutoToc(root);
  }

  document.addEventListener('DOMContentLoaded', initDocAutoEnhancements);

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
    debounce,
    initDocAutoEnhancements
  };
})();
