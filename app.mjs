import { useTheme } from './hooks/useTheme.mjs';
import { toast } from './components/ui/toast.mjs';
useTheme();
const legacyRoutes = new Map([['home', '/'], ['projects', '/projects/'], ['about', '/about/'], ['contact', '/contact/']]);
function legacyNavigation() { const hash = location.hash.slice(1); const path = legacyRoutes.get(hash); if (path) {
    location.replace(path);
    return;
} const prototypeRoute = hash.startsWith('/') ? hash : null; if (prototypeRoute && (/^\/(projects(?:\/[\w-]+)?|about|contact)\/?$/.test(prototypeRoute) || prototypeRoute === '/')) {
    location.replace(prototypeRoute.endsWith('/') ? prototypeRoute : prototypeRoute + '/');
} }
legacyNavigation();
window.addEventListener('hashchange', legacyNavigation);
const loaders = { home: () => import('./pages/home.mjs'), projects: () => import('./pages/projects.mjs'), about: () => import('./pages/about.mjs'), contact: () => import('./pages/contact.mjs') };
const key = /** @type {keyof typeof loaders} */ (document.body.dataset.page);
if (key in loaders)
    loaders[key]().then(module => module.mount()).catch(() => toast('Some interactions could not load. Please refresh to try again.'));
const fab = /** @type {HTMLButtonElement | null} */ (document.getElementById('chatToggle'));
/** @type {Promise<import('./components/chatbot/panel.mjs').ChatController> | undefined} */ let chat;
fab?.addEventListener('click', async () => { fab.disabled = true; try {
    chat ||= import('./components/chatbot/panel.mjs').then(module => module.mount());
    (await chat).toggle();
}
catch {
    chat = undefined;
    toast('The assistant could not load. Please try again.');
}
finally {
    fab.disabled = false;
} });
