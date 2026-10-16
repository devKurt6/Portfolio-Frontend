import { mountMedia } from '../components/ui/media.mjs';
export function mount() {
    mountMedia();
    const input = /** @type {HTMLInputElement | null} */ (document.getElementById('projectSearch'));
    if (!input) return;
    let category = 'All';
    const chips = [...document.querySelectorAll('button[data-filter]')];
    function filter() {
        const query = input?.value.trim().toLowerCase() || ''; let count = 0;
        for (const node of document.querySelectorAll('.project-card')) {
            const card = /** @type {HTMLElement} */ (node);
            const show = (category === 'All' || card.dataset.category === category) && (card.dataset.search || '').includes(query);
            card.hidden = !show; if (show) count++;
        }
        document.getElementById('projectEmpty')?.toggleAttribute('hidden', count > 0);
        const status = document.getElementById('projectCount'); if (status) status.textContent = `${count} project${count === 1 ? '' : 's'}`;
        for (const chip of chips) chip.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (chip).dataset.filter === category));
    }
    input.addEventListener('input', filter);
    chips.forEach(chip => chip.addEventListener('click', () => { category = /** @type {HTMLElement} */ (chip).dataset.filter || 'All'; filter(); }));
    document.getElementById('clearFilters')?.addEventListener('click', () => { input.value = ''; category = 'All'; filter(); input.focus(); });
    filter();
}
