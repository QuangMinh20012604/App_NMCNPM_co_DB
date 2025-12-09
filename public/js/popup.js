// popup.js

function showPopup(element, word, html, audio = "") {
  // Xóa popup cũ nếu có
  document.querySelectorAll(".dict-popup").forEach((el) => el.remove());

  const popup = document.createElement("div");
  popup.className = "dict-popup";

  // ===== HEADER =====
  const header = document.createElement("div");
  header.className = "dict-header";

  // Tên từ
  const title = document.createElement("div");
  title.innerHTML = `<strong>${word}</strong>`;

  // Các nút bên phải header
  const controls = document.createElement("div");

  // Nút phát âm
  if (audio) {
    const playBtn = document.createElement("button");
    playBtn.innerText = "🔊";
    playBtn.className = "dict-audio-btn";
    playBtn.onclick = () => new Audio(audio).play();
    controls.appendChild(playBtn);
  }

  // Nút đóng popup
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✖";
  closeBtn.className = "dict-close-btn";
  closeBtn.onclick = () => popup.remove();
  controls.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(controls);

  // ===== BODY =====
  const body = document.createElement("div");
  body.className = "dict-body";
  body.innerHTML = html;

  popup.appendChild(header);
  popup.appendChild(body);

  document.body.appendChild(popup);

  // ===== ĐỊNH VỊ POPUP NGAY DƯỚI TỪ =====
  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  popup.style.top = rect.bottom + scrollY + 6 + "px";
  popup.style.left = rect.left + scrollX + "px";

  // ===== Đóng khi click bên ngoài popup =====
  function onDocClick(e) {
    if (!popup.contains(e.target) && e.target !== element) {
      popup.remove();
      document.removeEventListener("click", onDocClick);
    }
  }

  // Delay 1 chút để tránh nhận click lúc mở popup
  setTimeout(() => document.addEventListener("click", onDocClick), 50);
}
