// ============================================================================
// lookupWord(word, element)
// Hàm xử lý khi người dùng click vào một từ trong câu:
// 1. Làm sạch từ (loại ký tự không phải chữ cái)
// 2. Gọi API dictionaryapi.dev để lấy nghĩa, ví dụ, phiên âm, audio
// 3. Gọi backend /define để tạo bản giải thích đơn giản bằng tiếng Anh
// 4. Gọi backend /translate để dịch sang tiếng Việt
// 5. Hiển thị popup từ điển ngay tại vị trí từ được click
// ============================================================================
async function lookupWord(word, element) {

  // Làm sạch từ: chỉ giữ lại chữ cái, và chuyển sang lowercase
  const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return;

  // Xoá popup cũ nếu đang tồn tại
  document.querySelectorAll(".dict-popup").forEach((el) => el.remove());

  try {
    // -------------------------------------------------------------
    // 1) GỌI DICTIONARYAPI.DEV LẤY THÔNG TIN TỪ ĐIỂN THÔ
    // -------------------------------------------------------------
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`
    );
    const data = await res.json();

    // Các biến chuẩn bị để render
    let meaning = "";
    let example = "";
    let phonetic = "";
    let audio = "";

    // Nếu API trả về đúng cấu trúc (mảng)
    if (Array.isArray(data)) {
      const entry = data[0];

      // Lấy nghĩa tiếng Anh nguyên gốc
      meaning =
        entry.meanings?.[0]?.definitions?.[0]?.definition || "No definition.";

      // Ví dụ nếu có
      example = entry.meanings?.[0]?.definitions?.[0]?.example || "";

      // Phiên âm
      phonetic = entry.phonetics?.find((p) => p.text)?.text || "";

      // Link audio (phát âm)
      audio = entry.phonetics?.find((p) => p.audio)?.audio || "";
    }


    // -------------------------------------------------------------
    // 2) GỌI BACKEND /define → Tạo bản giải thích EN đơn giản
    // -------------------------------------------------------------
    let explainedEN = meaning;
    try {
      const resExplain = await fetch("/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: clean, meaning }),
      });
      explainedEN = (await resExplain.json()).explanation || meaning;
    } catch {
      // Nếu lỗi thì dùng lại meaning gốc
    }


    // -------------------------------------------------------------
    // 3) GỌI BACKEND /translate → Dịch sang tiếng Việt
    // -------------------------------------------------------------
    let vietnameseMeaning = "";
    try {
      const t = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: explainedEN }),
      });
      vietnameseMeaning = (await t.json()).reply || "";
    } catch {
      // Nếu lỗi → bỏ trống
    }


    // -------------------------------------------------------------
    // 4) RENDER HTML CHO POPUP TỪ ĐIỂN
    // -------------------------------------------------------------
    const html = `
      <div><b>${clean}</b> ${phonetic}</div>
      <div><b>EN:</b> ${explainedEN}</div><br>
      <div><b>VN:</b> ${vietnameseMeaning}</div>
      ${example ? `<div><i>${example}</i></div>` : ""}
    `;

    // -------------------------------------------------------------
    // 5) HIỂN THỊ POPUP NGAY TẠI VỊ TRÍ TỪ ĐƯỢC CLICK
    // -------------------------------------------------------------
    showPopup(element, clean, html, audio);

  } catch {
    // Nếu dictionary API lỗi, hiển thị thông báo đơn giản
    showPopup(element, word, "Error loading dictionary.");
  }
}
