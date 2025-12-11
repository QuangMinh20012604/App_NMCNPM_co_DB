// ============================================================================
// uid()
// Tạo ID ngẫu nhiên dạng string, dùng để sinh khóa hoặc định danh tạm thời.
// Format: timestamp (base36) + random string (base36)
// Dùng Date.now() để đảm bảo mức độ duy nhất theo thời gian.
// ============================================================================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}


// ============================================================================
// escapeHtml(s)
// Chuyển đổi các ký tự đặc biệt HTML sang dạng an toàn.
// Mục đích: chống XSS khi render text từ người dùng vào DOM.
// Chỉ xử lý &, <, >
// ============================================================================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ============================================================================
// escapeAttr(s)
// Escape ký tự nguy hiểm trong HTML attributes.
// Mục tiêu: tránh phá vỡ cấu trúc attribute của thẻ HTML.
// Chuyển đổi " và ' sang entity an toàn.
// ============================================================================
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
