// ============================================================================
// lookupWord(word, element)
// Bản nâng cấp:
//  - Lấy nhiều nghĩa từ dictionaryapi.dev thay vì chỉ nghĩa đầu tiên
//  - Ưu tiên nghĩa theo part of speech (nếu có)
//  - Giải nghĩa EN → đơn giản hóa bằng AI (/define)
//  - Dịch sang VN bằng AI (/translate) để tránh dịch sai nghĩa
//  - Hiển thị rõ ràng: nghĩa EN, nghĩa VN, part of speech, ví dụ, phiên âm
// ============================================================================

async function lookupWord(word, element) {

  const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return;

  document.querySelectorAll(".dict-popup").forEach((el) => el.remove());

  try {
    // -------------------------------------------------------------
    // 1) GỌI DICTIONARYAPI.DEV → lấy danh sách nghĩa chuẩn hơn
    // -------------------------------------------------------------
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
    const data = await res.json();

    let meanings = [];
    let phonetic = "";
    let audio = "";

    if (Array.isArray(data)) {
      const entry = data[0];

      // Lấy tất cả nghĩa thay vì nghĩa đầu tiên
      meanings = entry.meanings?.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions?.map(def => ({
          definition: def.definition,
          example: def.example || ""
        })) || []
      })) || [];

      phonetic = entry.phonetics?.find(p => p.text)?.text || "";
      audio = entry.phonetics?.find(p => p.audio)?.audio || "";
    }

    // Chọn nghĩa chính rõ ràng nhất
    const firstMeaning = meanings?.[0]?.definitions?.[0]?.definition || "No definition.";

    // -------------------------------------------------------------
    // 2) GỌI BACKEND /define → giải thích nghĩa tiếng Anh đơn giản
    // -------------------------------------------------------------
    let explainedEN = firstMeaning;
    try {
      const r = await fetch("/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: clean,
          meaning: firstMeaning,
          list: meanings
        })
      });

      const result = await r.json();
      explainedEN = result.explanation || firstMeaning;
    } catch {
      explainedEN = firstMeaning;
    }

    // -------------------------------------------------------------
    // 3) GỌI BACKEND /translate → dịch nghĩa đơn giản sang tiếng Việt
    // -------------------------------------------------------------
    let vietnamese = "";
    try {
      const t = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: explainedEN })
      });

      vietnamese = (await t.json()).reply || "";
    } catch {
      vietnamese = "";
    }

    // -------------------------------------------------------------
    // 4) TẠO HTML POPUP CHUẨN
    // -------------------------------------------------------------
    let html = `
      <div style="font-size:16px;"><b>${clean}</b> ${phonetic}</div>
      <div><b>English meaning:</b> ${explainedEN}</div>
      <div><b>Vietnamese:</b> ${vietnamese}</div>
      <hr>
    `;

    // Hiển thị thêm tất cả nghĩa (nếu muốn)
    meanings.forEach(m => {
      html += `<div><b>${m.partOfSpeech}</b></div>`;
      m.definitions.forEach(d => {
        html += `<li>${d.definition}`;
        if (d.example) html += `<div><i>Example: ${d.example}</i></div>`;
        html += `</li>`;
      });
    });

    // -------------------------------------------------------------
    // 5) HIỂN THỊ POPUP
    // -------------------------------------------------------------
    showPopup(element, clean, html, audio);

  } catch (err) {
    showPopup(element, clean, "Không tìm thấy nghĩa từ.");
  }
}
