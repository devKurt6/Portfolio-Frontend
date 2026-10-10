/** @param {Element} element @param {() => void | Promise<void>} callback */
export function useInView(element, callback) { if (!('IntersectionObserver' in window)) {
    void callback();
    return () => { };
} const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) {
    observer.disconnect();
    void callback();
} }, { rootMargin: '300px' }); observer.observe(element); return () => observer.disconnect(); }
