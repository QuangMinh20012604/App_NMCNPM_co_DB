// ============================================================================
// Speech-to-Text (Web Speech API)
// Module điều khiển microphone: start/stop, auto mode, timeout im lặng.
// ============================================================================

// recognition: đối tượng Web Speech API (chỉ có trên Chrome-based)
let recognition =
  window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;

// Trạng thái microphone hiện tại
let isListening = false;

// Bộ đếm thời gian im lặng (timeout)
let silenceTimer = null;

// manualStop = true nếu người dùng tự bấm stop
// Dùng để phân biệt với stop do timeout im lặng
let manualStop = false;

if (recognition) {

  // ============================================================
  // Cấu hình cơ bản cho Speech Recognition
  // ============================================================
  recognition.lang = "en-US";          // Ngôn ngữ nhận dạng
  recognition.interimResults = true;   // Lấy kết quả tạm thời

  // ============================================================
  // Khi microphone bắt đầu nhận giọng
  // ============================================================
  recognition.onstart = () => {
    isListening = true;

    // Đổi màu nút → báo trạng thái đang nghe
    speakBtn.classList.add("listening");

    // Cập nhật trạng thái UI
    setStatus("listening");

    // Đổi icon microphone
    document.getElementById("micIcon").className = "bi bi-mic-fill";

    // Reset trạng thái stop thủ công
    manualStop = false;

    // Khởi động lại timer im lặng
    resetSilenceTimer();
  };

  // ============================================================
  // Khi microphone dừng
  // ============================================================
  recognition.onend = () => {
    isListening = false;

    speakBtn.classList.remove("listening");
    setStatus("ready");
    document.getElementById("micIcon").className = "bi bi-mic-mute-fill";

    clearTimeout(silenceTimer);

    // Nếu KHÔNG phải user tự stop → cho phép auto restart
    if (!manualStop && autoMode && autoMode.checked) {
      recognition.start();
    }
  };

  // ============================================================
  // Khi có kết quả nhận dạng giọng nói
  // ============================================================
  recognition.onresult = (e) => {
    // Lấy transcript đã nhận dạng
    textInput.value = e.results[0][0].transcript;

    // Reset timer vì người dùng tiếp tục nói
    resetSilenceTimer();

    // Nếu bật Auto mode → gửi tin nhắn ngay
    if (autoMode && autoMode.checked) {
      if (typeof sendMessage === "function") sendMessage(true);
    }
  };

  // ============================================================
  // TIMER IM LẶNG
  // Nếu người dùng dừng nói trên 5 giây → tự động stop
  // ============================================================
  function resetSilenceTimer() {
    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      manualStop = false; // Stop do im lặng → được phép auto khởi động lại
      recognition.stop();
    }, 5000); // Điều chỉnh timeout tại đây
  }

  // ============================================================
  // BUTTON START / STOP MICROPHONE
  // ============================================================
  speakBtn.onclick = () => {

    // Nếu đang tắt → bật microphone
    if (!isListening) {
      manualStop = false; // Người dùng muốn bật → reset stop thủ công
      recognition.start();
    }

    // Nếu đang bật → tắt microphone thủ công
    else {
      manualStop = true;  // User tự stop → không auto restart
      clearTimeout(silenceTimer);
      recognition.stop();
    }
  };
}
