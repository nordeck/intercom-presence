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
// add
// -----------------------------------------------------------------------------
async function add(req: Request): Promise<Response> {
  const pl = await req.json();
  const callerId = pl.caller_id;
  const callerName = pl.caller_name;
  const calleeId = pl.callee_id;

  if (!callerId) return unauthorized();

  const encoder = new TextEncoder();
  const callerEncodedId = encoder.encode(callerId);
  const callerUuid = await uuid.generate(UUID_NAMESPACE, callerEncodedId);
  const calleeEncodedId = encoder.encode(calleeId);
  const calleeUuid = await uuid.generate(UUID_NAMESPACE, calleeEncodedId);

  const headers = {} as Headers;
  if (CORS_ORIGIN) headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;

  const body = {
    "type": "call",
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers,
  });
}

// -----------------------------------------------------------------------------
// call
// -----------------------------------------------------------------------------
async function call(req: Request, path: string): Promise<Response> {
  if (path === `${PRE}/call/add`) {
    return await add(req);
  } else {
    return notFound();
  }
}

// -----------------------------------------------------------------------------
// handler
// -----------------------------------------------------------------------------
async function handler(req: Request): Promise<Response> {
  // check method
  if (req.method !== "POST") {
    return methodNotAllowed();
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (path.match(`^${PRE}/call/`)) {
    return await call(req, path);
  } else {
    return notFound();
  }
}

// -----------------------------------------------------------------------------
// messageServer
// -----------------------------------------------------------------------------
function messageServer() {
  Deno.serve({
    hostname: HTTP_HOSTNAME,
    port: HTTP_PORT,
  }, handler);
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
const nc = await connect(NATS_SERVERS) as NatsConnection;

messageServer();

await nc.closed();
