STREAM_SERVER = "https://myics.nightly.opendesk.qa";

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
// onCallMessage
// -----------------------------------------------------------------------------
function onCallMessage(callId, e) {
  try {
    const data = JSON.parse(e.data);
    if (!data) throw "missing call data";

    if (data.type === "ring") {
      // Extend the expire time.
      globalThis.notification[`call-${callId}`] = Date.now();
    } else if (data.type === "stop") {
      // Set timer as expired. So, the popup and the subscription will be
      // removed.
      globalThis.notification[`call-${callId}`] = "0";
    }
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
    onCallMessage(callId, e);

    // Close the subscription if the call is ended.
    if (
      !globalThis.notification[`call-${callId}`] ||
      globalThis.notification[`call-${callId}`] == "0"
    ) {
      eventSrc.close();
    }
  };

  eventSrc.onerror = () => {
    console.error("call channel failed.");
  };
}

// -----------------------------------------------------------------------------
// removeCall
// -----------------------------------------------------------------------------
function removeCall(callId, callDiv) {
  if (!callId) throw "invalid call id";
  if (!callDiv) throw "missing call div";
  if (!globalThis.notification[`call-${callId}`]) throw "missing call timer";

  // If it is still ringing then check later.
  if (Number(globalThis.notification[`call-${callId}`]) > Date.now() - 3000) {
    setTimeout(() => {
      removeCall(callId, callDiv);
    }, 1000);

    return;
  }

  // Remove objects of this call since it doesn't ring anymore.
  delete globalThis.notification[`call-${callId}`];
  callDiv.remove();
}

// -----------------------------------------------------------------------------
// callHandler
// -----------------------------------------------------------------------------
function callHandler(data) {
  const callId = data?.call_id;
  if (!callId) throw "invalid id";

  const isDivExist = document.getElementById(`call-${callId}`);
  if (isDivExist) throw "message element is already created";

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
// onNotificationMessage
// -----------------------------------------------------------------------------
function onNotificationMessage(e) {
  try {
    const data = JSON.parse(e.data);
    if (!data) throw "invalid notification data";

    if (data?.type === "call") {
      callHandler(data);
    } else {
      throw "unknown notification type";
    }
  } catch {
    console.error("failed while processing the notification");
  }
}

// -----------------------------------------------------------------------------
// subscribe
// -----------------------------------------------------------------------------
function subscribeToNotification() {
  // This will be Keycloak's token in the future.
  const user = getUser();
  if (!user) {
    setTimeout(subscribeToNotification, 3000);
    return;
  }

  const src = `${STREAM_SERVER}/intercom/notification?user=${user}`;
  const eventSrc = new EventSource(src);

  eventSrc.onmessage = (e) => {
    onNotificationMessage(e);
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

// Subscribe to the notification channel.
subscribeToNotification();
