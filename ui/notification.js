const ICS_SERVER = "https://ics.nightly.opendesk.qa";
const STREAM_SERVER = "https://ics.nightly.opendesk.qa";

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
  const eventSrc = new EventSource(src, { withCredentials: true });

  eventSrc.onmessage = (e) => {
    onCallMessage(callId, e);
  };

  eventSrc.onerror = () => {
    console.error("call channel failed.");
  };

  return eventSrc;
}

// -----------------------------------------------------------------------------
// removeCall
// -----------------------------------------------------------------------------
function removeCall(callId, callDiv, callEventSrc) {
  if (!callId) throw "invalid call id";
  if (!callDiv) throw "missing call div";
  if (!callEventSrc) throw "missing call event source";
  if (!globalThis.notification[`call-${callId}`]) throw "missing call timer";

  // If it is still ringing then check later.
  if (Number(globalThis.notification[`call-${callId}`]) > Date.now() - 3000) {
    setTimeout(() => {
      removeCall(callId, callDiv, callEventSrc);
    }, 1000);

    return;
  }

  // Remove objects of this call since it doesn't ring anymore.
  delete globalThis.notification[`call-${callId}`];
  callDiv.remove();
  callEventSrc.close();
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
  const callEventSrc = subscribeToCall(callId);

  // Trigger the remove job which will delete UI elements if it doesn't ring
  // anymore.
  setTimeout(() => {
    removeCall(callId, callDiv, callEventSrc);
  }, 1000);
}

// -----------------------------------------------------------------------------
// getIdentity
// -----------------------------------------------------------------------------
async function getIdentity() {
  try {
    const url = `${ICS_SERVER}/uuid`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status !== 200) throw "identity request is rejected";

    const identity = await res.text();
    if (!identity) throw "missing identity";

    return identity;
  } catch {
    return undefined;
  }
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
async function subscribeToNotification() {
  // Dont subscribe now if she is not authenticated yet. Try later.
  const isAuthenticated = await getIdentity();
  if (!isAuthenticated) {
    setTimeout(subscribeToNotification, 3000);
    return;
  }

  const src = `${STREAM_SERVER}/intercom/notification`;
  const eventSrc = new EventSource(src, { withCredentials: true });

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
