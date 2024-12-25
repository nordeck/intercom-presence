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
function removeCall(callId, callPopup, callEventSrc) {
  if (!callId) throw "invalid call id";
  if (!callPopup) throw "missing call div";
  if (!callEventSrc) throw "missing call event source";
  if (!globalThis.notification[`call-${callId}`]) throw "missing call timer";

  // If it is still ringing then check later.
  if (Number(globalThis.notification[`call-${callId}`]) > Date.now() - 3000) {
    setTimeout(() => {
      removeCall(callId, callPopup, callEventSrc);
    }, 1000);

    return;
  }

  // Remove objects of this call since it doesn't ring anymore.
  delete globalThis.notification[`call-${callId}`];
  callPopup.remove();
  callEventSrc.close();
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function createIcon(pathData, width, height, color) {
  const ns = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(ns, "svg");
  icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  icon.setAttribute("width", parseInt(width));
  icon.setAttribute("height", parseInt(height));
  icon.setAttribute("fill", color);
  icon.setAttribute("viewBox", "0 0 16 16");

  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", pathData);
  icon.appendChild(path);

  return icon;
}

// -----------------------------------------------------------------------------
// closeIcon
// -----------------------------------------------------------------------------
function closeIcon() {
  const pathData =
    "M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 " +
    ".708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 " +
    "2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708";

  return createIcon(pathData, 16, 16, "currentColor");
}

// -----------------------------------------------------------------------------
// phoneIcon
// -----------------------------------------------------------------------------
function phoneIcon() {
  const pathData =
    "M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 " +
    "1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 " +
    "4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 " +
    "0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 " +
    "1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 " +
    "0-.122-.58zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 " +
    "2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 " +
    "2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 " +
    "1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 " +
    "1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 " +
    "1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z";

  return createIcon(pathData, 24, 24, "blue");
}

// -----------------------------------------------------------------------------
// createCallPopup
// -----------------------------------------------------------------------------
function createCallPopup(callId, callerName) {
  // Popup
  const callPopup = document.createElement("div");
  callPopup.id = `call-${callId}`;
  callPopup.style.display = "flex";
  callPopup.style.flexDirection = "column";
  callPopup.style.width = "300px";
  callPopup.style.height = "100px";
  callPopup.style.margin = "8px";
  callPopup.style.border = "1px solid #e0e0e0";
  callPopup.style.borderRadius = "8px";
  callPopup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  callPopup.style.backgroundColor = "#fff";

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.width = "100%";
  header.style.marginTop = "8px";
  header.style.marginBottom = "auto";
  header.style.alignItems = "center";
  callPopup.appendChild(header);

  // Header, icon
  const headerIcon = phoneIcon();
  headerIcon.style.margin = "auto 12px";
  header.appendChild(headerIcon);

  // Header, message
  const message = document.createElement("span");
  message.textContent = `${callerName} is calling`;
  header.appendChild(message);

  // Header, close button
  const close = document.createElement("button");
  close.style.margin = "0px 0px auto auto";
  close.style.border = "none";
  close.style.backgroundColor = "#fff";
  close.appendChild(closeIcon());
  header.appendChild(close);

  // Body
  const body = document.createElement("div");
  body.style.display = "flex";
  body.style.flex = "1";
  body.style.width = "100%";
  body.style.justifyContent = "center";
  body.style.alignItems = "center";
  callPopup.appendChild(body);

  // Body, reject button
  const reject = document.createElement("button");
  reject.appendChild(closeIcon());
  body.appendChild(reject);

  // Body, accept button
  const accept = document.createElement("button");
  accept.appendChild(closeIcon());
  body.appendChild(accept);

  return callPopup;
}

// -----------------------------------------------------------------------------
// callHandler
// -----------------------------------------------------------------------------
function callHandler(data) {
  const callId = data?.call_id;
  if (!callId) throw "invalid id";

  const isPopupExist = document.getElementById(`call-${callId}`);
  if (isPopupExist) throw "Call popup is already created";

  // Initialize the call timer.
  globalThis.notification[`call-${callId}`] = Date.now();

  // Create the call popup and add it into DOM.
  const callerName = data?.caller_name || "unknown";
  const callPopup = createCallPopup(callId, callerName);
  const toast = document.getElementById("notificationContainer");
  toast.appendChild(callPopup);

  // Subscribe to the call channel.
  const callEventSrc = subscribeToCall(callId);

  // Trigger the remove job which will delete UI elements if it doesn't ring
  // anymore.
  setTimeout(() => {
    removeCall(callId, callPopup, callEventSrc);
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
