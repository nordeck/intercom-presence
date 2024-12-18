// -----------------------------------------------------------------------------
// callHandler
// -----------------------------------------------------------------------------
function callHandler(data) {
  console.log(data);
  console.log(data?.callee);
}

// -----------------------------------------------------------------------------
// onMessage
// -----------------------------------------------------------------------------
function onMessage(e) {
  try {
    const data = JSON.parse(e.data);
    if (data?.type === "call") {
      callHandler(data);
    }
  } catch {
    // do nothing
  }
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
const user = globalThis.user;
const src = `http://127.0.0.1:8000/intercom/notification?user=${user}`;

const el = document.getElementById("user");
el.textContent = user;

const eventSrc = new EventSource(src);

eventSrc.onmessage = (e) => {
  onMessage(e);
};

eventSrc.onerror = () => {
  console.error("eventSrc failed.");
};
