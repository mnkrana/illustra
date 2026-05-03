#!/bin/bash
set -e
echo "=== Health Check ==="
curl -s http://localhost:8080/health | jq .
echo -e "\n=== Agent Card ==="
curl -s http://localhost:8080/.well-known/agent-card.json | jq .