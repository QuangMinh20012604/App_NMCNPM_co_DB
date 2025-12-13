// ============================================================================
// lookupWord(word, element)
// Phiên bản NÂNG CẤP:
//  - Lấy câu gốc nơi từ xuất hiện (context-aware)
//  - Dùng AI giải thích nghĩa theo NGỮ CẢNH
//  - Chỉ hiển thị 1 nghĩa chính (học giao tiếp)
//  - English đơn giản (A2–B1) + Vietnamese
// ============================================================================

async function lookupWord(word, element) {

  const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return;

  // Xóa popup cũ
  document.querySelectorAll(".dict-popup").forEach(el => el.remove());

  // -------------------------------------------------------------
  // 1️) LẤY CÂU GỐC (NGỮ CẢNH)
  // -------------------------------------------------------------
  let sentence = "";
  try {
    const msg = element.closest(".msg.ai") || element.closest(".msg");
    sentence = msg ? msg.innerText.trim() : clean;
  } catch {
    sentence = clean;
  }

  // -------------------------------------------------------------
  // 2️) LẤY PHIÊN ÂM + AUDIO (TỪ DICTIONARY API)
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
  } catch {
    // bỏ qua nếu lỗi
  }

  // -------------------------------------------------------------
  // 3️) GỌI AI → GIẢI NGHĨA THEO NGỮ CẢNH
  // -------------------------------------------------------------
  let englishMeaning = "";
  let vietnameseMeaning = "";

  try {
    // 🔹 Giải nghĩa EN theo ngữ cảnh
    const explainRes = await fetch("/define", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `
          Explain the meaning of the English word "${clean}"
          as it is used in this sentence:

          "${sentence}"

          Use very simple English (A2–B1 level).
          Give ONLY ONE short meaning.
          Do NOT list multiple meanings.
          `
      })
    });

    const explainData = await explainRes.json();
    englishMeaning = explainData.explanation || "";

  } catch {
    englishMeaning = "";
  }

  try {
    // 🔹 Dịch sang tiếng Việt
    const translateRes = await fetch("/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: englishMeaning })
    });

    const translateData = await translateRes.json();
    vietnameseMeaning = translateData.reply || "";

  } catch {
    vietnameseMeaning = "";
  }

  // -------------------------------------------------------------
  // 4️) HTML POPUP (NGẮN – ĐÚNG – DỄ HỌC)
  // -------------------------------------------------------------
  const html = `
    <div style="font-size:16px;">
      <b>${clean}</b> ${phonetic ? `<span style="color:#666">${phonetic}</span>` : ""}
    </div>

    <div style="margin-top:6px;">
      <b>English:</b><br>
      ${englishMeaning || "Meaning not available."}
    </div>

    <div style="margin-top:6px;">
      <b>Vietnamese:</b><br>
      ${vietnameseMeaning || ""}
    </div>
  `;

  // -------------------------------------------------------------
  // 5️) HIỂN THỊ POPUP
  // -------------------------------------------------------------
  showPopup(element, clean, html, audio);
}
