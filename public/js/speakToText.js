// stt.js
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
    if (autoMode.checked) sendMessage(true);
  };

  speakBtn.onclick = () => {
    if (!isListening) recognition.start();
    else recognition.stop();
  };
}
