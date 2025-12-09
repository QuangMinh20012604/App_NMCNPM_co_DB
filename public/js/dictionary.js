// dictionary.js
async function lookupWord(word, element) {
  const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return;

  document.querySelectorAll(".dict-popup").forEach((el) => el.remove());

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`
    );
    const data = await res.json();

    let meaning = "";
    let example = "";
    let phonetic = "";
    let audio = "";

    if (Array.isArray(data)) {
      const entry = data[0];
      meaning =
        entry.meanings?.[0]?.definitions?.[0]?.definition || "No definition.";
      example = entry.meanings?.[0]?.definitions?.[0]?.example || "";
      phonetic = entry.phonetics?.find((p) => p.text)?.text || "";
      audio = entry.phonetics?.find((p) => p.audio)?.audio || "";
    }

    let explainedEN = meaning;
    try {
      const resExplain = await fetch("/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: clean, meaning }),
      });
      explainedEN = (await resExplain.json()).explanation || meaning;
    } catch {}

    let vietnameseMeaning = "";
    try {
      const t = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: explainedEN }),
      });
      vietnameseMeaning = (await t.json()).reply || "";
    } catch {}

    const html = `
      <div><b>${clean}</b> ${phonetic}</div>
      <div><b>EN:</b> ${explainedEN}</div><br>
      <div><b>VN:</b> ${vietnameseMeaning}</div>
      ${example ? `<div><i>${example}</i></div>` : ""}
    `;

    showPopup(element, clean, html, audio);

  } catch {
    showPopup(element, word, "Error loading dictionary.");
  }
}
