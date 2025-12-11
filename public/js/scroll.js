// ============================================================================
// smartScroll()
// Cuộn xuống cuối vùng tin nhắn một cách thông minh.
//
// Mục đích:
// - Chỉ auto-scroll khi người dùng đang ở gần đáy khung chat.
// - Nếu người dùng đã cuộn lên để xem tin nhắn cũ → không tự động kéo xuống.
//
// Cách hoạt động:
// - Kiểm tra khoảng cách giữa vị trí cuộn hiện tại và đáy khung (threshold).
// - Nếu nhỏ hơn 150px → xem như người dùng đang ở dưới → auto-scroll.
// - Nếu lớn hơn → giữ nguyên, không cuộn, tránh gây khó chịu.
// ============================================================================
function smartScroll() {

  // Khoảng cách cho phép (px). Nếu nhỏ hơn → coi như "người dùng đang ở dưới".
  const threshold = 150;

  // Tính khoảng cách còn lại từ vị trí cuộn hiện tại đến đáy
  const atBottom =
    messages.scrollHeight - messages.clientHeight - messages.scrollTop <
    threshold;

  // Nếu đang ở cuối → cuộn xuống tin nhắn mới
  if (atBottom) {
    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: "smooth"  // Cuộn mượt
    });
  }
}
