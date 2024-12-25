// -----------------------------------------------------------------------
// Globals
// -----------------------------------------------------------------------
let callId = "";
let ringCounter = 0;

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
    const url = "https://ics.nightly.opendesk.qa/intercom/call/add";
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

    callId = data.call_id;
    ringCounter = 0;
    setTimeout(ring, 1000);

    document.getElementById("button-cancel").disabled = false;
  } catch {
    document.getElementById("button-cancel").style.display = "none";
    document.getElementById("button-cancel").disabled = false;
    document.getElementById("spinner").style.display = "none";
    document.getElementById("button-call").style.display = "block";
  }
}

// -----------------------------------------------------------------------
// ring
// -----------------------------------------------------------------------
async function ring() {
  try {
    if (!callId) throw "missing call id";
    if (ringCounter > 90) throw "cancelled call";
    if (ringCounter > 9) {
      cancel();
      throw "so many tries";
    }

    const url = "https://ics.nightly.opendesk.qa/intercom/call/ring";
    const payload = {
      "call_id": callId,
    };

    await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      method: "post",
      body: JSON.stringify(payload),
    });

    ringCounter += 1;
    setTimeout(ring, 1000);
  } catch {
    document.getElementById("button-cancel").style.display = "none";
    document.getElementById("button-cancel").disabled = false;
    document.getElementById("spinner").style.display = "none";
    document.getElementById("button-call").style.display = "block";
  }
}

// -----------------------------------------------------------------------
// cancel
// -----------------------------------------------------------------------
async function cancel() {
  try {
    ringCounter = 99;
    document.getElementById("button-cancel").disabled = true;

    if (!callId) throw "missing call id";

    const url = "https://ics.nightly.opendesk.qa/intercom/call/stop";
    const payload = {
      "call_id": callId,
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
