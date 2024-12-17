const HOSTNAME = "0.0.0.0";
const PORT = 8000;
const PRE = "/intercom";

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
function createStream(): ReadableStream {
  const stream = new ReadableStream({
    start(controller) {
      setInterval(() => {
        const encoder = new TextEncoder();
        const data = encoder.encode("data: hello\n\n");
        controller.enqueue(data);
      }, 3000);
    },
    cancel(reason) {
      console.log(reason);
    },
  });

  return stream;
}

// -----------------------------------------------------------------------------
function notification(): Response {
  const stream = createStream();
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  return new Response(stream, { headers });
}

// -----------------------------------------------------------------------------
function handler(req: Request): Response {
  // check method
  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === `${PRE}/notification`) {
    return notification();
  } else {
    return notFound();
  }
}

// -----------------------------------------------------------------------------
function main() {
  Deno.serve({
    hostname: HOSTNAME,
    port: PORT,
  }, handler);
}

// -----------------------------------------------------------------------------
main();
