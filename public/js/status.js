// ============================================================================
// setStatus(state)
// Hàm cập nhật dòng trạng thái hệ thống ở footer hoặc header.
//
// Các trạng thái được sử dụng:
// - "sending"    → đang gửi request lên server
// - "listening"  → microphone đang ghi âm (Speech-to-Text)
// - "ready"      → trạng thái bình thường, không bận
//
// Những module khác như chat.js và speakToText.js gọi hàm này để đồng bộ UI.
// ============================================================================

const statusEl = document.getElementById("status");

function setStatus(state) {
  switch (state) {

    // Đang gửi dữ liệu chat lên server
    case "sending":
      statusEl.textContent = "Status: sending...";
      break;

    // Micro đang bật và ghi âm
    case "listening":
      statusEl.textContent = "Status: Listening...";
      break;

    // Trạng thái mặc định
    case "ready":
      statusEl.textContent = "Status: ready";
      break;

    // Trạng thái khác nếu được truyền vào
    default:
      statusEl.textContent = "Status: " + state;
  }
}
