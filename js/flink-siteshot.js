(() => {
  const showPreview = (link, url) => {
    let preview = link.querySelector('.flink-siteshot');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'flink-siteshot';
      link.appendChild(preview);
    }
    preview.style.backgroundImage = `url("${url}")`;
    requestAnimationFrame(() => {
      preview.classList.add('is-visible');
    });
  };

  const hidePreview = (link) => {
    const preview = link.querySelector('.flink-siteshot');
    if (!preview) return;
    preview.classList.remove('is-visible');
  };

  const init = () => {
    const links = document.querySelectorAll('.flink-list-item a[data-siteshot]');
    if (!links.length) return;

    links.forEach((link) => {
      if (link.dataset.siteshotBound) return;
      const url = link.dataset.siteshot;
      if (!url) return;
      link.dataset.siteshotBound = 'true';
      const wrapper = link.closest('.flink-list-item');
      if (wrapper) {
        wrapper.classList.add('flink-list-item--siteshot');
      }

      link.addEventListener('mouseenter', () => showPreview(link, url));
      link.addEventListener('mouseleave', () => hidePreview(link));
      link.addEventListener('blur', () => hidePreview(link));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
