import { useChat } from '../../hooks/useChat.mjs';
import { renderMarkdown, loadMarkdown } from '../../lib/markdown.mjs';
/** @typedef {{toggle:()=>void,close:()=>void}} ChatController */
/** @returns {ChatController} */
export function mount() {
    const host = document.getElementById('chatHost');
    const fab = /** @type {HTMLButtonElement} */ (document.getElementById('chatToggle'));
    if (!host)
        throw Error('Assistant host missing.');
    host.innerHTML = `<section class="chat-window" id="chatWindow" aria-label="Kurt's AI assistant" hidden><header class="chat-header"><span class="assistant-avatar" aria-hidden="true">AI</span><div><strong>Kurt's AI Assistant</strong><small>Projects, skills, and experience</small></div><button class="icon-btn" id="chatClose" aria-label="Close assistant">×</button></header><div class="chat-log" id="chatMessages" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversation"></div><div class="suggestions" role="group" aria-label="Suggested questions"><button>What are your best projects?</button><button>Which skills do you use?</button><button>Tell me about your experience</button></div><form class="chat-form"><label class="sr-only" for="chatInput">Message to Kurt's assistant</label><input id="chatInput" autocomplete="off" placeholder="Ask something..." maxlength="2000"><button id="chatSendBtn" aria-label="Send message" type="submit">↑</button></form></section>`;
    const panel = /** @type {HTMLElement} */ (host.querySelector('#chatWindow'));
    const input = /** @type {HTMLInputElement} */ (host.querySelector('#chatInput'));
    const send = /** @type {HTMLButtonElement} */ (host.querySelector('#chatSendBtn'));
    const log = /** @type {HTMLElement} */ (host.querySelector('#chatMessages'));
    const form = /** @type {HTMLFormElement} */ (host.querySelector('form'));
    const chat = useChat();
    let open = false;
    /** @param {string} text @param {'user'|'assistant'} role */
    function say(text, role) { const bubble = document.createElement('div'); bubble.className = `chat-message ${role}`; if (role === 'assistant')
        renderMarkdown(bubble, text);
    else
        bubble.textContent = text; log.append(bubble); log.scrollTop = log.scrollHeight; return bubble; }
    void loadMarkdown();
    say("Hi! I'm Kurt's AI assistant. Ask me anything about his projects or skills! What is your name?👋", 'assistant');
    function close() { open = false; panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-label', 'Ask my assistant'); fab.focus(); }
    function toggle() { if (open) {
        close();
        return;
    } open = true; panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); fab.setAttribute('aria-label', 'Close assistant'); input.focus(); }
    host.querySelector('#chatClose')?.addEventListener('click', close);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
    } });
    /** @param {string} question */
    async function ask(question) { question = question.trim(); if (!question || chat.busy)
        return; input.value = ''; send.disabled = true; input.disabled = true; host?.querySelectorAll('.suggestions button').forEach(node => /** @type {HTMLButtonElement} */ (node).disabled = true); say(question, 'user'); const typing = say('', 'assistant'); typing.setAttribute('aria-label', 'Assistant is typing'); typing.innerHTML = '<span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>'; try {
        const reply = await chat.ask(question);
        typing.remove();
        const bubble = say('', 'assistant');
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reply.length <= 500 && !reduced) {
            bubble.setAttribute('aria-live', 'off');
            bubble.setAttribute('aria-busy', 'true');
            for (const char of reply) {
                bubble.append(document.createTextNode(char));
                log.scrollTop = log.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, 12));
            }
            bubble.removeAttribute('aria-live');
            bubble.removeAttribute('aria-busy');
        }
        renderMarkdown(bubble, reply);
        log.scrollTop = log.scrollHeight;
    }
    catch (error) {
        typing.remove();
        say(error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Can't reach backend. Please comeback later.", 'assistant');
    }
    finally {
        send.disabled = false;
        input.disabled = false;
        host?.querySelectorAll('.suggestions button').forEach(node => /** @type {HTMLButtonElement} */ (node).disabled = false);
        if (open)
            input.focus();
    } }
    form.addEventListener('submit', event => { event.preventDefault(); void ask(input.value); });
    host.querySelectorAll('.suggestions button').forEach(button => button.addEventListener('click', () => void ask(button.textContent || '')));
    return { toggle, close };
}
