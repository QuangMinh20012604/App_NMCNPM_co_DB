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
  // Cấu hình Speech Recognition
  // ============================================================
  recognition.lang = "en-US";
  recognition.interimResults = true;

  // ============================================================
  // Khi microphone bắt đầu nhận giọng
  // ============================================================
  recognition.onstart = () => {
    isListening = true;

    speakBtn.classList.add("listening");
    setStatus("listening");
    document.getElementById("micIcon").className = "bi bi-mic-fill";

    manualStop = false;

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

    // Auto restart nếu:
    // - Không phải user stop
    // - Auto Mode bật
    // - AI không đang nói
    if (
      !manualStop &&
      autoMode &&
      autoMode.checked &&
      !speechSynthesis.speaking
    ) {
      recognition.start();
    }
  };

  // ============================================================
  // Khi có kết quả nhận dạng giọng nói
  // ============================================================
  recognition.onresult = (e) => {
    const result = e.results[e.results.length - 1];

    // CHỈ xử lý khi Chrome xác nhận user nói xong
    if (!result.isFinal) return;

    const transcript = result[0].transcript.trim();
    if (!transcript) return;

    // Hiển thị text
    textInput.value = transcript;

    // Reset timer vì user vừa nói xong
    startSilenceTimer();

    // Auto Mode → gửi (KHÔNG phụ thuộc login)
    if (autoMode && autoMode.checked) {
      if (typeof sendMessage === "function") {
        sendMessage(true);
      }
    }
  };

  // ============================================================
  // TIMER IM LẶNG
  // Nếu user không nói trong 3s → tự động stop
  // ============================================================
  function startSilenceTimer() {
    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      manualStop = false; // stop do im lặng
      recognition.stop();
    }, 3000);
  }

  // ============================================================
  // BUTTON START / STOP MICROPHONE
  // ============================================================
  speakBtn.onclick = () => {

    // Bật microphone
    if (!isListening) {
      manualStop = false;
      recognition.start();
    }

    // Tắt microphone thủ công
    else {
      manualStop = true;
      clearTimeout(silenceTimer);
      recognition.stop();
    }
  };
}
