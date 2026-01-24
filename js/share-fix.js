(() => {
  const dedupeShareIcons = container => {
    const seen = new Set();
    container.querySelectorAll('.social-share-icon').forEach(icon => {
      const key = icon.getAttribute('data-site') || icon.className;
      if (seen.has(key)) {
        icon.remove();
        return;
      }
      seen.add(key);
    });
  };

  const setupObserver = () => {
    document.querySelectorAll('.social-share').forEach(container => {
      if (container.dataset.shareDedupe === '1') return;
      container.dataset.shareDedupe = '1';
      dedupeShareIcons(container);
      const observer = new MutationObserver(() => dedupeShareIcons(container));
      observer.observe(container, { childList: true });
    });
  };

  document.addEventListener('DOMContentLoaded', setupObserver);
  window.addEventListener('load', setupObserver);
  document.addEventListener('pjax:complete', setupObserver);
})();
