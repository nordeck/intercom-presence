let i = 0;

// -----------------------------------------------------------------------------
// removeNotification
// -----------------------------------------------------------------------------
function removeNotification(msgId, msgDiv) {
  if (!msgId) throw "invalid message id";
  if (!msgDiv) throw "missing message div";
  if (!globalThis.notification[`call-${msgId}`]) throw "missing notification";

  if (Number(globalThis.notification[`call-${msgId}`]) > Date.now() - 3000) {
    setTimeout(() => {
      removeNotification(msgId, msgDiv);
    }, 1000);

    return;
  }

  console.error("remove");
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

  if (globalThis.notification[`call-${msgId}`]) {
    globalThis.notification[`call-${msgId}`] = Date.now();
    return;
  }

  const toast = document.getElementById("notificationContainer");
  const msgDiv = document.createElement("div");
  msgDiv.textContent = `${data?.callee} - ${i}`;
  toast.appendChild(msgDiv);
  i = i + 1;

  globalThis.notification[`call-${msgId}`] = Date.now();

  setTimeout(() => {
    removeNotification(msgId, msgDiv);
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
