import { v1, v5 as uuid } from "jsr:@std/uuid@^1.0.0";
import { connect } from "jsr:@nats-io/transport-deno@3.0.0-18";
import type { NatsConnection } from "jsr:@nats-io/nats-core@3.0.0-46";

// -----------------------------------------------------------------------------
// Globals
// -----------------------------------------------------------------------------
const ICS_SERVER = "https://ics.nightly.opendesk.qa";
const HTTP_HOSTNAME = "0.0.0.0";
const HTTP_PORT = 8001;
const NATS_SERVERS = { servers: "127.0.0.1:4222" };
const MEETING_SERVER = "https://meet.jit.si";
const PRE = "/intercom";
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

interface Headers {
  [key: string]: string;
}

// -----------------------------------------------------------------------------
// internalServerError
// -----------------------------------------------------------------------------
export function internalServerError(): Response {
  const body = {
    error: {
      message: "Internal Server Error",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 500,
  });
}

// -----------------------------------------------------------------------------
// methodNotAllowed
// -----------------------------------------------------------------------------
export function methodNotAllowed(): Response {
  const body = {
    error: {
      message: "Method Not Allowed",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 405,
  });
}

// -----------------------------------------------------------------------------
// notFound
// -----------------------------------------------------------------------------
export function notFound(): Response {
  const body = {
    error: {
      message: "Not Found",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 404,
  });
}

// -----------------------------------------------------------------------------
// ok
// -----------------------------------------------------------------------------
export function ok(body: string): Response {
  return new Response(body, {
    status: 200,
  });
}

// -----------------------------------------------------------------------------
// succeeded ((NoContent, OK without a body)
// -----------------------------------------------------------------------------
export function succeeded(): Response {
  return new Response(null, {
    status: 204,
  });
}

// -----------------------------------------------------------------------------
// unauthorized
// -----------------------------------------------------------------------------
export function unauthorized(): Response {
  const body = {
    error: {
      message: "Unauthorized",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 401,
  });
}

// -----------------------------------------------------------------------------
// getIdentity
// -----------------------------------------------------------------------------
async function getIdentity(req: Request): Promise<string> {
  try {
    const cookie = req.headers.get("cookie");
    if (!cookie) throw "missing authentication cookie";

    const url = `${ICS_SERVER}/uuid`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Cookie: cookie,
      },
    });

    if (res.status !== 200) throw "uuid request is rejected";

    const identity = await res.text();
    if (!identity) throw "missing user uuid";

    return identity;
  } catch {
    return "";
  }
}

// -----------------------------------------------------------------------------
// getChannel
// -----------------------------------------------------------------------------
async function getChannel(identity: string): Promise<string> {
  if (!identity) throw "no identity";

  const encoder = new TextEncoder();
  const encoded = encoder.encode(identity);
  const identityUUID = await uuid.generate(UUID_NAMESPACE, encoded);

  return `notification.${identityUUID}`;
}

// -----------------------------------------------------------------------------
// publishNotification
// -----------------------------------------------------------------------------
async function publishNotification(identityUUID: string, notification: string) {
  if (!identityUUID) throw "no identity uuid";

  const nc = await connect(NATS_SERVERS) as NatsConnection;
  nc.publish(`notification.${identityUUID}`, notification);
  nc.drain();
}

// -----------------------------------------------------------------------------
// publishCallAction
// -----------------------------------------------------------------------------
async function publishCallAction(callId: string, action: string) {
  if (!callId) throw "no call id";

  const nc = await connect(NATS_SERVERS) as NatsConnection;
  nc.publish(`call.${callId}`, action);
  nc.drain();
}

// -----------------------------------------------------------------------------
// createStream
// -----------------------------------------------------------------------------
function createStream(channel: string): ReadableStream {
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sub = nc.subscribe(channel);

      for await (const m of sub) {
        try {
          if (closed) {
            sub.unsubscribe();
            break;
          }

          // The coming message should be serialized JSON object.
          const msg = m.string();
          if (!msg) throw "invalid pub message";

          const encodedData = encoder.encode(`data: ${msg}\n\n`);
          controller.enqueue(encodedData);
        } catch (e) {
          console.error(e);
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return stream;
}

// -----------------------------------------------------------------------------
// callStream
// -----------------------------------------------------------------------------
function callStream(req: Request): Response {
  const url = new URL(req.url);
  const qs = new URLSearchParams(url.search);
  const callId = qs.get("id");
  if (!callId) return unauthorized();

  const channel = `call.${callId}`;
  const stream = createStream(channel);

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Credentials": "true",
  } as Headers;

  return new Response(stream, { headers });
}

// -----------------------------------------------------------------------------
// notificationStream
// -----------------------------------------------------------------------------
async function notificationStream(identity: string): Promise<Response> {
  const channel = await getChannel(identity);
  const stream = createStream(channel);

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Credentials": "true",
  } as Headers;

  return new Response(stream, { headers });
}

// -----------------------------------------------------------------------------
// addCall
// -----------------------------------------------------------------------------
async function addCall(req: Request, identity: string): Promise<Response> {
  if (!identity) return unauthorized();

  const pl = await req.json();
  const calleeId = pl.callee_id;

  const encoder = new TextEncoder();
  const encodedCalleeId = encoder.encode(calleeId);
  const calleeUUID = await uuid.generate(UUID_NAMESPACE, encodedCalleeId);
  const encodedCallId = encoder.encode(v1.generate());
  const callId = await uuid.generate(UUID_NAMESPACE, encodedCallId);
  const callUrl = `${MEETING_SERVER}/${callId}`;

  const data = {
    "type": "call",
    "call_id": callId,
    "call_url": callUrl,
    "caller_id": identity,
    "caller_name": identity,
  };
  const notification = JSON.stringify(data);

  await publishNotification(calleeUUID, notification);

  return new Response(notification, {
    status: 200,
  });
}

// -----------------------------------------------------------------------------
// ringCall
// -----------------------------------------------------------------------------
async function ringCall(req: Request): Promise<Response> {
  const pl = await req.json();
  const callId = pl.call_id;

  if (!callId) return unauthorized();

  const data = {
    "type": "ring",
  };
  const action = JSON.stringify(data);

  await publishCallAction(callId, action);

  return new Response(action, {
    status: 200,
  });
}

// -----------------------------------------------------------------------------
// stopCall
// -----------------------------------------------------------------------------
async function stopCall(req: Request): Promise<Response> {
  const pl = await req.json();
  const callId = pl.call_id;

  if (!callId) return unauthorized();

  const data = {
    "type": "stop",
  };
  const action = JSON.stringify(data);

  await publishCallAction(callId, action);

  return new Response(action, {
    status: 200,
  });
}

// -----------------------------------------------------------------------------
// handler
// -----------------------------------------------------------------------------
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Root is the only path accessible without authentication for healtcheck.
  if (path === `${PRE}`) {
    return ok("hello");
  }

  // Check identity for every request.
  const identity = await getIdentity(req);
  if (!identity) return unauthorized();

  if (req.method === "GET") {
    if (path === `${PRE}/call`) {
      return callStream(req);
    } else if (path === `${PRE}/notification`) {
      return await notificationStream(identity);
    } else {
      return notFound();
    }
  } else if (req.method === "POST") {
    if (path === `${PRE}/call/add`) {
      return await addCall(req, identity);
    } else if (path === `${PRE}/call/ring`) {
      return await ringCall(req);
    } else if (path === `${PRE}/call/stop`) {
      return await stopCall(req);
    } else {
      return notFound();
    }
  } else if (req.method === "OPTIONS") {
    return succeeded();
  } else {
    return methodNotAllowed();
  }
}

// -----------------------------------------------------------------------------
// intercomServer
// -----------------------------------------------------------------------------
function intercomServer() {
  Deno.serve({
    hostname: HTTP_HOSTNAME,
    port: HTTP_PORT,
  }, handler);
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
const nc = await connect(NATS_SERVERS) as NatsConnection;

intercomServer();

await nc.closed();