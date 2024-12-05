import { v5 as uuid } from "jsr:@std/uuid@^1.0.0";
import { connect } from "jsr:@nats-io/transport-deno@3.0.0-18";
import type { NatsConnection } from "jsr:@nats-io/nats-core@3.0.0-46";

const SERVERS = { servers: "127.0.0.1:4222" };
const ONLINE_TIMEOUT_SECONDS = 120;
const EXIST_TIMEOUT_SECONDS = 30 * 24 * 60 * 60;
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

interface UserInfo {
  sub: string;
  presenceEpoch: number;
  presenceDate: string;
  presenceVisible: boolean;
  statusVisible: boolean;
  [key: string]: unknown;
}

const usersAll = new Map<string, UserInfo>();

// -----------------------------------------------------------------------------
// subPresenceUpdate: Add or update (if already exists) the user's info.
// -----------------------------------------------------------------------------
async function subPresenceUpdate(nc: NatsConnection) {
  const sub = nc.subscribe("presence.update");

  for await (const m of sub) {
    try {
      const userInfo = JSON.parse(m.string()) as UserInfo;
      if (!userInfo?.sub) throw "not valid userInfo";

      const presenceSub = new TextEncoder().encode(userInfo.sub);
      const presenceId = await uuid.generate(UUID_NAMESPACE, presenceSub);

      const time = new Date();
      userInfo.presenceEpoch = time.getTime();
      userInfo.presenceTime = time.toISOString();

      if (userInfo.presenceVisible === undefined) {
        userInfo.presenceVisible = true;
      }

      if (userInfo.statusVisible === undefined) {
        userInfo.statusVisible = true;
      }

      usersAll.set(presenceId, userInfo);
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// subPresencePing: Update the last seen value of the user.
// -----------------------------------------------------------------------------
async function subPresencePing(nc: NatsConnection) {
  const sub = nc.subscribe("presence.ping");

  for await (const m of sub) {
    try {
      if (!m.string()) throw "not valid key";

      const presenceSub = new TextEncoder().encode(m.string());
      const presenceId = await uuid.generate(UUID_NAMESPACE, presenceSub);
      const userInfo = usersAll.get(presenceId);

      if (userInfo) {
        const time = new Date();
        userInfo.presenceEpoch = time.getTime();
        userInfo.presenceTime = time.toISOString();

        usersAll.set(presenceId, userInfo);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// presenceVisibility
// -----------------------------------------------------------------------------
async function presenceVisibility(
  nc: NatsConnection,
  subject: string,
  value: boolean,
) {
  const sub = nc.subscribe(subject);

  for await (const m of sub) {
    try {
      if (!m.string()) throw "not valid key";

      const presenceSub = new TextEncoder().encode(m.string());
      const presenceId = await uuid.generate(UUID_NAMESPACE, presenceSub);
      const userInfo = usersAll.get(presenceId);

      if (userInfo) {
        userInfo.presenceVisible = value;
        usersAll.set(presenceId, userInfo);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// subPresenceHide: Hide the user, unset presenceVisible
// -----------------------------------------------------------------------------
async function subPresenceHide(nc: NatsConnection) {
  await presenceVisibility(nc, "presence.hide", false);
}

// -----------------------------------------------------------------------------
// subPresenceUnhide: Unhide the user, set presenceVisible
// -----------------------------------------------------------------------------
async function subPresenceUnhide(nc: NatsConnection) {
  await presenceVisibility(nc, "presence.unhide", true);
}

// -----------------------------------------------------------------------------
// statusVisibility
// -----------------------------------------------------------------------------
async function statusVisibility(
  nc: NatsConnection,
  subject: string,
  value: boolean,
) {
  const sub = nc.subscribe(subject);

  for await (const m of sub) {
    try {
      if (!m.string()) throw "not valid key";

      const presenceSub = new TextEncoder().encode(m.string());
      const presenceId = await uuid.generate(UUID_NAMESPACE, presenceSub);
      const userInfo = usersAll.get(presenceId);

      if (userInfo) {
        userInfo.statusVisible = value;
        usersAll.set(presenceId, userInfo);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// subStatusHide: Hide the user status, unset statusVisible
// -----------------------------------------------------------------------------
async function subStatusHide(nc: NatsConnection) {
  await statusVisibility(nc, "presence.hide_status", false);
}

// -----------------------------------------------------------------------------
// subStatusUnhide: Unhide the user status, set statusVisible
// -----------------------------------------------------------------------------
async function subStatusUnhide(nc: NatsConnection) {
  await statusVisibility(nc, "presence.unhide_status", true);
}

// -----------------------------------------------------------------------------
// replyPresenceAll: Return the list of all users.
// -----------------------------------------------------------------------------
async function replyPresenceAll(nc: NatsConnection) {
  const sub = nc.subscribe("presence.all");

  for await (const m of sub) {
    try {
      const users = [] as UserInfo[];

      let lastSeenSecond = Date.now() - EXIST_TIMEOUT_SECONDS * 1000;
      const input = m.string();
      if (input && input.match(/^\d+$/)) {
        lastSeenSecond = Date.now() - Number(input) * 1000;
      }

      usersAll.forEach((user, _k) => {
        if (
          user.presenceVisible &&
          user.presenceEpoch > lastSeenSecond
        ) {
          users.push(user);
        }
      });

      m.respond(JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// replyPresenceOnline: Return the list of online users.
// -----------------------------------------------------------------------------
async function replyPresenceOnline(nc: NatsConnection) {
  const sub = nc.subscribe("presence.online");

  for await (const m of sub) {
    try {
      const users = [] as UserInfo[];

      let lastSeenSecond = Date.now() - ONLINE_TIMEOUT_SECONDS * 1000;
      const input = m.string();
      if (input && input.match(/^\d+$/)) {
        lastSeenSecond = Date.now() - Number(input) * 1000;
      }

      usersAll.forEach((user, _k) => {
        if (
          user.presenceVisible && user.statusVisible &&
          user.presenceEpoch > lastSeenSecond
        ) {
          users.push(user);
        }
      });

      m.respond(JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// replyPresenceWhoami: Return the user info of a specific user.
// -----------------------------------------------------------------------------
async function replyPresenceWhoami(nc: NatsConnection) {
  const sub = nc.subscribe("presence.whoami");

  for await (const m of sub) {
    try {
      if (!m.string()) throw "not valid key";

      const presenceSub = new TextEncoder().encode(m.string());
      const presenceId = await uuid.generate(UUID_NAMESPACE, presenceSub);

      m.respond(JSON.stringify(usersAll.get(presenceId)));
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// replyPresenceIsOnline: Return the online status of a specific user.
// -----------------------------------------------------------------------------
async function replyPresenceIsOnline(nc: NatsConnection) {
  const sub = nc.subscribe("presence.isonline");

  for await (const m of sub) {
    try {
      if (!m.string()) throw "not valid key";

      const presenceSub = new TextEncoder().encode(m.string());
      const presenceId = await uuid.generate(UUID_NAMESPACE, presenceSub);
      const lastSeenSecond = Date.now() - ONLINE_TIMEOUT_SECONDS * 1000;
      const userInfo = usersAll.get(presenceId);

      if (
        userInfo && userInfo.presenceVisible && userInfo.statusVisible &&
        userInfo.presenceEpoch > lastSeenSecond
      ) {
        m.respond(JSON.stringify(true));
        continue;
      }

      m.respond(JSON.stringify(false));
    } catch (e) {
      console.error(e);
    }
  }
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
const nc = await connect(SERVERS);

subPresenceUpdate(nc);
subPresencePing(nc);
subPresenceHide(nc);
subPresenceUnhide(nc);
subStatusHide(nc);
subStatusUnhide(nc);
replyPresenceAll(nc);
replyPresenceOnline(nc);
replyPresenceWhoami(nc);
replyPresenceIsOnline(nc);

await nc.closed();
