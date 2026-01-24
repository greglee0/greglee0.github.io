(() => {
  const CONFIG = {
    apiUrl: "https://file.mo7.cc/api/public/url",
    fallbackUrl: "https://api.bimg.cc/random?w=1920&h=1080&mkt=zh-CN",
    cacheMs: 24 * 60 * 60 * 1000,
  };

  const KEYS = {
    list: "bingWallpaperList",
    index: "bingWallpaperIndex",
    fetchedAt: "bingWallpaperFetchedAt",
  };

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        // Ignore write errors (storage full or disabled).
      }
    },
  };

  const state = {
    list: [],
    index: 0,
    header: null,
    elements: null,
    fallback: "",
  };

  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

  const isHomePage = () => {
    if (window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType) {
      return window.GLOBAL_CONFIG_SITE.pageType === "home";
    }
    return !!document.querySelector("#recent-posts");
  };

  const isEnglishPath = () => window.location.pathname.startsWith("/en");

  const toUrl = (value) => {
    if (!value) return "";
    const match = value.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : value;
  };

  const preload = (url, onLoad) => {
    if (!url) return;
    const img = new Image();
    img.onload = () => onLoad(url);
    img.onerror = () => onLoad(url);
    img.src = url;
  };

  const setBackground = (value) => {
    if (!state.header) return;
    const url = toUrl(value);
    if (!url) return;
    preload(url, (finalUrl) => {
      state.header.style.backgroundImage = `url("${finalUrl}")`;
    });
  };

  const normalizeItem = (item) => {
    if (!item) return null;
    if (item.EN && isEnglishPath()) {
      item = item.EN;
    }

    return {
      title: item.Title || item.Copyright || "Bing Wallpaper",
      link: item.CopyrightLink || "",
      path: item.Path || item.Url || item.url || "",
    };
  };

  const updateNavButtons = () => {
    if (!state.elements) return;
    const { prevBtn, nextBtn, nav } = state.elements;
    const listLength = state.list.length;
    if (listLength <= 1) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      nav.style.display = "none";
      return;
    }
    nav.style.display = "flex";
    prevBtn.disabled = state.index <= 0;
    nextBtn.disabled = state.index >= listLength - 1;
  };

  const updateView = () => {
    if (!state.elements) return;
    const item = normalizeItem(state.list[state.index]);
    const { text, link } = state.elements;

    if (!item) {
      text.textContent = "Bing Wallpaper";
      link.style.display = "none";
      setBackground(state.fallback || CONFIG.fallbackUrl);
      updateNavButtons();
      return;
    }

    text.textContent = item.title || "Bing Wallpaper";

    if (item.link) {
      link.href = item.link;
      link.style.display = "inline-flex";
    } else {
      link.style.display = "none";
    }

    setBackground(item.path || state.fallback || CONFIG.fallbackUrl);
    updateNavButtons();
  };

  const setIndex = (nextIndex) => {
    if (!state.list.length) return;
    state.index = clamp(nextIndex, 0, state.list.length - 1);
    storage.set(KEYS.index, state.index);
    updateView();
  };

  const createBar = () => {
    if (!state.header) return null;
    let bar = document.getElementById("bing-wallpaper");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "bing-wallpaper";
      bar.className = "bing-wallpaper";
      bar.innerHTML = `
        <a class="bing-wallpaper__link" id="bing-wallpaper-link" target="_blank" rel="noopener">
          <span class="bing-wallpaper__icon" aria-hidden="true">
            <svg class="mapPin" height="16" width="16" viewBox="0 0 12 12" aria-hidden="true" role="presentation"><path d="M0 0h12v12h-12z" fill="none"></path><path d="M6.5 3a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5zm0-3a4.5 4.5 0 0 0-4.5 4.5 5.607 5.607 0 0 0 .087.873c.453 2.892 2.951 5.579 3.706 6.334a1 1 0 0 0 1.414 0c.755-.755 3.253-3.442 3.706-6.334a5.549 5.549 0 0 0 .087-.873 4.5 4.5 0 0 0-4.5-4.5zm3.425 5.218c-.36 2.296-2.293 4.65-3.425 5.782-1.131-1.132-3.065-3.486-3.425-5.782a4.694 4.694 0 0 1-.075-.718 3.5 3.5 0 0 1 7 0 4.634 4.634 0 0 1-.075.718z"></path></svg>
          </span>
          <span class="bing-wallpaper__text" id="bing-wallpaper-text">Bing Wallpaper</span>
        </a>
        <div class="bing-wallpaper__nav" aria-label="Switch wallpaper">
          <button type="button" id="bing-wallpaper-prev" aria-label="Previous wallpaper">&lt;</button>
          <button type="button" id="bing-wallpaper-next" aria-label="Next wallpaper">&gt;</button>
        </div>
      `;
      state.header.appendChild(bar);
    }

    const elements = {
      bar,
      link: bar.querySelector("#bing-wallpaper-link"),
      text: bar.querySelector("#bing-wallpaper-text"),
      nav: bar.querySelector(".bing-wallpaper__nav"),
      prevBtn: bar.querySelector("#bing-wallpaper-prev"),
      nextBtn: bar.querySelector("#bing-wallpaper-next"),
    };

    if (!bar.dataset.ready) {
      elements.prevBtn.addEventListener("click", () => setIndex(state.index - 1));
      elements.nextBtn.addEventListener("click", () => setIndex(state.index + 1));
      bar.dataset.ready = "true";
    }

    return elements;
  };

  const fetchList = () => {
    const cachedList = storage.get(KEYS.list, []);
    const cachedAt = storage.get(KEYS.fetchedAt, 0);
    const cacheFresh = cachedList.length && Date.now() - cachedAt < CONFIG.cacheMs;

    if (cacheFresh) {
      return Promise.resolve(cachedList);
    }

    return fetch(CONFIG.apiUrl, { method: "GET" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data) => {
        const list = Array.isArray(data.Data) ? data.Data : [];
        if (list.length) {
          storage.set(KEYS.list, list);
          storage.set(KEYS.fetchedAt, Date.now());
        }
        return list;
      })
      .catch(() => cachedList);
  };

  const init = () => {
    if (!isHomePage()) return;
    const header = document.getElementById("page-header");
    if (!header || header.classList.contains("not-top-img")) return;

    state.header = header;
    const fallback = header.style.backgroundImage || getComputedStyle(header).backgroundImage;
    state.fallback = fallback && fallback !== "none" ? fallback : CONFIG.fallbackUrl;

    state.elements = createBar();
    if (!state.elements) return;

    const storedIndex = storage.get(KEYS.index, 0);
    state.index = typeof storedIndex === "number" ? storedIndex : 0;

    updateView();

    fetchList().then((list) => {
      state.list = list || [];
      if (state.list.length) {
        state.index = clamp(state.index, 0, state.list.length - 1);
      }
      updateView();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
