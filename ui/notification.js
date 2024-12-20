let i = 0;

// -----------------------------------------------------------------------------
// getUser
// -----------------------------------------------------------------------------
function getUser() {
  return globalThis.notification.user;
}

// -----------------------------------------------------------------------------
// createNotificationContainer
// -----------------------------------------------------------------------------
function createNotificationContainer() {
  const notificationContainer = document.createElement("div");

  notificationContainer.id = "notificationContainer";
  notificationContainer.style.position = "fixed";
  notificationContainer.style.top = "1px";
  notificationContainer.style.right = "1px";
  notificationContainer.style.zIndex = "1000";

  document.body.appendChild(notificationContainer);
}

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
  console.error(data);
  const msgId = data?.id;
  if (!msgId) throw "invalid id";

  const isExist = document.getElementById(`call-${msgId}`);
  if (isExist) throw "message element is already created";

  // Initialize the call timer.
  globalThis.notification[`call-${msgId}`] = Date.now();

  // Create the message element.
  const toast = document.getElementById("notificationContainer");
  const msgDiv = document.createElement("div");
  msgDiv.id = `call-${msgId}`;
  msgDiv.textContent = `${data?.callee} - ${i}`;
  toast.appendChild(msgDiv);
  i = i + 1;

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
    } else {
      throw "unknown notification type";
    }
  } catch {
    // do nothing
  }
}

// -----------------------------------------------------------------------------
// subscribe
// -----------------------------------------------------------------------------
function subscribe(user) {
  const src = `http://127.0.0.1:8001/intercom/notification?user=${user}`;
  const eventSrc = new EventSource(src);

  eventSrc.onmessage = (e) => {
    onMessage(e);
  };

  eventSrc.onerror = () => {
    console.error("eventSrc failed.");
  };
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
// Create the namespace.
globalThis.notification = globalThis.notification || {};

// Create the notification container in UI
createNotificationContainer();

// This will be Keycloak's token in the future.
const user = getUser();

// Subscribe to the notification channel.
subscribe(user);
