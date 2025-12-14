// ============================================================================
// Speech-to-Text (Web Speech API)
// Quản lý microphone: start / stop / auto mode / tránh loop STT <-> TTS
// ============================================================================

// Khởi tạo SpeechRecognition (Chrome-based)
let recognition =
  window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;

// Trạng thái microphone
let isListening = false;

// Timer phát hiện im lặng
let silenceTimer = null;

// manualStop = true khi user hoặc hệ thống CHỦ ĐỘNG stop mic
// Dùng để phân biệt với stop do timeout
let manualStop = false;

if (recognition) {

  // ==========================================================================
  // CẤU HÌNH SPEECH RECOGNITION
  // ==========================================================================
  recognition.lang = "en-US";
  recognition.interimResults = true;

  // ==========================================================================
  // MIC START
  // ==========================================================================
  recognition.onstart = () => {
    isListening = true;

    speakBtn.classList.add("listening");
    setStatus("listening");

    document.getElementById("micIcon").className = "bi bi-mic-fill";

    manualStop = false;
    resetSilenceTimer();
  };

  // ==========================================================================
  // MIC STOP
  // ==========================================================================
  recognition.onend = () => {
    isListening = false;

    speakBtn.classList.remove("listening");
    setStatus("ready");
    document.getElementById("micIcon").className = "bi bi-mic-mute-fill";

    clearTimeout(silenceTimer);

    // ❗ CHỈ auto restart khi:
    // - Không phải stop thủ công
    // - Auto Mode bật
    // - AI KHÔNG đang nói (tránh loop)
    if (
      !manualStop &&
      autoMode &&
      autoMode.checked &&
      !speechSynthesis.speaking
    ) {
      recognition.start();
    }
  };

  // ==========================================================================
  // KẾT QUẢ NHẬN GIỌNG NÓI
  // ==========================================================================
  recognition.onresult = (e) => {
    const transcript =
      e.results[e.results.length - 1][0].transcript;

    // Hiển thị text nhận được
    textInput.value = transcript;

    resetSilenceTimer();

    // ❗ CHỈ auto gửi khi:
    // - Auto Mode bật
    // - User ĐÃ đăng nhập (có token)
    if (
      autoMode &&
      autoMode.checked &&
      localStorage.getItem("token")
    ) {
      if (typeof sendMessage === "function") {
        sendMessage(true);
      }
    }
  };

  // ==========================================================================
  // TIMER IM LẶNG
  // ==========================================================================
  function resetSilenceTimer() {
    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      // Stop do im lặng → cho phép auto restart
      manualStop = false;
      recognition.stop();
    }, 3000); // 3s im lặng
  }

  // ==========================================================================
  // NÚT SPEAK (START / STOP)
  // ==========================================================================
  speakBtn.onclick = () => {

    // BẬT MIC
    if (!isListening) {
      manualStop = false;
      recognition.start();
    }

    // TẮT MIC (user chủ động)
    else {
      manualStop = true;
      clearTimeout(silenceTimer);
      recognition.stop();
    }
  };
}
