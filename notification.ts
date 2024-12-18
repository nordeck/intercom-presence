import { v5 as uuid } from "jsr:@std/uuid@^1.0.0";
import { connect } from "jsr:@nats-io/transport-deno@3.0.0-18";
import type { NatsConnection } from "jsr:@nats-io/nats-core@3.0.0-46";

const NATS_SERVERS = { servers: "127.0.0.1:4222" };
const HTTP_HOSTNAME = "0.0.0.0";
const HTTP_PORT = 8000;
const PRE = "/intercom";
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

// -----------------------------------------------------------------------------
export function methodNotAllowed(): Response {
  const body = {
    error: {
      message: "Method Not Allowed",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 405,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// -----------------------------------------------------------------------------
export function notFound(): Response {
  const body = {
    error: {
      message: "Not Found",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// -----------------------------------------------------------------------------
export function unauthorized(): Response {
  const body = {
    error: {
      message: "Unauthorized",
    },
  };

  return new Response(JSON.stringify(body), {
    status: 401,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// -----------------------------------------------------------------------------
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
function createStream(channel: string): ReadableStream {
  console.log(channel);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sub = nc.subscribe(channel);

      for await (const m of sub) {
        try {
          console.log(m);
          const data = encoder.encode(`data: coming message\n\n`);
          controller.enqueue(data);
        } catch (e) {
          console.error(e);
        }
      }
    },
    cancel() {
      console.log("cancelled");
    },
  });

  return stream;
}

// -----------------------------------------------------------------------------
async function notification(req: Request): Promise<Response> {
  const channel = await getChannel(req);
  if (!channel) return unauthorized();

  const stream = createStream(channel);
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  };

  return new Response(stream, { headers });
}

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
function sseServer() {
  Deno.serve({
    hostname: HTTP_HOSTNAME,
    port: HTTP_PORT,
  }, handler);
}

// -----------------------------------------------------------------------------
const nc = await connect(NATS_SERVERS) as NatsConnection;

sseServer();

await nc.closed();
