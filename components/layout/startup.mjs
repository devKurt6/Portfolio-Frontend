import { apiConfig, wakeBackend } from '../../services/api.mjs';

/** Wait for backend readiness before mounting live pages. Mock mode opens directly. */
export function startPortfolio() {
    if (apiConfig.mode !== 'live') return Promise.resolve();
    return new Promise(resolve => {
        const panel = document.createElement('section');
        panel.className = 'startup-screen';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'startupTitle');
        panel.tabIndex = -1;
        panel.innerHTML = `<div class="startup-card"><span class="startup-brand">Kurt<span>.</span>dev</span><div class="startup-orbit" aria-hidden="true"><span></span><span></span><span></span></div><p class="startup-eyebrow">WELCOME TO MY PORTFOLIO</p><h1 id="startupTitle">Starting things up</h1><p class="startup-status" role="status" aria-live="polite">Connecting to projects and the Freedom Wall…</p><div class="startup-track" aria-hidden="true"><span></span></div><p class="startup-hint">The first visit may take about a minute while the server wakes up.</p><div class="startup-actions"><button class="btn primary" id="startupRetry" hidden>Try again</button><button class="btn" id="startupContinue" hidden>Browse website anyway</button></div></div>`;
        const siblings = [...document.body.children].filter(element => element instanceof HTMLElement);
        const saved = siblings.map(element => ({ element: /** @type {HTMLElement} */ (element), inert: /** @type {HTMLElement} */ (element).inert }));
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        saved.forEach(item => { item.element.inert = true; });
        document.body.append(panel);
        panel.focus({ preventScroll: true });
        const status = /** @type {HTMLElement} */ (panel.querySelector('.startup-status'));
        const retry = /** @type {HTMLButtonElement} */ (panel.querySelector('#startupRetry'));
        const proceed = /** @type {HTMLButtonElement} */ (panel.querySelector('#startupContinue'));
        let finished = false;
        function close() {
            if (finished) return;
            finished = true;
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
            const fallback = setTimeout(reveal, 850);
            panel.addEventListener('animationend', event => {
                if (event.target !== panel) return;
                clearTimeout(fallback);
                reveal();
            });
        }
        async function connect() {
            retry.hidden = proceed.hidden = true;
            panel.classList.remove('startup-failed');
            status.textContent = 'Connecting to projects and the Freedom Wall…';
            const timer = setTimeout(() => { if (!finished) status.textContent = 'Waking up the server. Your portfolio will open automatically…'; }, 4000);
            try { await wakeBackend(); close(); }
            catch (error) {
                if (finished) return;
                clearTimeout(timer);
                panel.classList.add('startup-failed');
                status.textContent = error instanceof Error ? error.message : 'Could not connect. Please retry.';
                retry.hidden = proceed.hidden = false;
                retry.focus();
            } finally { clearTimeout(timer); }
        }
        retry.onclick = () => { void connect(); };
        proceed.onclick = close;
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
