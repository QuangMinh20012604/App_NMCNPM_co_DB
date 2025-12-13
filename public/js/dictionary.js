// ============================================================================
// lookupWord(word, element)
// Phiên bản FIX CUỐI:
//  - KHÔNG đụng backend
//  - Nghĩa theo NGỮ CẢNH (dùng câu gốc)
//  - Chỉ 1 nghĩa chính (học giao tiếp)
//  - Không còn list nghĩa dài
// ============================================================================

async function lookupWord(word, element) {

  const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return;

  // Xóa popup cũ
  document.querySelectorAll(".dict-popup").forEach(el => el.remove());

  // -------------------------------------------------------------
  // 1️ LẤY CÂU GỐC (NGỮ CẢNH)
  // -------------------------------------------------------------
  let sentence = clean;
  try {
    const msg = element.closest(".msg.ai") || element.closest(".msg");
    if (msg) sentence = msg.innerText.trim();
  } catch {}

  // -------------------------------------------------------------
  // 2️ LẤY PHIÊN ÂM + AUDIO (TỪ DICTIONARY API)
  // -------------------------------------------------------------
  let phonetic = "";
  let audio = "";

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      const entry = data[0];
      phonetic = entry.phonetics?.find(p => p.text)?.text || "";
      audio = entry.phonetics?.find(p => p.audio)?.audio || "";
    }
  } catch {}

  // -------------------------------------------------------------
  // 3️ GỌI /define (KHỚP BACKEND HIỆN TẠI)
  // -------------------------------------------------------------
  let englishMeaning = "";
  let vietnameseMeaning = "";

  try {
    // ⚠️ Backend CHỈ nhận word + meaning
    const explainRes = await fetch("/define", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: clean,
        meaning: sentence   // ⭐ dùng CÂU GỐC làm ngữ cảnh
      })
    });

    const explainData = await explainRes.json();
    englishMeaning = explainData.explanation || "";

  } catch {
    englishMeaning = "";
  }

  // -------------------------------------------------------------
  // 4️ DỊCH SANG TIẾNG VIỆT
  // -------------------------------------------------------------
  try {
    if (englishMeaning) {
      const translateRes = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: englishMeaning })
      });

      const translateData = await translateRes.json();
      vietnameseMeaning = translateData.reply || "";
    }
  } catch {
    vietnameseMeaning = "";
  }

  // -------------------------------------------------------------
  // 5️ HTML POPUP
  // -------------------------------------------------------------
  const html = `
    <div style="font-size:16px;">
      <b>${clean}</b>
      ${phonetic ? `<span style="color:#666; margin-left:6px">${phonetic}</span>` : ""}
    </div>

    <div style="margin-top:8px;">
      <b>English:</b><br>
      ${englishMeaning || "Meaning not available."}
    </div>

    <div style="margin-top:8px;">
      <b>Vietnamese:</b><br>
      ${vietnameseMeaning || ""}
    </div>
  `;

  // -------------------------------------------------------------
  // 6️ HIỂN THỊ POPUP
  // -------------------------------------------------------------
  showPopup(element, clean, html, audio);
}
