// ============================================================================
// listenBtn.onclick → Khi người dùng nhấn nút "Listen"
// Hành động: gọi hàm speakAI() để đọc tin nhắn AI cuối cùng.
// ============================================================================
listenBtn.onclick = speakAI;

// ============================================================================
// speakAI()
// Đọc to nội dung tiếng Anh của tin nhắn AI cuối cùng trong khung chat.
//
// Quy trình:
// 1. Lấy tin nhắn AI cuối cùng (.msg.ai)
// 2. Trích phần tiếng Anh (.ai-english)
// 3. Lấy cấu hình giọng đọc từ localStorage (aiSettings)
// 4. Tạo SpeechSynthesisUtterance và phát âm
// 5. Sau khi đọc xong → nếu Auto Mode đang bật, tự khởi động microphone
// ============================================================================
function speakAI() {

  // Lấy tin nhắn AI gần nhất
  const lastAI = [...document.querySelectorAll(".msg.ai")].pop();
  if (!lastAI) return;

  // Lấy phần nội dung tiếng Anh trong tin AI
  const engPart = lastAI.querySelector(".ai-english");
  if (!engPart) return;

  const text = engPart.textContent.trim();
  if (!text) return;

  // Lấy cấu hình user đã lưu (voice + rate)
  const settings = JSON.parse(localStorage.getItem("aiSettings") || "{}");

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = parseFloat(settings.rate || "1.0");

  if (settings.voice) {
    const voices = speechSynthesis.getVoices();
    const chosen = voices.find(v => v.name === settings.voice);
    if (chosen) utter.voice = chosen;
  }

  // ===============================
  // TẮT MICRO TRƯỚC KHI AI ĐỌC
  // ===============================
  if (recognition && isListening) {
    manualStop = true;     // stop có chủ đích
    recognition.stop();   // tắt mic ngay
  }

  // AI bắt đầu đọc
  speechSynthesis.speak(utter);

  // ===============================
  // SAU KHI AI ĐỌC XONG → BẬT MIC
  // ===============================
  utter.onend = () => {
    if (autoMode && autoMode.checked && recognition) {

      manualStop = false;   // cho phép auto restart

      // Delay nhẹ tránh noise
      setTimeout(() => {
        recognition.start();
      }, 800);
    }
  };
}

