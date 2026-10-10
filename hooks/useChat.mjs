import { sendChat } from '../services/api.mjs';
export function useChat() {
    const session = 'sess_' + Math.random().toString(36).slice(2, 10);
    /** @type {import('../types/index').ChatMessage[]} */
    const history = [];
    let busy = false;
    return {
        get busy() { return busy; },
        /** @param {string} question */
        async ask(question) { if (busy)
            throw Error('Please wait for the current response.'); busy = true; history.push({ role: 'user', content: question }); try {
            const reply = await sendChat({ question, session_id: session, username: 'Portfolio Visitor', history: history.map(m => ({ ...m })) });
            history.push({ role: 'assistant', content: reply });
            if (history.length > 20)
                history.splice(0, 2);
            return reply;
        }
        catch (error) {
            history.pop();
            throw error;
        }
        finally {
            busy = false;
        } }
    };
}
