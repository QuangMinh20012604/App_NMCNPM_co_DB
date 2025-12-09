// status.js
function setStatus(state) {
  switch (state) {
    case "sending":
      status.textContent = "Status: sending...";
      break;
    case "listening":
      status.textContent = "Status: Listening...";
      break;
    case "ready":
      status.textContent = "Status: ready";
      break;
    default:
      status.textContent = "Status: " + state;
  }
}
