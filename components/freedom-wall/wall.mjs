import { apiConfig } from '../../services/api.mjs';
import { useWallMessages } from '../../hooks/useWallMessages.mjs';
import { postWallMessage, likeWallMessage, reportWallMessage, wallCooldown } from '../../services/api.mjs';
import { validateWall } from '../../lib/validation.mjs';
import { avatarHue, initials, relativeTime } from '../../lib/text.mjs';
import { toast } from '../ui/toast.mjs';
/** @param {HTMLElement} host */
export function mount(host) {
    host.innerHTML = `<div class="wall-grid"><form class="wall-composer" id="wallForm" novalidate><label for="wallName">Display name<input id="wallName" name="name" autocomplete="nickname" maxlength="24" placeholder="Your name" aria-describedby="wallNameError"><span class="field-error" id="wallNameError"></span></label><label for="wallText">Your message<textarea id="wallText" name="text" maxlength="300" placeholder="Say something kind" aria-describedby="wallTextError wallCounter"></textarea><span class="field-error" id="wallTextError"></span></label><div class="emoji-picker" role="group" aria-label="Optional emoji"></div><span class="wall-counter" id="wallCounter">0 / 300</span><label class="honeypot" aria-hidden="true">Leave blank<input name="website" tabindex="-1" autocomplete="off"></label><button class="btn primary" type="submit" id="wallPost">Post to the wall</button><p class="wall-error" id="wallError" role="alert"></p><small>Be kind. Messages containing links await approval. ${apiConfig.mode === 'live' ? 'Messages are stored on the server.' : 'Demo mode: messages stay in this browser session.'}</small></form><div><div class="wall-toolbar" role="group" aria-label="Sort messages"><button class="chip" data-sort="new" aria-pressed="true">Newest</button><button class="chip" data-sort="top" aria-pressed="false">Most liked</button><span class="note-count" id="wallCount" role="status"></span></div><div id="wallNotes"></div><div class="load-more" id="wallMore"></div></div></div>`;
    const form = /** @type {HTMLFormElement} */ (host.querySelector('#wallForm'));
    const name = /** @type {HTMLInputElement} */ (form.elements.namedItem('name'));
    const text = /** @type {HTMLTextAreaElement} */ (form.elements.namedItem('text'));
    const website = /** @type {HTMLInputElement} */ (form.elements.namedItem('website'));
    const submit = /** @type {HTMLButtonElement} */ (host.querySelector('#wallPost'));
    const notes = /** @type {HTMLElement} */ (host.querySelector('#wallNotes'));
    const more = /** @type {HTMLElement} */ (host.querySelector('#wallMore'));
    const error = /** @type {HTMLElement} */ (host.querySelector('#wallError'));
    const counter = /** @type {HTMLElement} */ (host.querySelector('#wallCounter'));
    let emoji = '', posting = false;
    const picker = /** @type {HTMLElement} */ (form.querySelector('.emoji-picker'));
    for (const value of ['👋', '🔥', '💡', '🙏', '💪', '🌱', '⭐', '🎉']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = value;
        b.setAttribute('aria-label', `Add ${value} emoji`);
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => { emoji = emoji === value ? '' : value; picker.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === emoji))); };
        picker.append(b);
    }
    text.addEventListener('input', () => { counter.textContent = `${text.value.length} / 300`; });
    form.addEventListener('focusin', () => document.body.classList.add('composing'));
    form.addEventListener('focusout', () => queueMicrotask(() => document.body.classList.toggle('composing', form.contains(document.activeElement))));
    function cooldown() { const seconds = Math.ceil(wallCooldown() / 1000); submit.disabled = posting || seconds > 0; submit.textContent = posting ? 'Posting…' : seconds > 0 ? `Post again in ${seconds}s` : 'Post to the wall'; }
    const timer = window.setInterval(cooldown, 500);
    window.addEventListener('pagehide', event => { if(!event.persisted)clearInterval(timer); });
    cooldown();
    /** @param {import('../../hooks/useWallMessages.mjs').WallState} state */
    function draw(state) {
        host.querySelectorAll('[data-sort]').forEach(node => node.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (node).dataset.sort === state.sort)));
        const count = host.querySelector('#wallCount');
        if (count)
            count.textContent = `${state.total} notes`;
        notes.replaceChildren();
        more.replaceChildren();
        if (state.busy && !state.items.length) {
            notes.innerHTML = '<div class="notes-grid" aria-label="Loading messages" aria-busy="true">' + Array(4).fill('<div class="card card-body" aria-hidden="true"><div class="skeleton" style="height:24px;width:65%"></div><div class="skeleton" style="height:70px;margin-top:15px"></div></div>').join('') + '</div>';
            return;
        }
        if (state.error) {
            const panel = document.createElement('div');
            panel.className = 'state';
            const message = document.createElement('p');
            message.textContent = state.error;
            const retry = document.createElement('button');
            retry.className = 'btn';
            retry.textContent = 'Retry';
            retry.onclick = () => void controller.load(state.items.length === 0);
            panel.append(message, retry);
            notes.append(panel);
            return;
        }
        if (!state.items.length) {
            notes.innerHTML = '<div class="state"><h3>The wall is empty</h3><p>Be the first to leave a note.</p></div>';
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'notes-grid';
        state.items.forEach((message, index) => {
            const note = document.createElement('article');
            note.className = `note note-${index % 5}`;
            if (message.status === 'pending') {
                const badge = document.createElement('span');
                badge.className = 'pending-badge';
                badge.textContent = 'Awaiting approval · Only you can see this';
                note.append(badge);
            }
            const head = document.createElement('div');
            head.className = 'note-head';
            const avatar = document.createElement('span');
            avatar.className = 'avatar';
            avatar.style.background = `hsl(${avatarHue(message.name)},45%,30%)`;
            avatar.textContent = initials(message.name);
            avatar.setAttribute('aria-hidden', 'true');
            const info = document.createElement('div');
            const author = document.createElement('strong');
            author.textContent = message.name;
            const time = document.createElement('time');
            time.dateTime = new Date(message.timestamp).toISOString();
            time.textContent = relativeTime(message.timestamp);
            info.append(author, time);
            head.append(avatar, info);
            const body = document.createElement('p');
            body.textContent = message.text;
            const actions = document.createElement('div');
            actions.className = 'note-actions';
            const like = document.createElement('button');
            like.type = 'button';
            like.textContent = `♥ ${message.likes}`;
            like.setAttribute('aria-pressed', String(message.liked));
            like.setAttribute('aria-label', `${message.liked ? 'Unlike' : 'Like'} note by ${message.name}, ${message.likes} likes`);
            like.onclick = async () => { like.disabled = true; const original = { ...message }; message.liked = !message.liked; message.likes += message.liked ? 1 : -1; like.textContent = `♥ ${message.likes}`; like.setAttribute('aria-pressed', String(message.liked)); try {
                Object.assign(message, await likeWallMessage(message.id));
                like.textContent = `♥ ${message.likes}`;
                like.setAttribute('aria-label', `${message.liked ? 'Unlike' : 'Like'} note by ${message.name}, ${message.likes} likes`);
            }
            catch {
                Object.assign(message, original);
                like.textContent = `♥ ${message.likes}`;
                like.setAttribute('aria-pressed', String(message.liked));
                toast('The like could not be saved. Please try again.');
            }
            finally {
                like.disabled = false;
            } };
            const report = document.createElement('button');
            report.className = 'report-btn';
            report.textContent = 'Report';
            report.setAttribute('aria-label', `Report note by ${message.name}`);
            report.onclick = async () => { report.disabled = true; try {
                await reportWallMessage(message.id);
                await controller.load(true);
                toast(apiConfig.mode === 'live' ? 'Reported and hidden for you.' : 'Hidden for you in this demo.');
            }
            catch {
                toast('Could not report this note. Please try again.');
                report.disabled = false;
            } };
            actions.append(like, report);
            note.append(head, body, actions);
            if (message.emoji) {
                const span = document.createElement('span');
                span.className = 'note-emoji';
                span.textContent = message.emoji;
                span.setAttribute('aria-hidden', 'true');
                note.append(span);
            }
            grid.append(note);
        });
        notes.append(grid);
        if (state.nextOffset < state.total) {
            const b = document.createElement('button');
            b.className = 'btn';
            b.textContent = state.busy ? 'Loading…' : 'Load more';
            b.disabled = state.busy;
            b.onclick = () => void controller.load(false);
            more.append(b);
        }
    }
    const controller = useWallMessages(draw);
    host.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => controller.sort(/** @type {'new'|'top'} */ ( /** @type {HTMLElement} */(button).dataset.sort))));
    form.addEventListener('submit', async (event) => { event.preventDefault(); if (posting)
        return; const payload = { name: name.value, text: text.value, emoji, website: website.value }; const errors = validateWall(payload); for (const [field, input, id] of /** @type {[string, HTMLInputElement | HTMLTextAreaElement, string][]} */ ([['name', name, 'wallNameError'], ['text', text, 'wallTextError']])) {
        input.setAttribute('aria-invalid', String(Boolean(errors[field])));
        const el = host.querySelector(`#${id}`);
        if (el)
            el.textContent = errors[field] || '';
    } error.textContent = ''; if (Object.keys(errors).length) {
        (errors.name ? name : text).focus();
        return;
    } posting = true; cooldown(); try {
        const message = await postWallMessage(payload);
        form.reset();
        emoji = '';
        picker.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        counter.textContent = '0 / 300';
        toast(message.status === 'pending' ? 'Awaiting approval. Only you can see this note.' : apiConfig.mode === 'live' ? 'Posted to the wall.' : 'Posted to your demo wall.');
        controller.state.sort = 'new';
        await controller.load(true);
    }
    catch (exception) {
        error.textContent = exception instanceof Error ? exception.message : 'Could not post. Your message is still here; please try again.';
    }
    finally {
        posting = false;
        cooldown();
    } });
    void controller.load(true);
}
