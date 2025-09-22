# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Essential Commands

### Development Workflow
- `yarn dev` - Start development server with auto-reload using ts-node-dev
- `yarn build` - Build production bundle using tsup with minification and source maps
- `yarn start` - Run the production build from `dist/index.js`

### Code Quality
- `yarn lint` - Run ESLint checks on TypeScript code
- `yarn lint:fix` - Auto-fix ESLint issues where possible
- `yarn format` - Format code using Prettier with project configuration

### Hyperliquid Deployment
- `yarn deploy:hyperliquid` - Deploy vault contracts to Hyperliquid testnet with environment validation

### deBridge Cross-Chain Operations
- `yarn debridge:quote` - Get cross-chain bridging quotes and supported chains overview
- `yarn debridge:chains` - List all supported blockchain networks for bridging
- `yarn debridge:tokens` - Display available tokens for cross-chain transfers

### Pyth Network Price Feeds
- `yarn pyth:prices` - Fetch real-time prices for common cryptocurrencies (BTC, ETH, USDC)
- `yarn pyth:search` - Search for available price feeds by keyword
- `yarn pyth:list` - List all available price feeds grouped by asset type
- Direct CLI: `yarn dev pyth:price <price-feed-id>` - Get specific price data by feed ID

## Architecture Overview

This is a specialized CLI tool for deploying vault contracts to the Hyperliquid testnet with integrated cross-chain bridging and price feed capabilities. The project employs a defensive programming approach with robust SDK fallback mechanisms and comprehensive error handling for blockchain deployment scenarios.

The tool now supports three main operational areas:
1. **Hyperliquid Vault Deployment** - Core vault contract deployment functionality
2. **deBridge Cross-Chain Bridging** - EVM-focused bridging operations using REST APIs
3. **Pyth Network Price Feeds** - Real-time price data from 125+ institutional publishers

### Key Design Principles
- **Defensive SDK Integration**: Multiple instantiation strategies to handle various SDK versions and configurations
- **Environment-First Configuration**: Zod schemas provide runtime type safety and validation for blockchain credentials
- **Command-Driven Architecture**: Pluggable command handlers enable easy extensibility for new deployment targets
- **Automatic Method Discovery**: Deployment system tries multiple method signatures to maximize SDK compatibility

## Core Components

### Main Entry Point
- `src/index.ts` - CLI entry point with command routing and error handling. Maps commands to handlers and provides consistent error reporting.

### Configuration Management
- `src/config/hyperliquid.ts` - Zod validation schemas for Hyperliquid environment variables. Validates private keys, URLs, and addresses at startup with helpful error messages.

### Hyperliquid Integration
- `src/hyperliquid/client.ts` - SDK client instantiation with multiple fallback strategies. Attempts various constructor patterns and factory methods to create working clients.
- `src/hyperliquid/deploy.ts` - Deployment orchestration with automatic method signature discovery. Tries multiple deployment patterns against the SDK client.
- `src/hyperliquid/sdk.ts` - Fallback stub implementation when the real SDK is unavailable. Provides informative error messages for missing dependencies.

### deBridge Cross-Chain Integration
- `src/config/debridge.ts` - Zod validation for deBridge API configuration and credentials
- `src/debridge/client.ts` - Lightweight EVM-focused REST API client with defensive error handling
- `src/debridge/operations.ts` - Cross-chain bridging operations (quotes, chain info, token lists)

### Pyth Network Price Integration
- `src/config/pyth.ts` - Zod validation for Pyth Network endpoints and API keys
- `src/pyth/client.ts` - Dual-client setup using both HermesClient and PriceServiceConnection for maximum compatibility
- `src/pyth/operations.ts` - Price feed operations (individual prices, batch queries, metadata search)

## Environment Setup

### Required Configuration
1. Copy environment template: `cp .env.example .env`
2. Configure the following variables:

#### Hyperliquid Configuration (Required)
   - `HYPERLIQUID_PRIVATE_KEY` - 0x-prefixed 64-character hex string for vault signer
   - `HYPERLIQUID_TESTNET_RPC_URL` - HTTP RPC endpoint (e.g., `https://testnet.hyperliquid.xyz/rpc`)
   - `HYPERLIQUID_TESTNET_WS_URL` - WebSocket endpoint (e.g., `wss://testnet.hyperliquid.xyz/ws`)
   - `HYPERLIQUID_VAULT_ADDRESS` - 0x-prefixed 40-character vault contract address

#### deBridge Configuration (Optional)
   - `DEBRIDGE_API_URL` - deBridge API endpoint (defaults to `https://api.dln.trade/v1.0`)
   - `DEBRIDGE_API_KEY` - Optional API key for enhanced rate limits and features

#### Pyth Network Configuration (Optional)
   - `PYTH_PRICE_SERVICE_URL` - Pyth Hermes endpoint (defaults to `https://hermes.pyth.network`)
   - `PYTH_API_KEY` - Optional API key for enhanced rate limits

### Validation Features
The application validates all environment variables at startup using Zod schemas. Invalid configurations result in detailed error messages and graceful exit with status code 1.

## Development Stack

### Package Management
- **Yarn Berry** - Fast, disk-efficient package manager with Plug'n'Play resolution

### TypeScript Configuration
- **Strict Mode** enabled with NodeNext module resolution
- **Target**: ESNext for modern JavaScript features
- **Output**: `dist/` directory for compiled JavaScript

### Code Quality Tools
- **ESLint** - Flat config with TypeScript and Prettier integration
- **Prettier** - Code formatting with 4-space tabs, 100-character line width, ES5 trailing commas
- **ts-node-dev** - Development server with transpilation and auto-reload

### Build System
- **tsup** - Fast TypeScript bundler with:
  - Source map generation for debugging
  - Minification for production builds
  - Bundle splitting disabled for single executable output
  - Name preservation for better stack traces

### Project-Specific Features

### Defensive SDK Pattern
The codebase implements a unique pattern for SDK integration that tries multiple instantiation strategies:
- Factory functions (`createClient`, `getClient`)
- Constructor patterns (`new HyperliquidClient`, `new VaultClient`)
- Default export variations
- Fallback to stub implementations

### Lightweight EVM-Only deBridge Integration
To avoid heavy Solana dependencies, the project uses:
- `@debridge-finance/debridge-protocol-evm-interfaces` for EVM smart contract interfaces
- Direct REST API calls via axios for cross-chain operations
- Defensive client creation with graceful fallbacks

### Deployment Method Discovery
The deployment system automatically discovers compatible methods by trying multiple signatures:
- `method(payload)`
- `method(payload, signer)`
- `method(payload, { signer, chainIds })`
- `method({ payload, signer, chainIds })`
- Additional variations for different SDK patterns

### Command Handler Architecture
Commands are registered in the `COMMAND_HANDLERS` record, making it easy to add new deployment targets or operational commands. Each handler is async and can return exit codes for precise error reporting.

Supported command categories:
- `deploy:*` - Deployment operations (currently Hyperliquid vaults)
- `debridge:*` - Cross-chain bridging operations
- `pyth:*` - Price feed queries and metadata operations

### Multi-Protocol Integration Strategy
The architecture supports multiple blockchain protocols through:
- **Hyperliquid**: Native SDK with defensive instantiation patterns
- **deBridge**: EVM-focused REST API integration without Solana dependencies  
- **Pyth Network**: Dual-client approach (HermesClient + PriceServiceConnection) for maximum compatibility

### Blockchain-Specific Error Handling
Error handling is tailored for blockchain deployment scenarios with:
- Detailed method attempt logging
- SDK compatibility validation
- Network connectivity checks via environment validation
- Graceful degradation when SDKs are unavailable