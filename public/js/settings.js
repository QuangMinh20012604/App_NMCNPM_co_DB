// settings.js

// Load voice list
function loadVoices() {
  const voiceSel = document.getElementById("voiceSelect");
  const voices = speechSynthesis.getVoices();

  voiceSel.innerHTML = "";
  voices.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSel.appendChild(opt);
  });

  // apply saved settings
  const saved = JSON.parse(localStorage.getItem("aiSettings") || "{}");
  if (saved.voice) voiceSel.value = saved.voice;
}

// Required on some browsers
speechSynthesis.onvoiceschanged = loadVoices;

// Test selected voice
document.getElementById("testVoiceBtn").onclick = () => {
  const voiceName = document.getElementById("voiceSelect").value;
  const text = "This is a voice test.";

  const utter = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const chosen = voices.find((v) => v.name === voiceName);
  if (chosen) utter.voice = chosen;

  speechSynthesis.speak(utter);
};

// Save settings
document.getElementById("settingsSave").onclick = () => {
  const rate = document.getElementById("speechRate").value;
  const voice = document.getElementById("voiceSelect").value;

  localStorage.setItem(
    "aiSettings",
    JSON.stringify({
      rate,
      voice,
    })
  );

  alert("Settings saved!");
  document.getElementById("settingsModal").style.display = "none";
};

// Load settings on startup
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("aiSettings") || "{}");
  if (saved.rate) document.getElementById("speechRate").value = saved.rate;
}
