let recognition =
  window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;

let isListening = false;
let silenceTimer = null;  // ⭐ TIMER để auto stop khi im lặng

if (recognition) {
  recognition.lang = "en-US";

  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    speakBtn.classList.add("listening");
    setStatus("listening");
    document.getElementById("micIcon").className = "bi bi-mic-fill";

    //  Khi bắt đầu nói → set timer im lặng
    resetSilenceTimer();
  };

  recognition.onend = () => {
    isListening = false;
    speakBtn.classList.remove("listening");
    setStatus("ready");
    document.getElementById("micIcon").className = "bi bi-mic-mute-fill";

    clearTimeout(silenceTimer);

    //  Nếu bật Auto Mode → tự bật lại sau khi end
    if (autoMode && autoMode.checked) {
      recognition.start();
    }
  };

  recognition.onresult = (e) => {
    textInput.value = e.results[0][0].transcript;

    //  Mỗi lần nghe được tiếng → reset lại timer im lặng
    resetSilenceTimer();

    if (autoMode && autoMode.checked) {
      if (typeof sendMessage === "function") sendMessage(true);
    }
  };


  // ⭐ TIMER IM LẶNG 2 GIÂY
  function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      console.log(" Auto stop after 2s silence");
      recognition.stop();
    }, 2000);
  }

  // ⭐ BUTTON START / STOP
  speakBtn.onclick = () => {
    if (!isListening) {
      recognition.start();
    } else {
      clearTimeout(silenceTimer);
      recognition.stop();
    }
  };
}
