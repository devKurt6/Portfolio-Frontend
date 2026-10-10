// ============================================
// KURT'S AI CHAT — FastAPI + Ollama (Local Network)
// ============================================

const BACKEND_URL = 'http://10.248.1.159:8000'; // your test server IP
const SESSION_ID  = 'sess_' + Math.random().toString(36).slice(2, 10);

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

  // Render markdown for bot, plain text for user
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

// ── Typewriter (streaming) ─────────────────────────────
// ── Typewriter (runs even when chat is not visible) ────
async function typewriter(bubble, reader) {
  const decoder = new TextDecoder();
  const cursor  = document.createElement('span');
  cursor.className = 'chat-cursor';
  bubble.textContent = '';
  bubble.appendChild(cursor);

  let fullText = ''; // collect full response
  let buffer = '';
  let done = false;

  const readStream = async () => {
    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) { done = true; break; }
      buffer += decoder.decode(value, { stream: true });
      fullText += decoder.decode(value, { stream: true });
    }
  };

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
        // ✅ After typing is done, render full markdown
        bubble.innerHTML = marked.parse(fullText);
        scrollBottom();
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });

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
    const res = await fetch(`${BACKEND_URL}/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        session_id: SESSION_ID,
        username: 'Portfolio Visitor'
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    removeTyping();
    const bubble = addBubble('', 'bot');
    await typewriter(bubble, res.body.getReader());

  } catch (err) {
    removeTyping();
    addBubble(`⚠️ Cannot reach the AI server. Make sure FastAPI is running on the test server.`, 'bot');
  } finally {
    chatInput.disabled = false;
    chatSend.disabled  = false;
    chatInput.focus();
  }
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});