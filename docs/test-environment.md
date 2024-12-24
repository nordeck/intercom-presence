# Test environment

This guide is about creating a local test environment which is integrated with
the nightly deployment.

## Components from nightly deployment

The following components will be on the nightly deployment. So, there is nothing
to do for them in the local environment:

- https://portal.nightly.opendesk.qa
- https://ics.nightly.opendesk.qa
- https://id.nightly.opendesk.qa

Log in as `Administrator` and create a test user.

## Local components

The following components will be on the local environment:

- https://myapp.nightly.opendesk.qa
- https://myics.nightly.opendesk.qa

These will be behind an Nginx proxy. So, create local DNS records for them which
point the reverse proxy. For example:

- myapp.nightly.opendesk.qa -> 172.18.18.40
- myics.nightly.opendesk.qa -> 172.18.18.40

## Sample Nginx config

### myapp.nightly.opendesk.qa

```config
server {
  listen 443 ssl;
  listen [::]:443 ssl;

  include snippets/snakeoil.conf;
  server_name myapp.nightly.opendesk.qa;

  root /var/www/myapp;

  index index.html;

  location / {
    try_files $uri $uri/ =404;
  }
}
```

`/var/www/myapp` folder contains files which are in [ui](../ui).

### myics.nightly.opendesk.qa

```config
server {
  listen 443 ssl;
  listen [::]:443 ssl;

  include snippets/snakeoil.conf;
  server_name myics.nightly.opendesk.qa;

  location / {
    proxy_pass http://172.18.18.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "";
    tcp_nodelay on;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    keepalive_timeout 3600s;
  }
}
```

This is a proxy for [Stream server](../stream.ts).

## NATS server

Start the NATS server in the local host:

```bash
nats-server
```

## Stream server

Start the stream server in the local host:

```bash
deno run --allow-net --watch stream.ts
```

## Message server

Start the message server in the local host:

```bash
deno run --allow-net --watch message.ts
```
