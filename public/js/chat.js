// chat.js
let conversationHistory = [];
let conversationId = localStorage.getItem("conversationId") || null;
const profile = JSON.parse(localStorage.getItem("profile") || "{}");
const displayName = profile.name || "You";

sendBtn.onclick = () => sendMessage();
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage(auto = false) {
  const msg = textInput.value.trim();
  if (!msg) return;

  appendMessage(displayName, msg, "user");

  conversationHistory.push({ role: "user", content: msg });

  textInput.value = "";
  setStatus("sending");

  try {
    const token = localStorage.getItem("token");

    const res = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? "Bearer " + token : ""
      },
      body: JSON.stringify({
        message: msg,
        history: conversationHistory,
        conversationId: conversationId  // gửi nếu có
      }),
    });


    const data = await res.json();

    //await saveToDB(msg, data.reply);


    setStatus("ready");
    
    appendAIMessage(data.reply);
    conversationHistory.push({ role: "bot", content: data.reply });
    
    if (auto) speakAI();

  } catch {
    appendMessage("Error", "❌ Server error.");
    setStatus("error");
  }
}

function appendMessage(sender, text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.innerHTML = `<strong>${sender}:</strong> ${escapeHtml(text)}`;
  messages.appendChild(div);
  smartScroll();
}

function appendAIMessage(text) {
  const div = document.createElement("div");
  div.className = "msg ai";

  const header = document.createElement("strong");
  header.textContent = "AI:";
  div.appendChild(header);

  const engSpan = document.createElement("span");
  engSpan.className = "ai-english";

  const html = text
    .split(/\s+/)
    .map(
      (word) =>
        `<span class="word" data-word="${escapeAttr(word)}">${escapeHtml(
          word
        )}</span>`
    )
    .join(" ");

  engSpan.innerHTML = html;
  div.appendChild(engSpan);

  const controls = document.createElement("div");
  controls.style.marginTop = "8px";
  controls.style.display = "flex";
  controls.style.gap = "8px";

  const transBtn = document.createElement("button");
  transBtn.className = "inline-trans-btn";
  transBtn.textContent = "🇻🇳 Translate";
  transBtn.onclick = () => translateMessage(div, text);
  controls.appendChild(transBtn);

  div.appendChild(controls);
  messages.appendChild(div);

  setTimeout(() => {
    div.querySelectorAll(".word").forEach((span) => {
      span.onclick = () => lookupWord(span.dataset.word, span);
    });
  }, 0);

  smartScroll();
}

// ===== RESET CHAT =====
function resetConversation() {
  const msgBox = document.getElementById("messages");
  if (msgBox) msgBox.innerHTML = "";

  // Xóa toàn bộ lịch sử cuộc hội thoại
  if (typeof conversationHistory !== "undefined") {
    conversationHistory.length = 0;
  }

  // Đặt trạng thái sẵn sàng
  try { setStatus("ready"); } catch (e) { }

  // Chỉ hiện thông báo OK
  alert("Đã reset cuộc hội thoại.");

}


async function saveToDB(userMsg, botMsg) {
  const token = localStorage.getItem("token");
  if (!token) return; // chưa login → không lưu

  const payload = {
    messages: [
      { role: "user", text: userMsg },
      { role: "bot", text: botMsg }
    ]
  };

  // Nếu chưa có conversation → tạo mới
  if (!conversationId) {
    payload.title = "New Conversation";

    const res = await fetch("/conversation/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      conversationId = data.conversationId;
      localStorage.setItem("conversationId", conversationId);
      console.log("🆕 Created conversation:", conversationId);
    }
    return;
  }

  // Nếu đã có → append message
  payload.conversationId = conversationId;

  const res = await fetch("/conversation/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.success) {
    console.log("💾 Saved message to:", conversationId);
  }
}
