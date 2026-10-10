import { validateWall, hasLinks } from '../lib/validation.mjs';
/** @typedef {import('../types/index').WallMessage} WallMessage */
/** @param {{delay?: number, now?: () => number, storage?: Storage | null}} [options] */
export function createMockWall({ delay = 450, now = Date.now, storage = null } = {}) {
    const pause = async () => { await new Promise(resolve => setTimeout(resolve, delay)); if (typeof navigator !== 'undefined' && navigator.onLine === false)
        throw Error('The simulated wall is offline. Please retry when connected.'); };
    /** @type {WallMessage[]} */ let messages = [];
    let cooldown = 0;
    let hidden = new Set();
    try {
        storage?.removeItem('kurt-wall-demo-v1');
        const saved = storage?.getItem('kurt-wall-demo-v2');
        if (saved) {
            const data = JSON.parse(saved);
            if (Array.isArray(data.messages)) {
                messages = data.messages;
                cooldown = Number(data.cooldown) || 0;
                hidden = new Set(data.hidden || []);
            }
        }
    }
    catch { /* Memory-only fallback. */ }
    function save() { try {
        storage?.setItem('kurt-wall-demo-v2', JSON.stringify({ messages, cooldown, hidden: [...hidden] }));
    }
    catch { /* Memory-only fallback. */ } }
    return {
        /** @param {{sort?: 'new'|'top',offset?:number,limit?:number}} [params] @returns {Promise<import('../types/index').WallPage>} */
        async list({ sort = 'new', offset = 0, limit = 6 } = {}) { await pause(); const visible = messages.filter(m => !hidden.has(m.id) && (m.status === 'published' || m.mine)).sort(sort === 'top' ? (a, b) => b.likes - a.likes || b.timestamp - a.timestamp : (a, b) => b.timestamp - a.timestamp); return { items: structuredClone(visible.slice(offset, offset + limit)), total: visible.length, nextOffset: Math.min(offset + limit, visible.length) }; },
        /** @param {import('../types/index').WallPayload} payload @returns {Promise<WallMessage>} */
        async post(payload) { await pause(); if (payload.website)
            throw Error('Unable to post this message.'); const errors = validateWall(payload); if (Object.keys(errors).length)
            throw Error(Object.values(errors)[0]); if (now() < cooldown)
            throw Error(`Wait ${Math.ceil((cooldown - now()) / 1000)} seconds before posting again.`); const message = { id: globalThis.crypto.randomUUID(), name: payload.name.trim(), text: payload.text.trim(), emoji: payload.emoji, likes: 0, timestamp: now(), liked: false, status: /** @type {'pending'|'published'} */ (hasLinks.test(payload.text + ' ' + payload.name) ? 'pending' : 'published'), mine: true }; messages.push(message); cooldown = now() + 15000; save(); return structuredClone(message); },
        /** @param {string} id @returns {Promise<WallMessage>} */
        async like(id) { await pause(); const m = messages.find(m => m.id === id); if (!m)
            throw Error('This note is no longer available.'); m.liked = !m.liked; m.likes = Math.max(0, m.likes + (m.liked ? 1 : -1)); save(); return structuredClone(m); },
        /** @param {string} id */
        async report(id) { await pause(); hidden.add(id); save(); return { ok: true }; },
        getCooldown() { return Math.max(0, cooldown - now()); }
    };
}
