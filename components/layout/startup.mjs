import { startupMarkup } from './startup-markup.mjs';
import { apiConfig, wakeBackend } from '../../services/api.mjs';

const SESSION_KEY = 'kurt-startup-seen-v1';
function startupSeen() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; }
    catch { return document.cookie.split(';').some(item => item.trim() === `${SESSION_KEY}=1`); }
}
function rememberStartup() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); }
    catch {
        // Session cookie fallback: no expiration and no personal information.
        document.cookie = `${SESSION_KEY}=1; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    }
}

/** Play a fixed 2.5-second introduction; wake the backend independently. */
export function startPortfolio() {
    if (apiConfig.mode === 'live') void wakeBackend().catch(() => {});
    if (apiConfig.mode !== 'live' || startupSeen()) {
        document.getElementById('startupScreen')?.remove();
        document.documentElement.classList.remove('startup-pending');
        return Promise.resolve();
    }
    return new Promise(resolve => {
        const panel = document.getElementById('startupScreen') || document.createElement('section');
        panel.className = 'startup-screen';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'startupTitle');
        panel.tabIndex = -1;
        panel.innerHTML = startupMarkup;
        const siblings = [...document.body.children].filter(element => element instanceof HTMLElement && element !== panel);
        const saved = siblings.map(element => ({ element: /** @type {HTMLElement} */ (element), inert: /** @type {HTMLElement} */ (element).inert }));
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        saved.forEach(item => { item.element.inert = true; });
        document.body.append(panel);
        panel.focus({ preventScroll: true });
        const status = /** @type {HTMLElement} */ (panel.querySelector('.startup-status'));
        const retry = /** @type {HTMLButtonElement} */ (panel.querySelector('#startupRetry'));
        const proceed = /** @type {HTMLButtonElement} */ (panel.querySelector('#startupContinue'));
        const log = /** @type {HTMLElement} */ (panel.querySelector('.startup-log'));
        const progress = /** @type {HTMLElement} */ (panel.querySelector('.startup-progress'));
        /** @param {string} text */
        function step(text) {
            const line = document.createElement('li');
            line.textContent = text;
            log.append(line);
        }
        let finished = false;
        /** @type {ReturnType<typeof setTimeout>[]} */
        let logTimers = [];
        function clearLogTimers() { logTimers.forEach(clearTimeout); logTimers = []; }
        function close(ready = true) {
            if (finished) return;
            finished = true;
            clearLogTimers();
            document.documentElement.classList.remove('startup-pending');
            rememberStartup();
            if (!ready) step('Opening website without waiting');
            progress.textContent = ready ? '100%' : 'Skipped';
            panel.classList.add('startup-complete');
            retry.disabled = proceed.disabled = true;
            // Mount live content beneath the opening screen, so its requests
            // start during the transition instead of after it disappears.
            resolve(undefined);
            function reveal() {
                panel.remove();
                document.body.classList.remove('startup-revealing');
                document.body.style.overflow = oldOverflow;
                saved.forEach(item => { item.element.inert = item.inert; });
                document.getElementById('main')?.focus({ preventScroll: true });
            }
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); return; }
            document.body.classList.add('startup-revealing');
            panel.classList.add('startup-opening');
            const fallback = setTimeout(reveal, 1100);
            panel.addEventListener('animationend', event => {
                if (event.target !== panel) return;
                clearTimeout(fallback);
                reveal();
            });
        }
        function connect() {
            retry.hidden = true;
            step('Starting your experience');
            ['Preparing the interface', 'Setting up your workspace', 'Getting things ready', 'Ready'].forEach((message, index) => {
                logTimers.push(setTimeout(() => { if (!finished) step(message); }, (index + 1) * 350));
            });
            progress.textContent = 'Preparing...';
            status.textContent = 'Preparing your portfolio experience';
            // The 800 ms opening animation is included in the 2.5-second total.
            const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 2500 : 1700;
            logTimers.push(setTimeout(() => close(), duration));
        }
        proceed.onclick = () => close(false);
        panel.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const buttons = [retry, proceed].filter(button => !button.hidden);
            if (!buttons.length) { event.preventDefault(); return; }
            if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
            else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
        });
        void connect();
    });
}
