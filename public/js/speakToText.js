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

  // Cho nghe liên tục, không tắt sớm
  recognition.continuous = true;
  recognition.interimResults = true;

  // Tăng timeout khi im lặng (Chrome có thể bỏ qua nhưng không lỗi)
  recognition.speechTimeout = 8000;
  recognition.noSpeechTimeout = 8000;


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

    // ⭐ Tự động nghe lại nếu bật Auto Mode
    if (autoMode && autoMode.checked) {
      recognition.start();
    }
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
