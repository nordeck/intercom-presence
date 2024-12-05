# Presence service with NATS

## NATS server

Open https://github.com/nats-io/nats-server/releases/latest and download the
matching package. e.g. `nats-server-v2.10.22-linux-amd64.zip` into `/tmp`.

```bash
cd /tmp
unzip nats-server-v2.10.22-linux-amd64.zip
cp /tmp/nats-server-v2.10.22-linux-amd64/nats-server ~/bin/
```

To run:

```bash
nats-server
```

## Deno

As root

```bash
cd /tmp
wget -O deno.zip https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip
unzip deno.zip
./deno --version

cp /tmp/deno /usr/local/bin/
deno --version
```

## Presence service

In this directory:

```bash
deno --allow-net presence.ts
```

## NATS CLI

Open https://github.com/nats-io/natscli/releases/latest and download the
matching package. e.g. `nats-0.1.5-linux-amd64.zip` into `/tmp`

```bash
cd /tmp
unzip nats-0.1.5-linux-amd64.zip
cp /tmp/nats-0.1.5-linux-amd64/nats ~/bin/
```

## Testing

```bash
USER1_KEYCLOAK_SUB="f:d704f61d-fade-4641-b03a-1f211206c5b6:user1"
USER2_KEYCLOAK_SUB="f:d704f61d-fade-4641-b03a-1f211206c5b6:user2"
USER3_KEYCLOAK_SUB="f:d704f61d-fade-4641-b03a-1f211206c5b6:user3"

USER1_KEYCLOAK_USERINFO=$(cat <<EOF
{
  "sub": "$USER1_KEYCLOAK_SUB",
  "email_verified": true,
  "preferred_username": "user1",
  "email": "user1@example.com"
}
EOF
)

USER2_KEYCLOAK_USERINFO=$(cat <<EOF
{
  "sub": "$USER2_KEYCLOAK_SUB",
  "email_verified": false,
  "preferred_username": "user2",
  "email": "user2@example.net",
  "statusVisible": false
}
EOF
)

USER3_KEYCLOAK_USERINFO=$(cat <<EOF
{
  "sub": "$USER3_KEYCLOAK_SUB",
  "email_verified": false,
  "preferred_username": "user3",
  "email": "user3@example.org",
  "presenceVisible": false
}
EOF
)

nats -s "127.0.0.1" pub presence.update "$USER1_KEYCLOAK_USERINFO"
nats -s "127.0.0.1" pub presence.update "$USER2_KEYCLOAK_USERINFO"

nats -s "127.0.0.1" req presence.all ""
nats -s "127.0.0.1" req presence.online ""
nats -s "127.0.0.1" req presence.online "30"

nats -s "127.0.0.1" req presence.whoami "$USER1_KEYCLOAK_SUB"
nats -s "127.0.0.1" req presence.whoami "$USER2_KEYCLOAK_SUB"
nats -s "127.0.0.1" req presence.isonline "$USER1_KEYCLOAK_SUB"
nats -s "127.0.0.1" req presence.isonline "$USER2_KEYCLOAK_SUB"

nats -s "127.0.0.1" pub presence.ping "$USER1_KEYCLOAK_SUB"
nats -s "127.0.0.1" pub presence.ping "$USER2_KEYCLOAK_SUB"
```

## Links

- https://github.com/nats-io/nats-server/releases/latest
- https://github.com/nats-io/natscli/releases/latest
- https://github.com/nats-io/nats.js/
- https://examples.nats.io/examples/messaging/pub-sub/deno
