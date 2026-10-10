import { sendContact } from '../services/api.mjs';
import { validateContact } from '../lib/validation.mjs';
import { toast } from '../components/ui/toast.mjs';
export function mount() {
    const form = /** @type {HTMLFormElement | null} */ (document.getElementById('contactForm'));
    if (!form)
        return;
    form.noValidate = true;
    for (const name of ['name', 'email', 'message']) {
        const field = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (form.elements.namedItem(name));
        field.setAttribute('aria-describedby', `${name}-error`);
        if (name === 'name' || name === 'email')
            field.autocomplete = name;
    }
    form.addEventListener('submit', async (event) => { event.preventDefault(); const values = new FormData(form); const payload = { name: String(values.get('name') || '').trim(), email: String(values.get('email') || '').trim(), message: String(values.get('message') || '').trim(), 'form-name': 'contact-main', 'bot-field': String(values.get('bot-field') || '') }; const errors = validateContact(payload); for (const name of ['name', 'email', 'message']) {
        const field = /** @type {HTMLElement} */ (form.elements.namedItem(name));
        field.setAttribute('aria-invalid', String(Boolean(errors[name])));
        const error = document.getElementById(`${name}-error`);
        if (error)
            error.textContent = errors[name] || '';
    } if (Object.keys(errors).length) { /** @type {HTMLElement | null} */
        (form.querySelector('[aria-invalid=true]'))?.focus();
        return;
    } const button = /** @type {HTMLButtonElement} */ (form.querySelector('button[type=submit]')); const original = button.textContent; button.disabled = true; button.textContent = 'Sending…'; let errorPanel = form.querySelector('[role=alert]'); if (errorPanel)
        errorPanel.remove(); try {
        await sendContact(payload);
        form.hidden = true;
        const panel = document.createElement('div');
        panel.className = 'success-panel';
        panel.tabIndex = -1;
        const heading = document.createElement('h2');
        heading.textContent = 'Message sent';
        const message = document.createElement('p');
        message.textContent = `Thank you for reaching out, ${payload.name}! I've received your message and will get back to you as soon as possible, usually within 24–48 hours.`;
        const again = document.createElement('button');
        again.className = 'btn';
        again.textContent = 'Send another';
        again.onclick = () => { panel.remove(); form.reset(); form.hidden = false; /** @type {HTMLElement} */ /** @type {HTMLElement} */ (form.elements.namedItem('name')).focus(); };
        panel.append(heading, message, again);
        form.after(panel);
        panel.focus();
        toast('Message sent successfully.');
    }
    catch (error) {
        errorPanel = document.createElement('p');
        errorPanel.className = 'field-error';
        errorPanel.setAttribute('role', 'alert');
        errorPanel.textContent = error instanceof Error ? error.message : 'Unable to send your message. Please try again.';
        form.append(errorPanel);
    }
    finally {
        button.disabled = false;
        button.textContent = original;
    } });
}
