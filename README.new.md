# Hype-Hack1 Monorepo

A professional monorepo structure for Hyperliquid vault deployment with integrated deBridge cross-chain bridging and Pyth Network price feeds.

## 📁 Project Structure

```
packages/
├── web/                    # React + Vite frontend with trading UI
├── backend/                # Express API server
├── cli/                    # Command-line tools
├── shared/                 # Shared types and utilities
└── integrations/          
    ├── hyperliquid/       # Hyperliquid SDK integration
    ├── pyth/              # Pyth Network price feeds
    └── debridge/          # deBridge cross-chain bridging
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn 3.6.4+

### Installation
```bash
# Install dependencies
yarn install

# Copy environment template
cp .env.example .env

# Configure your .env file with necessary credentials
```

### Development
```bash
# Start everything (frontend + backend)
yarn dev

# Start only backend
yarn dev:backend

# Start only frontend
yarn dev:web

# Run specific integration
yarn workspace @hype/pyth dev
```

### Build
```bash
# Build all packages
yarn build

# Build specific package
yarn workspace @hype/web build
```

## 📦 Packages

### @hype/web
React-based trading interface with:
- Real-time price feeds from Pyth Network
- EVM chain information via deBridge
- Hyperliquid vault management UI
- Professional trading dashboard layout

### @hype/backend
Express server providing:
- `/api/stock-price` - Real-time stock prices
- `/api/evm-chains` - Supported EVM chains
- `/api/vault-info` - Hyperliquid vault details
- `/api/health` - Service health check

### @hype/cli
Command-line tools for:
- Vault deployment
- Price feed queries
- Chain information
- Token operations

### Integration Packages
- **@hype/hyperliquid** - Vault deployment and management
- **@hype/pyth** - Real-time price feed integration
- **@hype/debridge** - Cross-chain bridging operations

## 🔧 Configuration

### Environment Variables
```env
# Hyperliquid
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET_RPC_URL=https://testnet.hyperliquid.xyz/rpc
HYPERLIQUID_TESTNET_WS_URL=wss://testnet.hyperliquid.xyz/ws
HYPERLIQUID_VAULT_ADDRESS=0x...

# deBridge
DEBRIDGE_API_URL=https://api.dln.trade/v1.0
DEBRIDGE_API_KEY=optional

# Pyth Network
PYTH_PRICE_SERVICE_URL=https://hermes.pyth.network
PYTH_API_KEY=optional
```

## 🛠️ Architecture

### Monorepo Benefits
- **Separation of Concerns**: Each integration is isolated
- **Type Safety**: Shared types across packages
- **Independent Versioning**: Each package can evolve separately
- **Better Testing**: Test packages in isolation
- **Scalability**: Easy to add new integrations

### Technology Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express, TypeScript, Zod validation
- **Integrations**: Hyperliquid SDK, Pyth Network, deBridge API
- **Build Tools**: Yarn Workspaces, TypeScript, tsup

## 📝 Scripts

### Root Level
- `yarn dev` - Start all development servers
- `yarn build` - Build all packages
- `yarn lint` - Lint all packages
- `yarn clean` - Clean all build artifacts

### Package Level
```bash
# Run command in specific workspace
yarn workspace @hype/backend <command>

# Examples
yarn workspace @hype/web dev
yarn workspace @hype/cli build
```

## 🔗 API Integration

The frontend automatically proxies API calls to the backend:
- Development: Vite proxy configuration
- Production: Configure reverse proxy (nginx/caddy)

## 🚢 Deployment

### Frontend
```bash
yarn workspace @hype/web build
# Deploy dist folder to CDN/static hosting
```

### Backend
```bash
yarn workspace @hype/backend build
# Deploy with PM2/Docker/Kubernetes
```

## 📚 Documentation

- [Frontend Components](packages/web/README.md)
- [Backend API](packages/backend/README.md)
- [CLI Usage](packages/cli/README.md)
- [Integration Guides](packages/integrations/README.md)

## 🤝 Contributing

1. Create feature branch
2. Make changes in relevant packages
3. Test locally with `yarn dev`
4. Submit pull request

## 📄 License

ISC