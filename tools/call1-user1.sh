#!/bin/bash

# ------------------------------------------------------------------------------
# user2 is calling user1.
# ------------------------------------------------------------------------------

MESSAGE_SERVER="http://127.0.0.1:8002"
CALL_ENDPOINT="$MESSAGE_SERVER/intercom/call/add"
RING_ENDPOINT="$MESSAGE_SERVER/intercom/call/ring"

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

RES=$(curl -s -X POST $CALL_ENDPOINT \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --data "$CALL")
echo $RES | jq .

CALL_ID=$(echo $RES | jq -r .call_id)

RING=$(cat <<EOF
{
  "call_id": "$CALL_ID"
}
EOF
)

for i in $(seq 10); do
  RES=$(curl -s -X POST $RING_ENDPOINT \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    --data "$RING")
  echo $RES | jq .
  sleep 1
done
