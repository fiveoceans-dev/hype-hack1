# Deploy to Heroku with Docker

This repo is configured to run as a single Dockerized Node app on Heroku.

## What’s included
- Express API server at `dist/web/server.js` (built from `src/web/server.ts`).
- Static frontend:
  - Vite app from `aesthetic-template-kit` is built during Docker image creation and copied to `/app/static`.
  - The server serves static files from `UI_DIR` (defaults to `/app/static`), falling back to `/public`.
- Integrations:
  - Pyth Hermes HTTP client, deBridge REST calls, Hyperliquid config stub.

## Prerequisites
- Heroku CLI installed and logged in.
- Docker installed and running.

## One-time Heroku setup
```bash
heroku create <app-name>
heroku stack:set container -a <app-name>
```

## Build & run locally (optional)
```bash
# Build the image
docker build -t hype-app .

# Run locally
docker run -e PORT=3000 -p 3000:3000 hype-app

# Test
curl http://localhost:3000/api/health
```

## Deploy to Heroku
```bash
heroku container:login
heroku container:push web -a <app-name>
heroku container:release web -a <app-name>
```

## Configure environment variables (recommended)
```bash
heroku config:set \
  HYPERLIQUID_PRIVATE_KEY=0x... \
  HYPERLIQUID_TESTNET_RPC_URL=https://testnet.hyperliquid.xyz/rpc \
  HYPERLIQUID_TESTNET_WS_URL=wss://testnet.hyperliquid.xyz/ws \
  HYPERLIQUID_VAULT_ADDRESS=0x... \
  DEBRIDGE_API_URL=https://api.dln.trade/v1.0 \
  DEBRIDGE_API_KEY=your_key \
  PYTH_PRICE_SERVICE_URL=https://hermes.pyth.network \
  PYTH_API_KEY=your_key \
  -a <app-name>
```

## Endpoints
- `/` → Serves built frontend (Vite) or `public/index.html` if UI_DIR not set.
- `/api/stock-price` → Tesla via Pyth Hermes (demo fallback).
- `/api/evm-chains` → deBridge supported chains (demo fallback).
- `/api/vault-info` → Hyperliquid config summary.
- `/api/health` → Health check.

## Notes
- The Dockerfile uses multi-stage build to produce both the server bundle and the frontend build.
- The server supports SPA fallback for non-API routes.
- If you only want the static `public/` dashboard, remove the frontend build stage and unset `UI_DIR`.

