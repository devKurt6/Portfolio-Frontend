export const hasLinks = /https?:|www\.|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/i;
const profanity = /\b(damn|crap|stupid|idiot|hate you|fuck|shit)\b/i;
/** @param {import('../types/index').WallPayload} payload */
export function validateWall(payload) {
    /** @type {Record<string,string>} */ const errors = {};
    if (payload.name.trim().length < 2 || payload.name.trim().length > 24)
        errors.name = 'Use a display name of 2–24 characters.';
    if (payload.text.trim().length < 3 || payload.text.length > 300)
        errors.text = 'Write a message of 3–300 characters.';
    if (profanity.test(payload.name + ' ' + payload.text))
        errors.text = 'Please keep it friendly and remove the flagged words.';
    if (!['', '👋', '🔥', '💡', '🙏', '💪', '🌱', '⭐', '🎉'].includes(payload.emoji))
        errors.emoji = 'Choose an emoji from the picker.';
    return errors;
}
/** @param {import('../types/index').ContactPayload} payload */
export function validateContact(payload) {
    /** @type {Record<string,string>} */ const errors = {};
    if (payload.name.trim().length < 2)
        errors.name = 'Enter your name (at least 2 characters).';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email.trim()))
        errors.email = 'Enter a valid email, like you@example.com.';
    if (payload.message.trim().length < 10)
        errors.message = 'Write at least 10 characters.';
    return errors;
}
