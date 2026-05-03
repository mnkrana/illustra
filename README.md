# Illustra

AI image generation monorepo with an A2A-compatible agent and a web UI.

```
User → Illustra UI (Express + Tailwind)
         ↓ /api/generate
       Illustra Agent (LangChain + Gemini)
         ↓ tool call
       Stability AI (image generation)
         ↓ upload
       GCS Bucket → Public URL
```

## Packages

| Package | Description | Port |
|---------|-------------|------|
| [`@illustra/agent`](./agent) | LangChain + Gemini agent with Stability AI image generation via A2A protocol | 8080 |
| [`@illustra/ui`](./ui) | Express + Tailwind web interface that proxies requests to the agent | 3000 |

## Prerequisites

- [Bun](https://bun.sh) runtime
- Google Cloud project with GCS bucket
- Stability AI API key
- Google Gemini API key

## Quick Start

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up environment variables**:

   Agent (`agent/.env`):
   ```env
   GOOGLE_API_KEY=your_gemini_api_key
   STABILITY_KEY=your_stability_api_key
   GCS_BUCKET_NAME=illustra
   PORT=8080
   ```

   UI (`ui/.env`):
   ```env
   PORT=3000
   AGENT_URL=http://localhost:8080
   ```

3. **Run both services**:
   ```bash
   bun dev
   ```

   Or run individually:
   ```bash
   bun dev:agent   # starts agent on :8080
   bun dev:ui      # starts ui on :3000
   ```

## Development

```bash
bun dev              # run both services concurrently
bun dev:agent        # run agent only
bun dev:ui           # run UI only
bun check            # lint + typecheck all packages
bun check:agent      # lint + typecheck agent
bun check:ui         # lint + typecheck UI
```

## Agent API

- `GET /health` - Health check
- `GET /.well-known/agent-card.json` - A2A Agent Card discovery
- `POST /a2a/invoke` - A2A JSON-RPC endpoint

### Example: Generate Image

```bash
curl -X POST http://localhost:8080/a2a/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "A cute cat"}]
      }
    }
  }'
```

Response (A2UI format):
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "role": "assistant",
    "parts": [{
      "kind": "data",
      "data": {
        "type": "Image",
        "props": {
          "url": "https://storage.googleapis.com/illustra/images/1234567890.png",
          "alt": "A cute cat"
        }
      }
    }],
    "messageId": "uuid"
  }
}
```

## Environment Variables

### Agent (`@illustra/agent`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `STABILITY_KEY` | Yes | Stability AI API key |
| `GCS_BUCKET_NAME` | Yes | GCS bucket for image storage |
| `PORT` | No | Server port (default: 8080) |

### UI (`@illustra/ui`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `AGENT_URL` | No | Agent endpoint (default: http://localhost:8080) |

## Deployment

### Agent

```bash
cd agent
gcloud run deploy illustra-agent \
  --source . \
  --region asia-south1 \
  --port 8080 \
  --timeout=300 \
  --allow-unauthenticated \
  --set-env-vars="GCS_BUCKET_NAME=illustra" \
  --set-secrets="GOOGLE_API_KEY=gemini-api-key:latest,STABILITY_KEY=stability-api-key:latest"
```

### UI

```bash
cd ui
gcloud run deploy illustra-ui \
  --source . \
  --region asia-south1 \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars="AGENT_URL=https://illustra-agent-xxxxx.a.run.app"
```

## Project Structure

```
illustra/
├── agent/
│   ├── src/
│   │   ├── main.ts                     # Entry point
│   │   ├── a2a/
│   │   │   └── server.ts              # A2A server with CORS
│   │   ├── agent/
│   │   │   ├── illustra_agent.ts      # LangChain agent
│   │   │   └── tools/
│   │   │       └── stability_tool.ts  # Stability AI tool
│   │   ├── config/
│   │   │   └── env.ts                 # Environment variables
│   │   └── utils/
│   │       ├── a2ui.ts                # A2UI helpers
│   │       └── storage.ts             # GCS upload utility
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── ui/
│   ├── src/
│   │   ├── index.ts                   # Express server entry
│   │   └── a2a/
│   │       └── client.ts              # A2A proxy routes
│   ├── public/
│   │   └── index.html                 # Tailwind CSS SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── scripts/
│   ├── test.sh                        # Health check + agent card test
│   └── test-a2a.sh                    # A2A invoke test
├── package.json                       # Root workspace config
├── biome.json                         # Linting/formatting
├── commitlint.config.js               # Commit message conventions
├── Makefile                           # Build/deploy targets
└── .gitignore
```

## License

MIT
