export function mountMedia() {
    /** @param {HTMLElement} trigger @param {HTMLElement} media @param {string} title */
    function open(trigger, media, title) { const dialog = document.createElement('dialog'); dialog.className = 'media-dialog'; dialog.setAttribute('aria-label', title); const header = document.createElement('div'); header.className = 'dialog-header'; const heading = document.createElement('h2'); heading.textContent = title; const close = document.createElement('button'); close.className = 'icon-btn'; close.textContent = '×'; close.setAttribute('aria-label', 'Close media'); header.append(heading, close); dialog.append(header, media); document.body.append(dialog); close.onclick = () => dialog.close(); dialog.addEventListener('click', event => { if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
            dialog.close();
    } }); dialog.addEventListener('close', () => { dialog.remove(); trigger.focus(); }); dialog.showModal(); }
    document.querySelectorAll('[data-video]').forEach(node => node.addEventListener('click', () => { const trigger = /** @type {HTMLElement} */ (node); const frame = document.createElement('iframe'); frame.src = `https://www.youtube.com/embed/${encodeURIComponent(trigger.dataset.video || '')}?autoplay=1`; frame.title = 'Project demonstration video'; frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; frame.allowFullscreen = true; open(trigger, frame, 'Project demonstration'); }));
    document.querySelectorAll('.certificate-item').forEach(node => { const item = /** @type {HTMLElement} */ (node); const image = item.querySelector('img'); if (!image)
        return; item.tabIndex = 0; item.setAttribute('role', 'button'); item.setAttribute('aria-label', `Enlarge ${image.alt} certificate`); const enlarge = () => open(item, /** @type {HTMLImageElement} */ (image.cloneNode()), image.alt); item.addEventListener('click', enlarge); item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        enlarge();
    } }); });
}
