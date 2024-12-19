#!/bin/bash

USER1_UUID="809e1ece-5750-53df-bd27-922a8a8f4e4c"
CALL=$(cat <<EOF
{
  "id": "1234-abcd",
  "type": "call",
  "callee": "user3",
  "url": "https://meet.mydomain.com/some-room-name"
}
EOF
)

for i in $(seq 6); do
  nats -s "127.0.0.1" pub notification.$USER1_UUID "$CALL"
  sleep 1
done
