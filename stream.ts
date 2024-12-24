import { v5 as uuid } from "jsr:@std/uuid@^1.0.0";
import { connect } from "jsr:@nats-io/transport-deno@3.0.0-18";
import type { NatsConnection } from "jsr:@nats-io/nats-core@3.0.0-46";

// -----------------------------------------------------------------------------
// Globals
// -----------------------------------------------------------------------------
const ICS_SERVER = "https://ics.nightly.opendesk.qa";
const NATS_SERVERS = { servers: "127.0.0.1:4222" };
const HTTP_HOSTNAME = "0.0.0.0";
const HTTP_PORT = 8001;
const PRE = "/intercom";
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

interface Headers {
  [key: string]: string;
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
    return undefined;
  }
}

// -----------------------------------------------------------------------------
// getChannel
// -----------------------------------------------------------------------------
async function getChannel(identity: string): Promise<string> {
  if (!identity) throw "no identity";

  const encoder = new TextEncoder();
  const encoded = encoder.encode(identity);
  const identityUuid = await uuid.generate(UUID_NAMESPACE, encoded);

  return `notification.${identityUuid}`;
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

          const eventData = encoder.encode(`data: ${msg}\n\n`);
          controller.enqueue(eventData);
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
// call
// -----------------------------------------------------------------------------
function call(req: Request): Response {
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
// notification
// -----------------------------------------------------------------------------
async function notification(req: Request, identity: string): Promise<Response> {
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
// handler
// -----------------------------------------------------------------------------
async function handler(req: Request): Promise<Response> {
  // check method
  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  // Check identity.
  const identity = await getIdentity(req);
  if (!identity) return unauthorized();

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === `${PRE}/call`) {
    return call(req);
  } else if (path === `${PRE}/notification`) {
    return await notification(req, identity);
  } else {
    return notFound();
  }
}

// -----------------------------------------------------------------------------
// streamServer
// -----------------------------------------------------------------------------
function streamServer() {
  Deno.serve({
    hostname: HTTP_HOSTNAME,
    port: HTTP_PORT,
  }, handler);
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
const nc = await connect(NATS_SERVERS) as NatsConnection;

streamServer();

await nc.closed();
