// ===== Speech To Text =====

// Kết nối đến các element trong HTML
const speakBtn = document.getElementById("speakBtn");
const textInput = document.getElementById("textInput");
const autoMode = document.getElementById("autoMode");

let recognition =
  window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;
let isListening = false;

if (recognition) {
  recognition.lang = "en-US";

  recognition.onstart = () => {
    isListening = true;
    speakBtn.classList.add("listening");
    setStatus("listening");
    document.getElementById("micIcon").className = "bi bi-mic-fill";
  };

  recognition.onend = () => {
    isListening = false;
    speakBtn.classList.remove("listening");
    setStatus("ready");
    document.getElementById("micIcon").className = "bi bi-mic-mute-fill";
  };

  recognition.onresult = (e) => {
    textInput.value = e.results[0][0].transcript;

    if (autoMode && autoMode.checked) {
      if (typeof sendMessage === "function") sendMessage(true);
    }
  };

  speakBtn.onclick = () => {
    if (!isListening) recognition.start();
    else recognition.stop();
  };
}
