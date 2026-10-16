import { createMockWall } from './wall-mock.mjs';
import { runtimeConfig } from '../config/runtime.mjs';
export const apiConfig = runtimeConfig;
/** Wake Render immediately; retry read-only health probes for up to 90 seconds.
 * @param {(elapsed:number) => void} [status]
 */
async function probeBackend(status = () => {}) {
    if (apiConfig.mode !== 'live') return;
    if (!apiConfig.baseUrl) throw new ApiError('The live API URL has not been configured.');
    const started = Date.now();
    while (Date.now() - started < 90000) {
        status(Date.now() - started);
        try {
            const health = await request(apiConfig.baseUrl.replace(/\/$/, '') + '/api/health', {}, true, Math.max(1, Math.min(20000, 90000 - (Date.now() - started))));
            if (/** @type {{status?:string}} */ (health).status === 'ok') return;
        } catch { /* A sleeping server can time out before it becomes ready. */ }
        if (Date.now() - started < 90000) await new Promise(resolve => setTimeout(resolve, 1500));
    }
    throw new ApiError('The portfolio is taking longer to connect. Please retry, or browse the website while live content is unavailable.');
}
/** @type {Promise<void> | undefined} */
let backendWake;
/** Share the background health probe with the Freedom Wall. */
export function wakeBackend() {
    if (apiConfig.mode !== 'live') return Promise.resolve();
    if (!backendWake) backendWake = probeBackend().catch(error => { backendWake = undefined; throw error; });
    return backendWake;
}
let storage = null;
try { if (typeof window !== 'undefined') storage = window.sessionStorage; } catch { /* Disabled storage. */ }
const wall = createMockWall({ storage });
let cooldown = 0;
let visitorId = '';
function visitor() {
    if (visitorId) return visitorId;
    try { visitorId = localStorage.getItem('kurt-visitor-id') || ''; } catch { /* Memory fallback. */ }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId)) visitorId = crypto.randomUUID();
    try { localStorage.setItem('kurt-visitor-id', visitorId); } catch { /* Memory fallback. */ }
    return visitorId;
}
export class ApiError extends Error {
    /** @param {string} message @param {number} status @param {number} retryAfter */
    constructor(message, status = 0, retryAfter = 0) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
/** @template T @param {string} url @param {RequestInit} [options] @param {boolean} [json] @param {number} [timeout] @returns {Promise<T>} */
async function request(url, options = {}, json = true, timeout = 20000) {
    const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: abort.signal }); const text = await response.text(); let data;
        try { data = json ? JSON.parse(text) : text; } catch { throw new ApiError('The server returned an unexpected response. Please retry.', response.status); }
        if (!response.ok) throw new ApiError(json ? data?.error?.message || 'The request failed. Please retry.' : typeof data === 'string' && data.length <= 500 && !/[<>]/.test(data) ? data : 'The request failed. Please retry.', response.status, Number(response.headers.get('Retry-After')) || 0);
        return data;
    } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(abort.signal.aborted ? 'The server is taking longer to wake up. Please retry.' : 'Could not reach the server. Check your connection and retry.'); }
    finally { clearTimeout(timer); }
}
/** @template T @param {string} path @param {unknown} [payload] @returns {Promise<T>} */
function live(path, payload) {
    if (!apiConfig.baseUrl) return Promise.reject(new ApiError('The live API URL has not been configured.'));
    return request(apiConfig.baseUrl.replace(/\/$/, '') + '/api' + path, { method: payload === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': visitor() }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
}
/** @returns {Promise<import('../types/index').Project[]>} */
export function getProjects() { return request('/data/projects.json'); }
/** @param {string} slug @returns {Promise<import('../types/index').Project | undefined>} */
export async function getProject(slug) { return (await getProjects()).find(p => p.slug === slug); }
/** @returns {Promise<{category:string,skills:string[]}[]>} */
export function getSkills() { return request('/portfolio/skills.json'); }
/** @param {{sort?:'new'|'top',offset?:number,limit?:number}} params @returns {Promise<import('../types/index').WallPage>} */
export function getWallMessages(params = {}) { return apiConfig.mode === 'live' ? live('/freedom-wall/messages?' + new URLSearchParams({ sort: params.sort || 'new', offset: String(params.offset || 0), limit: String(params.limit || 6) })) : wall.list(params); }
/** @param {import('../types/index').WallPayload} payload @returns {Promise<import('../types/index').WallMessage>} */
export async function postWallMessage(payload) {
    if (apiConfig.mode !== 'live') return wall.post(payload);
    try { const result = await live('/freedom-wall/messages', { ...payload, emoji: payload.emoji || '💬' }); cooldown = Date.now() + 15000; return /** @type {import('../types/index').WallMessage} */ (result); }
    catch (error) { if (error instanceof ApiError && error.status === 429) cooldown = Date.now() + error.retryAfter * 1000; throw error; }
}
/** @param {string} id @returns {Promise<import('../types/index').WallMessage>} */
export const likeWallMessage = id => apiConfig.mode === 'live' ? live(`/freedom-wall/messages/${encodeURIComponent(id)}/like`, {}) : wall.like(id);
/** @param {string} id */
export const reportWallMessage = id => apiConfig.mode === 'live' ? live(`/freedom-wall/messages/${encodeURIComponent(id)}/report`, {}) : wall.report(id);
export const wallCooldown = () => apiConfig.mode === 'live' ? Math.max(0, cooldown - Date.now()) : wall.getCooldown();
/** @param {import('../types/index').ContactPayload} payload */
export async function sendContact(payload) {
    if (apiConfig.mode === 'mock') { await new Promise(resolve => setTimeout(resolve, 450)); return { ok: true }; }
    if (apiConfig.contactMode === 'backend') return live('/contact', { name: payload.name, email: payload.email, message: payload.message, website: payload['bot-field'] });
    await request('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...payload }).toString() }, false); return { ok: true };
}
/** @param {import('../types/index').ChatPayload} payload @returns {Promise<string>} */
export async function sendChat(payload) {
    if (apiConfig.mode === 'mock') { const projects = await getProjects(); return /project|work/i.test(payload.question) ? 'Kurt’s projects include ' + projects.map(p => p.title).join(', ') + '.' : 'Ask me about Kurt’s projects, skills, or contact details. You can reach Kurt at kurtdecena41@gmail.com.'; }
    if (apiConfig.chatMode === 'backend') { const result = await live('/chat', { message: payload.question, session_id: payload.session_id }); return /** @type {{reply:string}} */ (result).reply; }
    return request('/.netlify/functions/chat-groq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, false);
}
