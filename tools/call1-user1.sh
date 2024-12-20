#!/bin/bash

# ------------------------------------------------------------------------------
# user2 is calling user1.
# ------------------------------------------------------------------------------

MESSAGE_SERVER="http://127.0.0.1:8002"
MESSAGE_ENDPOINT="$MESSAGE_SERVER/intercom/call/add"

CALLER_NAME="user2"
CALLER_KEYCLOAK_SUB="f:d704f61d-fade-4641-b03a-1f211206c5b6:user2"
CALLEE_KEYCLOAK_SUB="f:d704f61d-fade-4641-b03a-1f211206c5b6:user1"

CALL=$(cat <<EOF
{
  "caller_id": "$CALLER_KEYCLOAK_SUB",
  "caller_name": "$CALLER_NAME",
  "callee_id": "$CALLEE_KEYCLOAK_SUB"
}
EOF
)

curl -s -X POST $MESSAGE_ENDPOINT \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    --data "$CALL"

#for i in $(seq 6); do
#  nats -s "127.0.0.1" pub notification.$USER1_UUID "$CALL"
#  sleep 1
#done
