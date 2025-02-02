# Test environment

This guide is about creating a local test environment which is integrated with
the nightly deployment.

Possible nightly deployments:

- *.nightly.opendesk.qa
- *.nightly.opendesk.run

## Components from nightly deployment

The following components will be on the nightly deployment. So, there is nothing
to do for them in the local environment:

- https://id.nightly.opendesk.run
- https://ics.nightly.opendesk.run (_this will be behind a local reverse proxy_)
- https://portal.nightly.opendesk.run

Log in the portal as `Administrator` and create a few test users.

## Local components

The following components will be on the local environment:

- https://ics.nightly.opendesk.run (_as reverse proxy_)
- https://myapp.nightly.opendesk.run
- https://notes.nightly.opendesk.run (_optional for demo_)

These will be behind an Nginx proxy. So, create local DNS records for them which
point to the reverse proxy. For example:

- ics.nightly.opendesk.run -> 172.18.18.40
- myapp.nightly.opendesk.run -> 172.18.18.40
- notes.nightly.opendesk.run -> 172.18.18.40 (_optional for demo_)

## Sample Nginx config

### myapp.nightly.opendesk.run

```config
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;

  include snippets/snakeoil.conf;

  # notes is optional only for demo
  server_name
    myapp.nightly.opendesk.run
    notes.nightly.opendesk.run;

  root /var/www/myapp;

  index index.html;

  location / {
    try_files $uri $uri/ =404;

    add_header "Access-Control-Allow-Origin" $http_origin always;
    add_header "Cache-Control" "no-store, must-revalidate";
    add_header "Expires" "0";
  }
}
```

`/var/www/myapp` folder contains files which are in [ui](../ui).

### ics.nightly.opendesk.run

There is a local reverse proxy for this domain because we want to run our
additional ICS endpoints on the same domain to get credentials. ICS's session
cookie will be used to get and validate the user.

```config
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;

  include snippets/snakeoil.conf;
  server_name ics.nightly.opendesk.run;

  location /intercom/ {
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

    add_header "Access-Control-Allow-Origin" $http_origin always;
    add_header "Cache-Control" "no-store, must-revalidate";
    add_header "Expires" "0";
  }

  location / {
    proxy_pass https://<IP_ADDRESS_OF_NIGHTLY>;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```

This is a proxy for [Intercom service](../intercom.ts) and for openDesk's ICS.

## NATS server

Start the NATS server on the local host:

```bash
nats-server
```

## Intercom service

Start the intercom service on the local host:

```bash
deno run --allow-net --unsafely-ignore-certificate-errors --watch intercom.ts
```

## Enabling the notification channel for other applications

Open an openDesk application and run the following command in the browser
console:

```javascript
import("https://myapp.nightly.opendesk.run/notification.js");
```

This page will subscribe to the notification channel and will receive calls,
notifications, etc.

The manual import is only for testing. This module should be added to the source
code.
