// scroll.js
function smartScroll() {
  const threshold = 150;
  const atBottom =
    messages.scrollHeight - messages.clientHeight - messages.scrollTop <
    threshold;

  if (atBottom) {
    messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
  }
}
