STREAM_SERVER = "http://127.0.0.1:8001";

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
// onCall
// -----------------------------------------------------------------------------
function onCall(callId, e) {
  try {
    const data = JSON.parse(e.data);
    console.error(data);

    globalThis.notification[`call-${callId}`] = Date.now();
  } catch {
    // do nothing
  }
}

// -----------------------------------------------------------------------------
// subscribeToCall
// -----------------------------------------------------------------------------
function subscribeToCall(callId) {
  const src = `${STREAM_SERVER}/intercom/call?id=${callId}`;
  const eventSrc = new EventSource(src);

  eventSrc.onmessage = (e) => {
    onCall(callId, e);
  };

  eventSrc.onerror = () => {
    console.error("notification channel failed.");
  };
}

// -----------------------------------------------------------------------------
// removeCall
// -----------------------------------------------------------------------------
function removeCall(callId, callDiv) {
  if (!callId) throw "invalid call id";
  if (!callDiv) throw "missing call div";
  if (!globalThis.notification[`call-${callId}`]) throw "missing call timer";

  // Check later if it is still ringing.
  if (Number(globalThis.notification[`call-${callId}`]) > Date.now() - 3000) {
    setTimeout(() => {
      removeCall(callId, callDiv);
    }, 1000);

    return;
  }

  // Remove objects of this call.
  delete globalThis.notification[`call-${callId}`];
  callDiv.remove();
}

// -----------------------------------------------------------------------------
// callHandler
// -----------------------------------------------------------------------------
function callHandler(data) {
  const callId = data?.call_id;
  if (!callId) throw "invalid id";

  const isExist = document.getElementById(`call-${callId}`);
  if (isExist) throw "message element is already created";

  // Initialize the call timer.
  globalThis.notification[`call-${callId}`] = Date.now();

  // Create the call element.
  const toast = document.getElementById("notificationContainer");
  const callDiv = document.createElement("div");
  callDiv.id = `call-${callId}`;
  callDiv.textContent = `${data?.caller_name} is calling`;
  toast.appendChild(callDiv);

  // Subscribe to the call channel.
  subscribeToCall(callId);

  // Trigger the remove job which will delete UI elements if it doesn't ring
  // anymore.
  setTimeout(() => {
    removeCall(callId, callDiv);
  }, 1000);
}

// -----------------------------------------------------------------------------
// onNotification
// -----------------------------------------------------------------------------
function onNotification(e) {
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
function subscribeToNotification(user) {
  const src = `${STREAM_SERVER}/intercom/notification?user=${user}`;
  const eventSrc = new EventSource(src);

  eventSrc.onmessage = (e) => {
    onNotification(e);
  };

  eventSrc.onerror = () => {
    console.error("notification channel failed.");
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
subscribeToNotification(user);
