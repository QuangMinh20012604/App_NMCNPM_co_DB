let recognition =
  window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;

let isListening = false;
let silenceTimer = null;
let manualStop = false;  // ⭐ Dùng để phân biệt stop thủ công

if (recognition) {
  recognition.lang = "en-US";
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    speakBtn.classList.add("listening");
    setStatus("listening");
    document.getElementById("micIcon").className = "bi bi-mic-fill";

    manualStop = false;  // Khi start thì reset lại
    resetSilenceTimer();
  };

  recognition.onend = () => {
    isListening = false;
    speakBtn.classList.remove("listening");
    setStatus("ready");
    document.getElementById("micIcon").className = "bi bi-mic-mute-fill";

    clearTimeout(silenceTimer);

    if (!manualStop && autoMode && autoMode.checked) {
      recognition.start();
    }
  };

  recognition.onresult = (e) => {
    textInput.value = e.results[0][0].transcript;

    resetSilenceTimer();

    if (autoMode && autoMode.checked) {
      if (typeof sendMessage === "function") sendMessage(true);
    }
  };

  // ⭐ TIMER IM LẶNG 
  function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      manualStop = false; // stop do im lặng → cho phép auto start lại
      recognition.stop();
    }, 5000); // ← timeout tùy chỉnh
  }

  // ⭐ BUTTON START / STOP
  speakBtn.onclick = () => {
    if (!isListening) {
      manualStop = false; // start bình thường
      recognition.start();
    } else {
      manualStop = true;  // user tự stop → KHÔNG auto start lại
      clearTimeout(silenceTimer);
      recognition.stop();
    }
  };
}
