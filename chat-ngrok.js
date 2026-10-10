// ============================================
// KURT'S AI CHAT — FastAPI + Ollama via ngrok
// ============================================

const SESSION_ID = 'sess_' + Math.random().toString(36).slice(2, 10);

const chatFab   = document.getElementById('chatToggle');
const chatWin   = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatMsgs  = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend  = document.getElementById('chatSendBtn');

// ── Open / Close ──────────────────────────────────────
chatFab.addEventListener('click', () => {
  const isOpen = chatWin.classList.toggle('chat-open');
  chatFab.classList.toggle('chat-fab-open', isOpen);
  if (isOpen) chatInput.focus();
});
chatClose.addEventListener('click', () => {
  chatWin.classList.remove('chat-open');
  chatFab.classList.remove('chat-fab-open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    chatWin.classList.remove('chat-open');
    chatFab.classList.remove('chat-fab-open');
  }
});

// ── Helpers ───────────────────────────────────────────
function scrollBottom() {
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function addBubble(text, role) {
  const row = document.createElement('div');
  row.className = `chat-msg-row chat-${role}`;

  if (role === 'bot') {
    const av = document.createElement('div');
    av.className = 'chat-msg-avatar';
    av.innerHTML = '<i class="fa-solid fa-robot"></i>';
    row.appendChild(av);
  }

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble-${role}`;

  // ✅ Render markdown for bot, plain text for user
  if (role === 'bot' && text) {
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }

  row.appendChild(bubble);
  chatMsgs.appendChild(row);
  scrollBottom();
  return bubble;
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'chat-msg-row chat-bot';
  row.id = 'chat-typing';

  const av = document.createElement('div');
  av.className = 'chat-msg-avatar';
  av.innerHTML = '<i class="fa-solid fa-robot"></i>';

  const tb = document.createElement('div');
  tb.className = 'chat-typing-bubble';
  tb.innerHTML = `
    <span class="chat-dot"></span>
    <span class="chat-dot"></span>
    <span class="chat-dot"></span>
  `;

  row.appendChild(av);
  row.appendChild(tb);
  chatMsgs.appendChild(row);
  scrollBottom();
}

function removeTyping() {
  document.getElementById('chat-typing')?.remove();
}

// ── Typewriter (runs even when chat is not visible) ────
async function typewriter(bubble, reader) {
  const decoder = new TextDecoder();
  const cursor  = document.createElement('span');
  cursor.className = 'chat-cursor';
  bubble.textContent = '';
  bubble.appendChild(cursor);

  let buffer   = '';
  let fullText = ''; // ✅ collect full response for markdown
  let done     = false;

  // Read stream into buffer continuously
  const readStream = async () => {
    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) { done = true; break; }
      const chunk = decoder.decode(value, { stream: true });
      buffer   += chunk;
      fullText += chunk; // ✅ accumulate full text
    }
  };

  // Type characters from buffer using real clock time
  const typeFromBuffer = () => new Promise(resolve => {
    const CHAR_DELAY = 12;
    let lastTime = null;
    let charDebt = 0;

    const tick = (timestamp) => {
      if (lastTime !== null) {
        charDebt += (timestamp - lastTime) / CHAR_DELAY;
      }
      lastTime = timestamp;

      const charsToType = Math.floor(charDebt);
      charDebt -= charsToType;

      for (let i = 0; i < charsToType; i++) {
        if (buffer.length > 0) {
          const node = document.createTextNode(buffer[0]);
          buffer = buffer.slice(1);
          bubble.insertBefore(node, cursor);
          scrollBottom();
        }
      }

      if (!done || buffer.length > 0) {
        requestAnimationFrame(tick);
      } else {
        cursor.remove();
        // ✅ Replace raw text with rendered markdown when done
        bubble.innerHTML = marked.parse(fullText);
        scrollBottom();
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });

  // Run both in parallel
  await Promise.all([readStream(), typeFromBuffer()]);
}

// ── Send ──────────────────────────────────────────────
async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question) return;

  chatInput.value    = '';
  chatInput.disabled = true;
  chatSend.disabled  = true;

  addBubble(question, 'user');
  showTyping();

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        session_id: SESSION_ID,
        username: 'Portfolio Visitor'
      })
    });

    // ✅ Add this to see the real error
    const reply = await res.text();
    console.log('Response status:', res.status);
    console.log('Response body:', reply);

    if (!res.ok) throw new Error(reply);

    removeTyping();
    const bubble = addBubble('', 'bot');
    await typewriter(bubble, reply);

} catch (err) {
    removeTyping();
    console.error('Chat error:', err);
    addBubble(`⚠️ Error: ${err.message}`, 'bot');
}
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});