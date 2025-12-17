// =======================================================
// Chat module – quản lý gửi/nhận tin nhắn và hiển thị UI
// =======================================================

// Lịch sử cuộc hội thoại lưu ở client
let conversationHistory = [];

// Lưu conversationId (nếu đã tạo từ backend)
let conversationId = localStorage.getItem("conversationId") || null;

// Thông tin người dùng hiện tại (dùng để hiển thị tên)
const profile = JSON.parse(localStorage.getItem("profile") || "{}");
const displayName = profile.name || "You";

// Gửi tin nhắn khi bấm nút Send
sendBtn.onclick = () => sendMessage();

// Gửi tin nhắn khi nhấn Enter (ngoại trừ Shift+Enter)
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// =======================================================
// Gửi tin nhắn lên server + cập nhật UI
// auto = true được dùng khi chế độ tự đọc
// =======================================================
async function sendMessage(auto = false) {
  const msg = textInput.value.trim();
  if (!msg) return;

  // Hiện tin người dùng
  appendMessage(displayName, msg, "user");

  // Lưu vào lịch sử hội thoại local
  conversationHistory.push({ role: "user", content: msg });

  textInput.value = "";
  setStatus("sending");

  try {
    const token = localStorage.getItem("token");

    // Gửi yêu cầu chat lên backend
    const res = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? "Bearer " + token : ""
      },
      body: JSON.stringify({
        message: msg,
        history: conversationHistory,
        conversationId: conversationId
      }),
    });

    const data = await res.json();

    setStatus("ready");

    // Hiển thị tin nhắn AI
    appendAIMessage(data.reply);

    // Lưu vào lịch sử hội thoại local
    conversationHistory.push({ role: "bot", content: data.reply });

    // Tự đọc tin nhắn (nếu bật Auto Speak)
    if (auto) speakAI();

  } catch {
    appendMessage("Error", "❌ Server error.");
    setStatus("error");
  }
}

// =======================================================
// Thêm tin nhắn người dùng vào màn hình chat
// =======================================================
function appendMessage(sender, text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.innerHTML = `<strong>${sender}:</strong> ${escapeHtml(text)}`;
  messages.appendChild(div);
  smartScroll();
}

// =======================================================
// Thêm tin nhắn AI + highlight từ + tạo nút dịch
// =======================================================
function appendAIMessage(text) {
  const div = document.createElement("div");
  div.className = "msg ai";

  // Nhãn "AI:"
  const header = document.createElement("strong");
  header.textContent = "AI:";
  div.appendChild(header);

  // Vùng chứa tiếng Anh, mỗi từ là <span class="word">
  const engSpan = document.createElement("span");
  engSpan.className = "ai-english";

  // Split từng từ để tạo các span từ điển
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

  // Thanh công cụ bên dưới (nút dịch)
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

  // Gán sự kiện click từ điển cho từng từ
  setTimeout(() => {
    div.querySelectorAll(".word").forEach((span) => {
      span.onclick = () => lookupWord(span.dataset.word, span);
    });
  }, 0);

  smartScroll();
}

// =======================================================
// Reset toàn bộ cuộc hội thoại trên giao diện
// =======================================================
function resetConversation() {
  const msgBox = document.getElementById("messages");
  if (msgBox) msgBox.innerHTML = "";

  if (typeof conversationHistory !== "undefined") {
    conversationHistory.length = 0;
  }

  try { setStatus("ready"); } catch (e) { }

  alert("Đã reset cuộc hội thoại.");
}

// =======================================================
// Lưu tin nhắn vào database qua /conversation/save
// =======================================================
async function saveToDB(userMsg, botMsg) {
  const token = localStorage.getItem("token");
  if (!token) return;

  const payload = {
    messages: [
      { role: "user", text: userMsg },
      { role: "bot", text: botMsg }
    ]
  };

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


// =======================================================
// translateMessage()
// Được gọi từ chat.js khi bấm 🇻🇳 Translate
// =======================================================
window.translateMessage = async function (msgDiv, originalText) {
  try {
    if (msgDiv.querySelector(".ai-vn")) return;

    const res = await fetch("/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: originalText })
    });

    const data = await res.json();

    const translated =
      data.translation ||
      data.text ||
      data.result ||
      data.output;

    if (!translated) return;

    const vnDiv = document.createElement("div");
    vnDiv.className = "ai-vn";
    vnDiv.style.marginTop = "6px";
    vnDiv.style.fontStyle = "italic";
    vnDiv.style.opacity = "0.9";
    vnDiv.textContent = translated;

    msgDiv.appendChild(vnDiv);

  } catch (err) {
    console.error("Translate error:", err);
  }
};

