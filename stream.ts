import { v5 as uuid } from "jsr:@std/uuid@^1.0.0";
import { connect } from "jsr:@nats-io/transport-deno@3.0.0-18";
import type { NatsConnection } from "jsr:@nats-io/nats-core@3.0.0-46";

// -----------------------------------------------------------------------------
// Globals
// -----------------------------------------------------------------------------
const NATS_SERVERS = { servers: "127.0.0.1:4222" };
const HTTP_HOSTNAME = "0.0.0.0";
const HTTP_PORT = 8001;
const PRE = "/intercom";
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const CORS_ORIGIN = "*";

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

  const headers = {} as Headers;
  if (CORS_ORIGIN) headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;

  return new Response(JSON.stringify(body), {
    status: 405,
    headers,
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

  const headers = {} as Headers;
  if (CORS_ORIGIN) headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;

  return new Response(JSON.stringify(body), {
    status: 404,
    headers,
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

  const headers = {} as Headers;
  if (CORS_ORIGIN) headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;

  return new Response(JSON.stringify(body), {
    status: 401,
    headers,
  });
}

// -----------------------------------------------------------------------------
// getChannel
//
// It returns the hardcoded pub channel for now. Auth checking will be added.
// -----------------------------------------------------------------------------
async function getChannel(req: Request): Promise<string> {
  const url = new URL(req.url);
  const qs = new URLSearchParams(url.search);
  const user = qs.get("user");
  if (!user) throw "no user";

  const encoder = new TextEncoder();

  if (user === "user1") {
    const id = encoder.encode("f:d704f61d-fade-4641-b03a-1f211206c5b6:user1");
    const userUuid = await uuid.generate(UUID_NAMESPACE, id);
    return `notification.${userUuid}`;
  } else if (user === "user2") {
    const id = encoder.encode("f:d704f61d-fade-4641-b03a-1f211206c5b6:user2");
    const userUuid = await uuid.generate(UUID_NAMESPACE, id);
    return `notification.${userUuid}`;
  } else {
    throw "invalid user";
  }
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
// notification
// -----------------------------------------------------------------------------
async function notification(req: Request): Promise<Response> {
  const channel = await getChannel(req);
  if (!channel) return unauthorized();

  const stream = createStream(channel);

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  } as Headers;
  if (CORS_ORIGIN) headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;

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

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === `${PRE}/notification`) {
    return await notification(req);
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
