// ============================================================================
// Speech-to-Text (Web Speech API)
// Fix: auto stop khi im lặng + không loop + không reset timer sai
// ============================================================================

let recognition =
  window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;

let isListening = false;
let silenceTimer = null;
let manualStop = false;

if (recognition) {

  recognition.lang = "en-US";
  recognition.interimResults = true;

  // ================= MIC START =================
  recognition.onstart = () => {
    isListening = true;
    speakBtn.classList.add("listening");
    setStatus("listening");
    micIcon.className = "bi bi-mic-fill";

    manualStop = false;
    startSilenceTimer();
  };

  // ================= MIC END =================
  recognition.onend = () => {
    isListening = false;

    speakBtn.classList.remove("listening");
    setStatus("ready");
    micIcon.className = "bi bi-mic-mute-fill";
    clearTimeout(silenceTimer);

    // Auto restart nếu cần
    if (
      !manualStop &&
      autoMode.checked &&
      !speechSynthesis.speaking
    ) {
      recognition.start();
    }
  };

  // ================= RESULT =================
  recognition.onresult = (e) => {
    const result = e.results[e.results.length - 1];

    // Chỉ xử lý khi là FINAL
    if (!result.isFinal) return;

    const transcript = result[0].transcript.trim();
    if (!transcript) return;

    textInput.value = transcript;

    // Reset timer vì user vừa nói xong
    startSilenceTimer();

    // Auto gửi (chỉ 1 lần)
    if (autoMode.checked && localStorage.getItem("token")) {
      sendMessage(true);
    }
  };

  // ================= SILENCE TIMER =================
  function startSilenceTimer() {
    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      manualStop = false; // do im lặng
      recognition.stop();
    }, 5000);
  }

  // ================= BUTTON =================
  speakBtn.onclick = () => {
    if (!isListening) {
      manualStop = false;
      recognition.start();
    } else {
      manualStop = true;
      clearTimeout(silenceTimer);
      recognition.stop();
    }
  };
}
