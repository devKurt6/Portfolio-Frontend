export function useTheme() { const root = document.documentElement; const button = document.getElementById('themeToggle'); if (!button)
    return; function update() { const light = root.dataset.theme === 'light'; if (button) {
    button.textContent = light ? '☾' : '☀';
    button.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
    button.title = `Switch to ${light ? 'dark' : 'light'} mode`;
} } update(); button.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; try {
    localStorage.setItem('theme', root.dataset.theme);
}
catch { /* Persist where storage is available. */ } update(); window.dispatchEvent(new Event('themechange')); });
window.addEventListener('pageshow', () => { try { root.dataset.theme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark'; } catch {} update(); window.dispatchEvent(new Event('themechange')); });
}
