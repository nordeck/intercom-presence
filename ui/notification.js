let i = 0;

// -----------------------------------------------------------------------------
// removeCall
// -----------------------------------------------------------------------------
function removeCall(msgId, msgDiv) {
  if (!msgId) throw "invalid message id";
  if (!msgDiv) throw "missing message div";
  if (!globalThis.notification[`call-${msgId}`]) throw "missing notification";

  // Check later if it is still ringing.
  if (Number(globalThis.notification[`call-${msgId}`]) > Date.now() - 3000) {
    setTimeout(() => {
      removeCall(msgId, msgDiv);
    }, 1000);

    return;
  }

  console.error("remove");

  // Remove objects of this call.
  delete globalThis.notification[`call-${msgId}`];
  msgDiv.remove();
}

// -----------------------------------------------------------------------------
// callHandler
// -----------------------------------------------------------------------------
function callHandler(data) {
  console.log(data);
  console.log(data?.callee);

  const msgId = data?.id;
  if (!msgId) throw "invalid id";

  // If this is a follow-up message then just update the timer.
  if (globalThis.notification[`call-${msgId}`]) {
    globalThis.notification[`call-${msgId}`] = Date.now();
    return;
  }

  // If this is the initial message then create UI elements.
  const toast = document.getElementById("notificationContainer");
  const msgDiv = document.createElement("div");
  msgDiv.textContent = `${data?.callee} - ${i}`;
  toast.appendChild(msgDiv);
  i = i + 1;

  globalThis.notification[`call-${msgId}`] = Date.now();

  // Trigger the remove job which will delete UI elements if it doesn't ring
  // anymore.
  setTimeout(() => {
    removeCall(msgId, msgDiv);
  }, 1000);
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
// Create a namespace if it doesn't exist.
globalThis.notification = globalThis.notification || {};

const user = globalThis.notification.user;
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
