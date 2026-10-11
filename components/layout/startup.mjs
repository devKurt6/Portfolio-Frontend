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

/** Wait for backend readiness before mounting live pages. Mock mode opens directly. */
export function startPortfolio() {
    if (apiConfig.mode !== 'live' || startupSeen()) {
        document.getElementById('startupScreen')?.remove();
        document.documentElement.classList.remove('startup-pending');
        return Promise.resolve();
    }
    return new Promise(resolve => {
        const shownAt = performance.now();
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
        function close(ready = true) {
            if (finished) return;
            finished = true;
            document.documentElement.classList.remove('startup-pending');
            rememberStartup();
            step(ready ? 'Backend connected — ready' : 'Opening website without waiting');
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
        async function connect() {
            retry.hidden = true;
            proceed.hidden = false;
            log.replaceChildren();
            step('Initialising interface');
            step('Connecting projects and Freedom Wall');
            progress.textContent = 'Connecting…';
            panel.classList.remove('startup-failed');
            status.textContent = 'Connecting to projects and the Freedom Wall…';
            const timer = setTimeout(() => { if (!finished) { step('Waking up server — please wait'); progress.textContent = 'Waiting for server'; status.textContent = 'Waking up the server. Your portfolio will open automatically…'; } }, 4000);
            try {
                await wakeBackend();
                await new Promise(done => setTimeout(done, Math.max(0, 2500 - (performance.now() - shownAt))));
                close();
            }
            catch (error) {
                if (finished) return;
                clearTimeout(timer);
                panel.classList.add('startup-failed');
                status.textContent = error instanceof Error ? error.message : 'Could not connect. Please retry.';
                step('Connection delayed — retry available');
                progress.textContent = 'Not connected';
                proceed.textContent = 'Browse anyway';
                retry.hidden = proceed.hidden = false;
                retry.focus();
            } finally { clearTimeout(timer); }
        }
        retry.onclick = () => { void connect(); };
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
