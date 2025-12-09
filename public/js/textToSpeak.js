// tts.js
listenBtn.onclick = speakAI;

function speakAI() {
  const lastAI = [...document.querySelectorAll(".msg.ai")].pop();
  if (!lastAI) return;

  const engPart = lastAI.querySelector(".ai-english");
  if (!engPart) return;

  const text = engPart.textContent.trim();

  const settings = JSON.parse(localStorage.getItem("aiSettings") || "{}");

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = parseFloat(settings.rate || "1.0");

  if (settings.voice !== "") {
    const voices = speechSynthesis.getVoices();
    const chosen = voices.find((v) => v.name === settings.voice);
    if (chosen) utter.voice = chosen;
  }

  speechSynthesis.speak(utter);

  utter.onend = () => {
    if (autoMode.checked && recognition) recognition.start();
  };
}
