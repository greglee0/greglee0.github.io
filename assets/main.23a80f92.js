/* ==========================================================
   Greglee Blog 前端脚本
   所有文字来自 window.BLOG_CONFIG.i18n（由主题语言文件生成）
   ========================================================== */
(() => {
  'use strict';

  const CONFIG = window.BLOG_CONFIG || {};
  const FEATURES = CONFIG.features || {};
  const STORE_KEY = 'blog-settings';
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /**
   * 读取前端文案并替换 {name} 占位符。
   * @param {string} key 语言 key（不含 js_ 前缀）
   * @param {object} [vars] 占位符变量
   * @returns {string} 文案
   */
  const t = (key, vars = {}) => String((CONFIG.i18n || {})[`js_${key}`] || key)
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

  /**
   * 读写访客的个性化设置（localStorage），读写失败时静默降级。
   */
  const settings = {
    get() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
    },
    set(patch) {
      const next = { ...settings.get(), ...patch };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* 存储不可用时忽略 */ }
      return next;
    },
    clear() {
      try { localStorage.removeItem(STORE_KEY); } catch { /* 忽略 */ }
    },
  };

  /**
   * 显示右上角提示消息。
   * @param {string} text 提示文字
   * @param {{action?: string, onAction?: Function, duration?: number}} [opt] 操作按钮与持续时间
   */
  function toast(text, opt = {}) {
    const wrap = $('#toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    if (opt.action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt.action;
      btn.addEventListener('click', () => { opt.onAction && opt.onAction(); remove(); });
      el.appendChild(btn);
    }
    function remove() {
      el.classList.add('leave');
      setTimeout(() => el.remove(), 300);
    }
    wrap.appendChild(el);
    setTimeout(remove, opt.duration || 3000);
  }

  /**
   * 复制文本到剪贴板，兼容不支持 Clipboard API 的环境。
   * @param {string} text 要复制的文本
   * @returns {Promise<boolean>} 是否成功
   */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  /* ---------------- 主题：深浅色 / 主题色 / 字号 / 布局 ---------------- */

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  /**
   * 根据当前设置应用配色模式、主题色、字号、侧栏位置与动画开关。
   */
  function applySettings() {
    const s = settings.get();
    const appearance = CONFIG.appearance || {};
    const mode = s.mode || appearance.mode || 'auto';
    const dark = mode === 'dark' || (mode === 'auto' && darkQuery.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.setProperty('--primary', s.primary || appearance.primary);
    root.style.setProperty('--font-size', `${s.fontSize || appearance.fontSize || 16}px`);
    root.dataset.layout = s.layout || appearance.layout || 'right';
    root.dataset.style = s.style || appearance.style || 'default';
    if (s.effects === 'off') root.dataset.effects = 'off';
    else delete root.dataset.effects;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = s.primary || appearance.primary;
    syncSettingsPanel();
    document.dispatchEvent(new CustomEvent('blog:theme', { detail: { dark } }));
  }

  /** 快捷切换深浅色（覆盖跟随系统） */
  function toggleDark() {
    const dark = root.dataset.theme !== 'dark';
    settings.set({ mode: dark ? 'dark' : 'light' });
    applySettings();
    toast(dark ? t('dark_on') : t('light_on'), { duration: 1500 });
  }

  /** 将当前设置同步到设置面板的控件状态 */
  function syncSettingsPanel() {
    const panel = $('#settings-modal');
    if (!panel) return;
    const s = settings.get();
    const appearance = CONFIG.appearance || {};
    const values = {
      mode: s.mode || appearance.mode || 'auto',
      layout: s.layout || appearance.layout || 'right',
      effects: s.effects || 'on',
      style: s.style || appearance.style || 'default',
    };
    $$('.segmented', panel).forEach((group) => {
      $$('button', group).forEach((b) => b.classList.toggle('active', b.dataset.value === values[group.dataset.setting]));
    });
    const primary = (s.primary || appearance.primary || '').toLowerCase();
    $$('.swatch[data-color]', panel).forEach((b) => b.classList.toggle('active', b.dataset.color.toLowerCase() === primary));
    const size = s.fontSize || appearance.fontSize || 16;
    $('#font-size', panel).value = size;
    $('#font-size-value', panel).textContent = `${size}px`;
    $('#custom-color', panel).value = /^#[0-9a-f]{6}$/i.test(primary) ? primary : '#49b1f5';
  }

  /** 绑定设置面板中的交互 */
  function initSettingsPanel() {
    const panel = $('#settings-modal');
    if (!panel) return;
    panel.addEventListener('click', (e) => {
      const seg = e.target.closest('.segmented button');
      if (seg) {
        settings.set({ [seg.parentElement.dataset.setting]: seg.dataset.value });
        applySettings();
        return;
      }
      const swatch = e.target.closest('.swatch[data-color]');
      if (swatch) {
        settings.set({ primary: swatch.dataset.color });
        applySettings();
      }
    });
    $('#custom-color', panel).addEventListener('input', (e) => {
      settings.set({ primary: e.target.value });
      applySettings();
    });
    $('#font-size', panel).addEventListener('input', (e) => {
      settings.set({ fontSize: Number(e.target.value) });
      applySettings();
    });
    darkQuery.addEventListener('change', applySettings);
  }

  /* ---------------- 弹窗 ---------------- */

  /**
   * 打开弹窗并锁定页面滚动。
   * @param {HTMLElement} modal 弹窗元素
   */
  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  /** 关闭所有弹窗与抽屉 */
  function closeAll() {
    $$('.modal').forEach((m) => { m.hidden = true; });
    const drawer = $('#drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    $('#lightbox').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------------- 导航与滚动 ---------------- */

  /** 滚动时：导航栏变实色 / 向下滚动隐藏、阅读进度、回到顶部按钮、目录高亮 */
  function initScroll() {
    const nav = $('#site-nav');
    const banner = $('#banner');
    const bar = $('#progress-bar');
    const rightside = $('#rightside');
    const percentEl = $('.to-top-percent');
    const tocPercent = $('.toc-percent');
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? Math.min(100, Math.round((y / max) * 100)) : 0;
      const threshold = banner ? banner.offsetHeight - 60 : 0;
      nav.classList.toggle('solid', y > Math.max(10, threshold));
      nav.classList.toggle('hide', y > lastY && y > 400 && !document.querySelector('.has-children:hover'));
      if (bar && FEATURES.reading_progress !== false) bar.style.width = `${percent}%`;
      if (rightside) rightside.classList.toggle('show', y > 200);
      if (percentEl) percentEl.textContent = percent;
      if (tocPercent) tocPercent.textContent = `${percent}%`;
      updateToc();
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  let tocLinks = [];
  let headings = [];
  /** 初始化目录：收集标题与目录链接的对应关系 */
  function initToc() {
    tocLinks = $$('#toc-widget .toc a');
    headings = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  }

  /** 高亮当前阅读位置所在的目录项，并让其滚动到目录可视区 */
  function updateToc() {
    if (!headings.length) return;
    const offset = 90;
    let current = 0;
    headings.forEach((h, i) => { if (h.getBoundingClientRect().top - offset <= 0) current = i; });
    tocLinks.forEach((a, i) => a.parentElement.classList.toggle('active', i === current));
    const active = tocLinks[current];
    const box = $('#toc-widget .toc');
    if (active && box) {
      const top = active.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 40) box.scrollTop = top - box.clientHeight / 2;
    }
  }

  /* ---------------- 横幅 ---------------- */

  /** 首页横幅：随机背景、打字机副标题、可选一言 */
  async function initBanner() {
    const banner = $('#banner');
    if (!banner || banner.dataset.home !== 'true') return;
    const images = (CONFIG.banner && CONFIG.banner.images) || [];
    if (images.length > 1) {
      banner.style.backgroundImage = `url('${images[Math.floor(Math.random() * images.length)]}')`;
    }
    const el = $('#subtitle');
    if (!el) return;
    const texts = [el.dataset.text];
    if (CONFIG.banner.hitokoto) {
      try {
        const res = await fetch('https://v1.hitokoto.cn/?encode=json', { cache: 'no-store' });
        const data = await res.json();
        if (data && data.hitokoto) texts.push(data.hitokoto);
      } catch { /* 网络失败时只显示站点副标题 */ }
    }
    if (!CONFIG.banner.typewriter || root.dataset.effects === 'off') {
      el.textContent = texts[texts.length - 1];
      return;
    }
    typewriter(el, texts);
  }

  /**
   * 打字机效果：依次打出并删除多段文字，最后一段停留。
   * @param {HTMLElement} el 目标元素
   * @param {string[]} texts 文本列表
   */
  function typewriter(el, texts) {
    let index = 0;
    let pos = 0;
    let deleting = false;
    const tick = () => {
      const text = texts[index];
      el.textContent = text.slice(0, pos);
      if (!deleting && pos < text.length) {
        pos += 1;
        setTimeout(tick, 110);
      } else if (!deleting && index < texts.length - 1) {
        deleting = true;
        setTimeout(tick, 1800);
      } else if (deleting && pos > 0) {
        pos -= 1;
        setTimeout(tick, 45);
      } else if (deleting) {
        deleting = false;
        index += 1;
        setTimeout(tick, 300);
      }
    };
    el.textContent = '';
    tick();
  }

  /* ---------------- 文章内容增强 ---------------- */

  /** 代码块：语言标签、复制按钮、超长折叠 */
  function initCodeBlocks() {
    const maxLines = (CONFIG.appearance && CONFIG.appearance.codeMaxLines) || 0;
    $$('.code-block').forEach((block) => {
      const head = document.createElement('div');
      head.className = 'code-head';
      head.innerHTML = '<span class="dots"><span></span><span></span><span></span></span><span class="code-lang"></span><span class="code-actions"></span>';
      $('.code-lang', head).textContent = block.dataset.lang === 'text' ? '' : block.dataset.lang;
      if (FEATURES.code_copy !== false) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = t('copy');
        btn.innerHTML = '<i class="far fa-copy"></i>';
        btn.addEventListener('click', async () => {
          const ok = await copyText($('code', block).innerText);
          toast(ok ? t('copied') : t('copy_failed'), { duration: 1500 });
        });
        $('.code-actions', head).appendChild(btn);
      }
      block.prepend(head);
      if (maxLines > 0 && Number(block.dataset.lines) > maxLines) {
        block.classList.add('collapsed');
        const expand = document.createElement('button');
        expand.type = 'button';
        expand.className = 'code-expand';
        expand.textContent = t('expand');
        expand.addEventListener('click', () => {
          const collapsed = block.classList.toggle('collapsed');
          expand.textContent = collapsed ? t('expand') : t('collapse');
          expand.style.position = collapsed ? '' : 'static';
          expand.style.transform = collapsed ? '' : 'none';
          expand.style.margin = collapsed ? '' : '0 auto 10px';
          expand.style.display = collapsed ? '' : 'block';
        });
        block.appendChild(expand);
      }
    });
  }

  /** 图片灯箱：点击正文图片放大查看 */
  function initLightbox() {
    if (FEATURES.lightbox === false) return;
    const box = $('#lightbox');
    const img = $('img', box);
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.markdown-body img');
      if (!target || target.closest('a')) return;
      img.src = target.currentSrc || target.src;
      img.alt = target.alt;
      openModal(box);
    });
    box.addEventListener('click', closeAll);
  }

  /** 文章分享按钮 */
  function initShare() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-share]');
      if (!btn) return;
      const url = encodeURIComponent(location.href);
      const title = encodeURIComponent(document.title);
      const targets = {
        weibo: `https://service.weibo.com/share/share.php?url=${url}&title=${title}`,
        qq: `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`,
        x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      };
      if (btn.dataset.share === 'copy') {
        if (await copyText(location.href)) toast(t('link_copied'), { duration: 1500 });
      } else if (targets[btn.dataset.share]) {
        window.open(targets[btn.dataset.share], '_blank', 'noopener,width=720,height=560');
      }
    });
  }

  /** 列表卡片进入视口时的渐入动画 */
  function initReveal() {
    const items = $$('.post-card, .post-nav, .related, .comments, .flink-group, .timeline-year');
    if (!('IntersectionObserver' in window) || root.dataset.effects === 'off') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px' });
    items.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal');
        io.observe(el);
      }
    });
  }

  /* ---------------- 搜索 ---------------- */

  let searchIndex = null;
  /** 懒加载搜索索引，首次打开搜索框时请求 search.json */
  async function loadSearchIndex() {
    if (searchIndex) return searchIndex;
    const res = await fetch('/search.json');
    searchIndex = await res.json();
    return searchIndex;
  }

  /**
   * 转义文本并高亮关键词。
   * @param {string} text 原始文本
   * @param {string[]} words 关键词
   * @returns {string} HTML
   */
  function highlight(text, words) {
    const esc = text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    if (!words.length) return esc;
    const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return esc.replace(pattern, '<mark>$1</mark>');
  }

  /**
   * 执行搜索：所有关键词都需命中（标题、标签或正文），标题命中优先。
   * @param {string} query 搜索词
   */
  async function runSearch(query) {
    const box = $('#search-result');
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<p class="search-tip">${t('search_loading')}</p>`;
    const index = await loadSearchIndex();
    const results = index.map((item) => {
      const title = item.title.toLowerCase();
      const content = (item.content || '').toLowerCase();
      const tags = (item.tags || []).join(' ').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (title.includes(w)) score += 10;
        else if (tags.includes(w)) score += 5;
        else if (content.includes(w)) score += 1;
        else return null;
      }
      const pos = Math.max(0, content.indexOf(words[0]) - 30);
      return { item, score, snippet: (item.content || '').slice(pos, pos + 140) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 30);

    if (!results.length) {
      box.innerHTML = `<p class="search-tip">${t('search_empty')}</p>`;
      return;
    }
    box.innerHTML = `<p class="search-count">${t('search_count', { count: results.length })}</p>${results.map((r) => `<a class="search-item" href="${r.item.path}"><div class="search-item-title">${highlight(r.item.title, words)}</div><div class="search-item-text">${highlight(r.snippet, words)}</div></a>`).join('')}`;
  }

  /** 初始化搜索弹窗与快捷键 */
  function initSearch() {
    const modal = $('#search-modal');
    if (!modal) return;
    const input = $('#search-input');
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(input.value), 180);
    });
    input.addEventListener('keydown', (e) => {
      const items = $$('.search-item', modal);
      if (!items.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
      const index = items.findIndex((i) => i.classList.contains('active'));
      if (e.key === 'Enter') {
        (items[index] || items[0]).click();
        return;
      }
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items.forEach((i, n) => i.classList.toggle('active', n === next));
      items[next].scrollIntoView({ block: 'nearest' });
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAll(); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
  }

  /** 打开搜索框并聚焦 */
  function openSearch() {
    const modal = $('#search-modal');
    if (!modal) return;
    openModal(modal);
    setTimeout(() => $('#search-input').focus(), 30);
    loadSearchIndex().catch(() => {});
  }

  /* ---------------- 评论 ---------------- */

  /**
   * 动态加载外部脚本。
   * @param {string} src 脚本地址
   * @param {object} [attrs] 额外属性
   * @returns {Promise<void>} 加载完成
   */
  function loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
      s.onload = () => resolve();
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  /**
   * 动态加载样式表。
   * @param {string} href 样式地址
   */
  function loadStyle(href) {
    if ($(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  /** 评论区进入视口时才加载评论系统，减少首屏开销 */
  function initComments() {
    const box = $('#comment-box');
    const provider = box && box.dataset.provider;
    const cfg = CONFIG.comments || {};
    const load = async () => {
      try {
        if (provider === 'waline') {
          const w = cfg.waline || {};
          loadStyle('https://cdn.jsdelivr.net/npm/@waline/client@3.16.2/dist/waline.css');
          const { init } = await import('https://cdn.jsdelivr.net/npm/@waline/client@3.16.2/dist/waline.js');
          init({
            el: box,
            serverURL: w.server_url,
            path: box.dataset.path,
            lang: document.documentElement.lang,
            dark: 'html[data-theme="dark"]',
            emoji: w.emoji,
            meta: w.meta,
            login: w.login,
            pageSize: w.page_size,
            pageview: Boolean(w.pageview),
            comment: true,
          });
        } else if (provider === 'giscus') {
          const g = cfg.giscus || {};
          const s = document.createElement('script');
          const attrs = {
            'data-repo': g.repo, 'data-repo-id': g.repo_id, 'data-category': g.category, 'data-category-id': g.category_id,
            'data-mapping': g.mapping || 'pathname', 'data-reactions-enabled': '1', 'data-emit-metadata': '0',
            'data-input-position': 'top', 'data-lang': document.documentElement.lang, 'data-loading': 'lazy', crossorigin: 'anonymous',
            'data-theme': root.dataset.theme === 'dark' ? 'dark' : 'light',
          };
          s.src = 'https://giscus.app/client.js';
          s.async = true;
          Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
          box.appendChild(s);
          document.addEventListener('blog:theme', (e) => {
            const frame = $('iframe.giscus-frame');
            if (frame) frame.contentWindow.postMessage({ giscus: { setConfig: { theme: e.detail.dark ? 'dark' : 'light' } } }, 'https://giscus.app');
          });
        }
      } catch {
        box.textContent = t('comment_failed');
      }
    };
    if (box && provider) {
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            load();
          }
        }, { rootMargin: '400px' });
        io.observe(box);
      } else load();
    }
    // 没有评论区的页面也需要 Waline 统计阅读量
    const counters = $$('.waline-pageview-count');
    if (counters.length && cfg.provider === 'waline' && cfg.waline && cfg.waline.pageview && !box) {
      import('https://cdn.jsdelivr.net/npm/@waline/client@3.16.2/dist/pageview.js')
        .then(({ pageviewCount }) => pageviewCount({ serverURL: cfg.waline.server_url, path: location.pathname, update: false }))
        .catch(() => {});
    }
  }

  /* ---------------- 页脚与小功能 ---------------- */

  /** 页脚运行时间、侧栏运行天数与字数彩蛋 */
  function initFooter() {
    const since = new Date(`${CONFIG.since}-01-01T00:00:00`);
    const runtime = $('#runtime');
    const days = $$('.runtime-days');
    const tick = () => {
      let diff = Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000));
      const d = Math.floor(diff / 86400); diff %= 86400;
      const h = Math.floor(diff / 3600); diff %= 3600;
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      if (runtime) runtime.textContent = t('runtime', { d, h, m, s });
      days.forEach((el) => { el.textContent = t('days', { d }); });
    };
    tick();
    if (runtime) setInterval(tick, 1000);

    const words = $('.footer-words');
    if (words) {
      const k = Number(words.dataset.words) / 1000;
      const milestones = CONFIG.wordMilestones || [];
      const hit = milestones.filter((x) => k >= x.k).pop();
      $('.word-milestone', words).textContent = hit ? hit.text : '';
    }
  }

  /** 首次来访欢迎（根据来源站点）与版权协议提示 */
  function initWelcome() {
    const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
    const write = (store, key, v) => { try { store.setItem(key, v); } catch { /* 忽略 */ } };
    if (FEATURES.welcome && !read(localStorage, 'blog-welcomed')) {
      let from = '';
      try {
        const ref = document.referrer ? new URL(document.referrer).host : '';
        if (ref && ref !== location.host) from = ref;
      } catch { /* 忽略非法 referrer */ }
      setTimeout(() => toast(from ? t('welcome_from', { site: from }) : t('welcome'), { duration: 4000 }), 800);
      write(localStorage, 'blog-welcomed', '1');
    }
    if (FEATURES.cookie_notice && !read(sessionStorage, 'blog-cookie')) {
      setTimeout(() => toast(t('cookie'), { action: t('cookie_action'), onAction: () => { location.href = '/license/'; }, duration: 6000 }), 3000);
      write(sessionStorage, 'blog-cookie', '1');
    }
  }

  /** 打开开发者工具时提示遵守协议（快捷键 + 窗口尺寸差检测） */
  function initDevtoolsTip() {
    if (!FEATURES.devtools_tip || window.top !== window.self) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      toast(t('devtools'), { duration: 4000 });
      setTimeout(() => { shown = false; }, 10000);
    };
    window.addEventListener('keydown', (e) => {
      const key = (e.key || '').toLowerCase();
      if (key === 'f12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'i' || key === 'j'))) setTimeout(show, 50);
    });
    let last = false;
    window.addEventListener('resize', () => {
      const open = window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160;
      if (open && !last) show();
      last = open;
    });
  }

  /** 复制正文时提示注明出处 */
  function initCopyTip() {
    if (!FEATURES.copy_tip) return;
    document.addEventListener('copy', (e) => {
      if (e.target.closest && e.target.closest('.markdown-body') && String(window.getSelection()).length > 30) {
        toast(t('copy_tip'), { duration: 2000 });
      }
    });
  }

  /** 鼠标悬停站内链接时预加载页面，加快跳转 */
  function initPrefetch() {
    if (!FEATURES.prefetch) return;
    const done = new Set();
    document.addEventListener('mouseover', (e) => {
      const a = e.target.closest('a[href^="/"]');
      if (!a || done.has(a.pathname) || a.pathname === location.pathname || /\.(xml|json|jpg|png|gif)$/i.test(a.pathname)) return;
      done.add(a.pathname);
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = a.pathname;
      document.head.appendChild(link);
    }, { passive: true });
  }

  /* ---------------- 全局点击动作 ---------------- */

  /** 处理所有 data-action 按钮 */
  function initActions() {
    const actions = {
      theme: toggleDark,
      search: openSearch,
      settings: () => openModal($('#settings-modal')),
      'close-modal': closeAll,
      'reset-settings': () => {
        settings.clear();
        applySettings();
        toast(t('settings_reset'), { duration: 1500 });
      },
      drawer: () => {
        const drawer = $('#drawer');
        const open = !drawer.classList.contains('open');
        if (!open) return closeAll();
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        return undefined;
      },
      more: () => $('#rightside').classList.toggle('expand'),
      aside: () => {
        const current = root.dataset.layout;
        const appearance = CONFIG.appearance || {};
        const next = current === 'none' ? (appearance.layout !== 'none' ? appearance.layout : 'right') : 'none';
        settings.set({ layout: next });
        applySettings();
      },
      top: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      comment: () => $('#comments') && $('#comments').scrollIntoView({ behavior: 'smooth' }),
      toc: () => {
        const toc = $('#toc-widget');
        if (!toc) return;
        // 手机 / 平板上目录组件默认隐藏，点击按钮以浮层形式弹出
        if (window.matchMedia('(max-width: 1024px)').matches) toc.classList.toggle('mobile-open');
        else toc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      'scroll-down': () => window.scrollTo({ top: $('#banner').offsetHeight - 50, behavior: 'smooth' }),
      reward: () => { const q = $('.reward-qrs'); q.hidden = !q.hidden; },
    };
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && actions[el.dataset.action]) actions[el.dataset.action](e);
      if (e.target.classList.contains('modal')) closeAll();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
    // 抽屉内点击链接后自动关闭
    $$('#drawer a').forEach((a) => a.addEventListener('click', closeAll));
    // 点击浮层目录中的条目后收起
    $$('#toc-widget a').forEach((a) => a.addEventListener('click', () => $('#toc-widget').classList.remove('mobile-open')));
    // 移动端二级菜单点击展开
    $$('.has-children > .menu-link').forEach((btn) => btn.addEventListener('click', () => btn.parentElement.classList.toggle('open')));
  }

  /** Material 点击水波纹：仅在 md2 风格且未关闭动画时生效 */
  function initRipple() {
    const selector = '.btn, .float-btn, .icon-btn, .menu-link, .page-btn, .segmented button, .share-btn, .tag-chip, .drawer-link, .count-list a, .category-card, .flink-item, .search-item, .code-actions button, .code-expand, .submenu a';
    document.addEventListener('pointerdown', (e) => {
      if (root.dataset.style !== 'md2' || root.dataset.effects === 'off') return;
      const target = e.target.closest(selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const wave = document.createElement('span');
      wave.className = 'ripple';
      wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
      target.classList.add('ripple-host');
      target.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove());
    }, { passive: true });
  }

  /** 页面入口 */
  function init() {
    applySettings();
    initSettingsPanel();
    initActions();
    initToc();
    initScroll();
    initBanner();
    initCodeBlocks();
    initLightbox();
    initShare();
    initReveal();
    initSearch();
    initComments();
    initFooter();
    initWelcome();
    initDevtoolsTip();
    initCopyTip();
    initPrefetch();
    initRipple();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
