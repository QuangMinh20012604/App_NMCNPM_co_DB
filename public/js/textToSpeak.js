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

  // Lấy text tiếng Anh đã tách từ dictionary
  const text = engPart.textContent.trim();

  // Lấy cấu hình user đã lưu (voice + rate)
  const settings = JSON.parse(localStorage.getItem("aiSettings") || "{}");

  // Chuẩn bị đối tượng đọc văn bản
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = parseFloat(settings.rate || "1.0"); // tốc độ nói

  // Nếu user chọn voice cụ thể → áp dụng giọng đó
  if (settings.voice !== "") {
    const voices = speechSynthesis.getVoices();
    const chosen = voices.find((v) => v.name === settings.voice);
    if (chosen) utter.voice = chosen;
  }

  // TẮT MICRO KHI BOT BẮT ĐẦU NÓI
  if (recognition && isListening) {
    manualStop = true;   // báo là stop có chủ đích
    recognition.stop();  // tắt mic NGAY
  }

  // Bắt đầu đọc
  speechSynthesis.speak(utter);


  // Khi đọc xong, nếu Auto Mode bật → bật lại microphone
  utter.onend = () => {
    if (autoMode.checked && recognition) {
      // ⏳ Delay để tránh mic nghe noise sau khi AI nói
      setTimeout(() => {
        recognition.start();
      }, 800);
    }
  };

}
