/* Preserve the existing Marked formatter, with a DOM allowlist before display.
   The text-only fallback below works if the existing CDN is unavailable. */
/** @type {Promise<void> | undefined} */
let loading;
export function loadMarkdown() {
    if (window.marked)
        return Promise.resolve();
    return loading ||= new Promise(resolve => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'; script.onload = () => resolve(); script.onerror = () => resolve(); document.head.append(script); });
}
const allowed = new Set(['P', 'BR', 'STRONG', 'EM', 'DEL', 'CODE', 'PRE', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A']);
/** @param {HTMLElement} target @param {string} html */
function safeHTML(target, html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    /** @param {Node} source @param {Node} destination */
    function copy(source, destination) { for (const child of source.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            destination.appendChild(document.createTextNode(child.textContent || ''));
            continue;
        }
        if (!(child instanceof HTMLElement) || !allowed.has(child.tagName))
            continue;
        const element = document.createElement(child.tagName.toLowerCase());
        if (element instanceof HTMLAnchorElement) {
            const href = child.getAttribute('href') || '';
            if (/^(https?:\/\/|mailto:|\/|#)/i.test(href) && !href.startsWith('//')) {
                element.href = href;
                element.target = '_blank';
                element.rel = 'noopener noreferrer';
            }
        }
        copy(child, element);
        destination.appendChild(element);
    } }
    const fragment = document.createDocumentFragment();
    copy(template.content, fragment);
    target.replaceChildren(fragment);
}
/** @param {HTMLElement} parent @param {string} value */
function inline(parent, value) { const tokens = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g; let cursor = 0; for (const match of value.matchAll(tokens)) {
    parent.append(document.createTextNode(value.slice(cursor, match.index)));
    const part = document.createElement(match[2] ? 'strong' : match[3] ? 'code' : 'a');
    part.textContent = match[2] || match[3] || match[4];
    if (part instanceof HTMLAnchorElement) {
        const url = match[5].trim();
        if (/^(https?:\/\/|mailto:)/i.test(url)) {
            part.href = url;
            part.target = '_blank';
            part.rel = 'noopener noreferrer';
        }
        else {
            part.removeAttribute('href');
        }
    }
    parent.append(part);
    cursor = (match.index || 0) + match[0].length;
} parent.append(document.createTextNode(value.slice(cursor))); }
/** @param {HTMLElement} target @param {string} value */
export function renderMarkdown(target, value) { if (window.marked) {
    safeHTML(target, window.marked.parse(value, { async: false }));
    return;
} target.replaceChildren(); let code = false; /** @type {HTMLPreElement|null} */ /** @type {HTMLPreElement|null} */ let pre = null; /** @type {HTMLUListElement|null} */ /** @type {HTMLUListElement|null} */ let list = null; for (const line of value.split('\n')) {
    if (line.startsWith('```')) {
        code = !code;
        if (code) {
            pre = document.createElement('pre');
            target.append(pre);
        }
        list = null;
        continue;
    }
    if (code && pre) {
        pre.textContent += (pre.textContent ? '\n' : '') + line;
        continue;
    }
    if (/^\s*[-*] /.test(line)) {
        if (!list) {
            list = document.createElement('ul');
            target.append(list);
        }
        const item = document.createElement('li');
        inline(item, line.replace(/^\s*[-*] /, ''));
        list.append(item);
        continue;
    }
    list = null;
    if (!line.trim())
        continue;
    const paragraph = document.createElement('p');
    inline(paragraph, line.replace(/^#{1,6}\s+/, ''));
    target.append(paragraph);
} }
