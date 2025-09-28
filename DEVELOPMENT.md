# HyperMetal Trading App - Development Guide

## 🚀 Quick Start

The HyperMetal Trading App now runs entirely on **http://localhost:3000** - no more multiple ports!

### Prerequisites
- Node.js 20.x
- npm

### Development Commands

```bash
# Start the app (builds frontend + starts server)
npm run dev

# For active development with auto-rebuild
npm run dev:watch

# Build for production
npm run build

# Start production server
npm start
```

## 📊 Features

### Live Trading Interface
- **Real-time stock data** via Pyth Network
- **Interactive charts** with live updates every 5 seconds
- **Click-to-select** stocks and indices from tables
- **Multiple timeframes** (1D, 1W, 1M, 3M, 1Y)
- **Volume charts** and confidence intervals

### Supported Assets
**Stocks:**
- TSLA (Tesla Inc)
- AAPL (Apple Inc)
- MSFT (Microsoft Corporation)
- AMZN (Amazon.com Inc)
- NVDA (NVIDIA Corporation)
- GME (GameStop Corp) - Featured as trending

**Indices/ETFs:**
- SPY (SPDR S&P 500 ETF)
- QQQ (Invesco QQQ Trust)
- IWM (iShares Russell 2000 ETF)
- DIA (SPDR Dow Jones Industrial Average ETF)
- VTI (Vanguard Total Stock Market ETF)

### API Endpoints
All available at `http://localhost:3000/api/`:

- `GET /api/stock-price` - Tesla stock price via Pyth
- `GET /api/evm-chains` - Supported EVM chains via deBridge
- `GET /api/vault-info` - Hyperliquid vault info
- `GET /api/health` - Health check

## 🎯 Usage

1. **Start the app:** `npm run dev`
2. **Open browser:** http://localhost:3000
3. **Navigate:** Use the "Stock" and "Indices" tabs
4. **Select assets:** Click any row to view live charts
5. **Customize:** Change timeframes and explore different assets

## 🔧 Development Modes

### Standard Development
```bash
npm run dev
```
- Builds frontend once
- Starts server with hot-reload
- Good for backend development

### Watch Development  
```bash
npm run dev:watch
```
- Continuously rebuilds frontend on changes
- Server restarts on backend changes
- Best for full-stack development

## 🏗️ Architecture

```
http://localhost:3000/
├── / ................................. Trading Demo UI (React)
├── /trading .............................. Trading Interface  
├── /trading-demo ......................... Full Demo Page
└── /api/ ................................. REST API
    ├── /stock-price ...................... Live stock data
    ├── /evm-chains ....................... Blockchain data
    ├── /vault-info ....................... Vault status
    └── /health ........................... Health check
```

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite 6
- **Backend:** Express.js + TypeScript
- **State:** Zustand for market data management  
- **UI:** Tailwind CSS + Radix UI components
- **Charts:** Custom SVG charts with real-time updates
- **Data:** Pyth Network for live price feeds

## 🎨 Customization

### Adding New Assets
1. Add price feed ID to `packages/web/src/lib/pythApi.ts`
2. Update symbol lists in `packages/web/src/store/marketStore.ts`
3. Add asset name mapping in the service files

### Modifying Update Frequency
```typescript
// In marketStore.ts
const PRICE_UPDATE_INTERVAL = 5000; // milliseconds
```

### Styling
- Modify `packages/web/tailwind.config.ts` for theme changes
- Component styles in `packages/web/src/components/`

## 📝 Notes

- The app automatically falls back to demo data if Pyth Network is unavailable
- All components are responsive and work on mobile devices
- Charts update in real-time with visual indicators for live data status
- The interface automatically switches to chart view when you select an asset

## 🐛 Troubleshooting

**Port 3000 in use:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Build issues:**
```bash
cd packages/web && npm run build
```

**Clear cache:**
```bash
rm -rf packages/web/dist node_modules
npm install && npm run dev
```