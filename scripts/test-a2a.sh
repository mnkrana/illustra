#!/bin/bash
set -e
echo "=== A2A Invoke Test ==="
curl -s -X POST http://localhost:8080/a2a/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "A cute dog wearing a space helmet"}]
      }
    }
  }' | jq .