// ============================================================================
// Text-to-Speech (Web Speech API)
// Đọc lại câu trả lời của AI và phối hợp an toàn với Speech-to-Text
// ============================================================================

// Nút "Listen Reply"
listenBtn.onclick = speakAI;

// ============================================================================
// speakAI()
// Đọc to nội dung tiếng Anh của tin nhắn AI cuối cùng
// ============================================================================
function speakAI() {

  // Lấy tin nhắn AI mới nhất
  const lastAI = [...document.querySelectorAll(".msg.ai")].pop();
  if (!lastAI) return;

  // Lấy phần tiếng Anh
  const engPart = lastAI.querySelector(".ai-english");
  if (!engPart) return;

  const text = engPart.textContent.trim();
  if (!text) return;

  // ==========================================================
  // TẮT MICRO TRƯỚC KHI AI NÓI (CHỐNG LOOP)
  // ==========================================================
  if (window.recognition && window.isListening) {
    window.manualStop = true;   // báo là stop có chủ đích
    recognition.stop();
  }

  // ==========================================================
  // LẤY SETTINGS GIỌNG ĐỌC
  // ==========================================================
  const settings = JSON.parse(localStorage.getItem("aiSettings") || "{}");

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = parseFloat(settings.rate || "1.0");

  // Chọn voice nếu có
  if (settings.voice) {
    const voices = speechSynthesis.getVoices();
    const chosen = voices.find(v => v.name === settings.voice);
    if (chosen) utter.voice = chosen;
  }

  // ==========================================================
  // KHI AI NÓI XONG
  // ==========================================================
  utter.onend = () => {

    // Reset trạng thái stop
    window.manualStop = false;

    // Chỉ bật lại mic khi Auto Mode bật
    if (
      autoMode &&
      autoMode.checked &&
      window.recognition
    ) {
      // Delay nhỏ để tránh Chrome bug
      setTimeout(() => {
        recognition.start();
      }, 300);
    }
  };

  // ==========================================================
  // BẮT ĐẦU ĐỌC
  // ==========================================================
  speechSynthesis.cancel(); // đảm bảo không chồng âm
  speechSynthesis.speak(utter);
}
