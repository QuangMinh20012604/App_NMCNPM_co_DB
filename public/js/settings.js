// ============================================================================
// loadVoices()
// Tải danh sách tất cả giọng đọc (speechSynthesis voices) và đổ vào dropdown.
// Đồng thời áp dụng lại cấu hình đã lưu trước đó (nếu có).
// ============================================================================
function loadVoices() {
  const voiceSel = document.getElementById("voiceSelect");
  const voices = speechSynthesis.getVoices();

  // Xoá danh sách cũ trước khi thêm mới
  voiceSel.innerHTML = "";

  // Render từng giọng đọc thành <option>
  voices.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSel.appendChild(opt);
  });

  // Áp dụng cấu hình đã lưu (voice)
  const saved = JSON.parse(localStorage.getItem("aiSettings") || "{}");
  if (saved.voice) voiceSel.value = saved.voice;
}

// ============================================================================
// Một số trình duyệt (Chrome, Firefox) chỉ cung cấp danh sách giọng đọc
// sau khi event onvoiceschanged được kích hoạt.
// ============================================================================
speechSynthesis.onvoiceschanged = loadVoices;


// ============================================================================
// TEST VOICE BUTTON
// Khi người dùng nhấn nút "Test voice", ứng dụng sẽ phát câu test bằng
// giọng đã được chọn trong dropdown voiceSelect.
// ============================================================================
document.getElementById("testVoiceBtn").onclick = () => {

  const voiceName = document.getElementById("voiceSelect").value;
  const text = "This is a voice test.";

  const utter = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();

  // Tìm đúng voice theo name
  const chosen = voices.find((v) => v.name === voiceName);
  if (chosen) utter.voice = chosen;

  // Phát giọng
  speechSynthesis.speak(utter);
};


// ============================================================================
// SAVE SETTINGS
// Lưu tốc độ nói (rate) và tên giọng (voice) vào localStorage.
// Sau khi lưu xong sẽ đóng popup Settings.
// ============================================================================
document.getElementById("settingsSave").onclick = () => {

  const rate = document.getElementById("speechRate").value;
  const voice = document.getElementById("voiceSelect").value;

  // Lưu object aiSettings → { rate, voice }
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


// ============================================================================
// LOAD SETTINGS WHEN OPEN POPUP
// Hàm này được gọi mỗi khi mở cửa sổ Settings.
// Mục đích: đưa giá trị rate đã lưu trước đó vào input.
// ============================================================================
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("aiSettings") || "{}");
  if (saved.rate) {
    document.getElementById("speechRate").value = saved.rate;
  }
}
