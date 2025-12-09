// translate.js
async function translateMessage(msgDiv, englishText) {
  if (msgDiv.querySelector(".translated")) return;

  try {
    const res = await fetch("/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: englishText }),
    });

    const data = await res.json();

    const trans = document.createElement("div");
    trans.className = "translated";
    trans.style.marginTop = "8px";
    trans.style.fontStyle = "italic";
    trans.textContent = "→ Vietnamese: " + data.reply;

    msgDiv.appendChild(trans);
  } catch {
    alert("Translation failed!");
  }
}
