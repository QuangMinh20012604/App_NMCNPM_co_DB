listenBtn.onclick = speakAI;

function speakAI() {
  const lastAI = [...document.querySelectorAll(".msg.ai")].pop();
  if (!lastAI) return;

  const engPart = lastAI.querySelector(".ai-english");
  if (!engPart) return;

  const text = engPart.textContent.trim();
  if (!text) return;

  // ❗ Tắt mic khi AI nói
  if (recognition && isListening) {
    manualStop = true;
    recognition.stop();
  }

  const settings = JSON.parse(localStorage.getItem("aiSettings") || {});
  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = "en-US";
  utter.rate = parseFloat(settings.rate || "1.0");

  if (settings.voice) {
    const voices = speechSynthesis.getVoices();
    const v = voices.find(v => v.name === settings.voice);
    if (v) utter.voice = v;
  }

  utter.onend = () => {
    manualStop = false;

    if (autoMode.checked && recognition) {
      setTimeout(() => recognition.start(), 300);
    }
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}
