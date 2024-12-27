// -----------------------------------------------------------------------
// Globals
// -----------------------------------------------------------------------
const CALL_INTERCOM_SERVER = "https://ics.nightly.opendesk.qa";
const CALL_MEET_SERVER = "https://meet.nightly.opendesk.qa";

let CALL_ID = "";
let RING_COUNTER = 0;
let EVENT_SRC;

// -----------------------------------------------------------------------------
// onCallMessage
// -----------------------------------------------------------------------------
function onCallMessage(e) {
  try {
    const data = JSON.parse(e.data);
    if (!data) throw "missing call data";

    if (data.type === "reject") {
      // ring function will restore UI
      RING_COUNTER = 81;
    } else if (data.type === "accept") {
      // ring function will restore UI
      RING_COUNTER = 71;

      globalThis.location = `${CALL_MEET_SERVER}/call-${CALL_ID}` +
        `#config.prejoinConfig.enabled=false` +
        `&config.startWithVideoMuted=true` +
        `&config.localSubject="Direct Call"`;
    }
  } catch {
    // do nothing
  }
}

// -----------------------------------------------------------------------------
// subscribeToCall
// -----------------------------------------------------------------------------
function subscribeToCall() {
  // Close the previous event source if exists.
  try {
    EVENT_SRC.close();
  } catch {
    // Do nothing.
  }

  const src = `${CALL_INTERCOM_SERVER}/intercom/call?id=${CALL_ID}`;
  EVENT_SRC = new EventSource(src, { withCredentials: true });

  EVENT_SRC.onmessage = (e) => {
    onCallMessage(e);
  };

  EVENT_SRC.onerror = () => {
    console.error("call channel failed.");
  };
}

// -----------------------------------------------------------------------
// cancel
// -----------------------------------------------------------------------
async function cancel() {
  try {
    document.getElementById("button-cancel").disabled = true;

    // ring function will restore UI
    RING_COUNTER = 91;

    if (!CALL_ID) throw "missing call id";

    const url = `${CALL_INTERCOM_SERVER}/intercom/call/cancel`;
    const payload = {
      "call_id": CALL_ID,
    };

    await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      method: "post",
      body: JSON.stringify(payload),
    });
  } catch {
    // Do nothing.
  }
}

// -----------------------------------------------------------------------
// ring
// -----------------------------------------------------------------------
async function ring() {
  try {
    if (!CALL_ID) throw "missing call id";
    if (RING_COUNTER > 90) throw "cancelled call";
    if (RING_COUNTER > 80) throw "rejected call";
    if (RING_COUNTER > 70) throw "accepted call";
    if (RING_COUNTER > 9) {
      await cancel();
      throw "so many tries";
    }

    const url = `${CALL_INTERCOM_SERVER}/intercom/call/ring`;
    const payload = {
      "call_id": CALL_ID,
    };

    await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      method: "post",
      body: JSON.stringify(payload),
    });

    RING_COUNTER += 1;
    setTimeout(ring, 1000);
  } catch {
    document.getElementById("button-cancel").style.display = "none";
    document.getElementById("button-cancel").disabled = false;
    document.getElementById("spinner").style.display = "none";
    document.getElementById("button-call").style.display = "block";
  }
}

// -----------------------------------------------------------------------
// call
// -----------------------------------------------------------------------
// deno-lint-ignore no-unused-vars
async function call() {
  document.getElementById("button-call").style.display = "none";
  document.getElementById("spinner").style.display = "block";
  document.getElementById("button-cancel").disabled = true;
  document.getElementById("button-cancel").style.display = "block";

  const callee = document.getElementById("callee").value;
  const payload = {
    "callee_id": callee,
  };

  try {
    const url = `${CALL_INTERCOM_SERVER}/intercom/call/add`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      method: "post",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data?.call_id) throw "failed to start the call";

    CALL_ID = data.call_id;
    RING_COUNTER = 0;
    subscribeToCall();
    setTimeout(ring, 1000);

    document.getElementById("button-cancel").disabled = false;
  } catch {
    document.getElementById("button-cancel").style.display = "none";
    document.getElementById("button-cancel").disabled = false;
    document.getElementById("spinner").style.display = "none";
    document.getElementById("button-call").style.display = "block";
  }
}
