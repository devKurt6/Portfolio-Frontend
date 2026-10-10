let timer = 0;
/** @param {string} message */
export function toast(message) { const el = document.getElementById('toast'); if (!el)
    return; clearTimeout(timer); el.textContent = message; el.classList.add('on'); timer = window.setTimeout(() => el.classList.remove('on'), 3500); }
