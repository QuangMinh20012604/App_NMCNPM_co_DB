// ============================================================================
// showPopup(element, word, html, audio)
// Hàm hiển thị popup từ điển ngay tại vị trí của một từ:
// 1. Xóa popup cũ
// 2. Tạo popup mới + header + nội dung
// 3. Định vị popup phía dưới từ đã click
// 4. Hỗ trợ nút phát âm và nút đóng
// 5. Tự động đóng khi click ra ngoài
// ============================================================================
function showPopup(element, word, html, audio = "") {

  // Xóa popup đang mở trước đó (chỉ giữ 1 popup)
  document.querySelectorAll(".dict-popup").forEach((el) => el.remove());

  // Tạo popup container
  const popup = document.createElement("div");
  popup.className = "dict-popup";

  // ============================================================================
  // HEADER: chứa tiêu đề + nút phát âm + nút đóng
  // ============================================================================
  const header = document.createElement("div");
  header.className = "dict-header";

  // Tên từ đang tra cứu
  const title = document.createElement("div");
  title.innerHTML = `<strong>${word}</strong>`;

  // Nhóm nút điều khiển (audio + close)
  const controls = document.createElement("div");

  // Nút phát âm nếu có URL audio
  if (audio) {
    const playBtn = document.createElement("button");
    playBtn.innerText = "🔊";  // giữ nguyên ký tự theo file gốc
    playBtn.className = "dict-audio-btn";
    playBtn.onclick = () => new Audio(audio).play();
    controls.appendChild(playBtn);
  }

  // Nút đóng popup
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✖";   // giữ nguyên ký tự theo file gốc
  closeBtn.className = "dict-close-btn";
  closeBtn.onclick = () => popup.remove();
  controls.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(controls);

  // ============================================================================
  // BODY: nội dung giải nghĩa (html được build từ dictionary.js)
  // ============================================================================
  const body = document.createElement("div");
  body.className = "dict-body";
  body.innerHTML = html;

  popup.appendChild(header);
  popup.appendChild(body);

  // Thêm popup vào trang
  document.body.appendChild(popup);

  // ============================================================================
  // ĐỊNH VỊ POPUP NGAY DƯỚI TỪ ĐƯỢC CLICK
  // ============================================================================
  const rect = element.getBoundingClientRect();

  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  // Vị trí vertical = ngay dưới từ + 6px
  popup.style.top = rect.bottom + scrollY + 6 + "px";

  // Vị trí horizontal = theo vị trí từ
  popup.style.left = rect.left + scrollX + "px";

  // ============================================================================
  // ĐÓNG POPUP KHI CLICK BÊN NGOÀI
  // ============================================================================
  function onDocClick(e) {
    // Nếu click không phải trong popup và không phải chính từ được click
    if (!popup.contains(e.target) && e.target !== element) {
      popup.remove();
      document.removeEventListener("click", onDocClick);
    }
  }

  // Delay tránh trigger click ngay lúc popup được tạo
  setTimeout(() => document.addEventListener("click", onDocClick), 50);
}
