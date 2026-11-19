import { useEffect, type RefObject } from 'react';

/** Reveal home sections once, only when they enter the viewport. */
export function useScrollReveal(root: RefObject<HTMLElement>, dependency: unknown) {
  useEffect(() => {
    const rootElement = root.current;
    if (!rootElement || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-scroll-reveal', 'visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

    const observeSections = (container: ParentNode) => {
      container.querySelectorAll<HTMLElement>('section[id]:not(#home), footer[id]').forEach((section) => {
        if (section.hasAttribute('data-scroll-reveal')) return;
        section.setAttribute('data-scroll-reveal', 'pending');
        observer.observe(section);
      });
    };

    observeSections(rootElement);
    const mutations = new MutationObserver((records) => {
      records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.matches('section[id]:not(#home), footer[id]')) {
            node.setAttribute('data-scroll-reveal', 'pending');
            observer.observe(node);
          }
          observeSections(node);
        }
      }));
    });
    mutations.observe(rootElement, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      rootElement.querySelectorAll<HTMLElement>('[data-scroll-reveal]').forEach((section) => section.removeAttribute('data-scroll-reveal'));
    };
  }, [root, dependency]);
}
