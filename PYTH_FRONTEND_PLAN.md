# Pyth Network Frontend Integration Plan 📊
## Real-Time Market Data for Indices, Stocks & Charts

---

## 🎯 **OBJECTIVES**

1. **Replace static data** in IndicesView and StockView with live Pyth price feeds
2. **Create interactive charts** that open when selecting an asset
3. **Implement real-time updates** via WebSocket or polling
4. **Add search functionality** to find specific price feeds
5. **Show confidence intervals** and data freshness indicators

---

## 📋 **IMPLEMENTATION PLAN**

### **Phase 1: Backend API Setup** ✅

#### 1.1 Create Pyth API Service (`packages/web/src/services/pythService.ts`)
```typescript
- Create PythService class with methods:
  - getIndicesPrices() - Fetch S&P 500, NASDAQ, DJI, Russell 2000
  - getStockPrices() - Fetch GME, TSLA, AAPL, NVDA, etc.
  - getPriceHistory(feedId, period) - Get historical data for charts
  - searchPriceFeeds(query) - Search available feeds
  - subscribeToPriceUpdates(feedIds) - WebSocket subscription
```

#### 1.2 Define Price Feed Mappings
```typescript
const INDICES_FEEDS = {
  'SPX': '0x...', // S&P 500 price feed ID
  'NDX': '0x...', // NASDAQ-100 
  'DJI': '0x...', // Dow Jones
  'RUT': '0x...', // Russell 2000
  'VIX': '0x...', // Volatility Index
}

const STOCK_FEEDS = {
  'GME': '0x...', // GameStop
  'TSLA': '0x...', // Tesla
  'AAPL': '0x...', // Apple
  'NVDA': '0x...', // NVIDIA
  // Add more stocks
}
```

#### 1.3 Create API Endpoints (`packages/backend/src/routes/pyth.ts`)
```typescript
- GET /api/pyth/indices - Get all indices prices
- GET /api/pyth/stocks - Get stock prices
- GET /api/pyth/price/:feedId - Get specific price
- GET /api/pyth/history/:feedId - Get price history
- WS /api/pyth/subscribe - WebSocket for real-time updates
```

---

### **Phase 2: State Management** 📊

#### 2.1 Create Zustand Store (`packages/web/src/store/marketStore.ts`)
```typescript
interface MarketStore {
  // Indices data
  indices: IndexData[]
  indicesLoading: boolean
  
  // Stocks data
  stocks: StockData[]
  stocksLoading: boolean
  
  // Selected asset for chart
  selectedAsset: {
    symbol: string
    feedId: string
    type: 'index' | 'stock'
  } | null
  
  // Chart data
  chartData: ChartPoint[]
  chartLoading: boolean
  
  // Actions
  fetchIndices: () => Promise<void>
  fetchStocks: () => Promise<void>
  selectAsset: (asset) => void
  fetchChartData: (feedId) => Promise<void>
  subscribeToUpdates: () => void
  unsubscribeFromUpdates: () => void
}
```

#### 2.2 Create Data Types (`packages/web/src/types/market.ts`)
```typescript
interface PriceData {
  symbol: string
  name: string
  price: number
  confidence: number
  change24h: number
  changePercent24h: number
  volume24h: number
  timestamp: number
  publishTime: number
}

interface ChartPoint {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

---

### **Phase 3: Component Updates** 🎨

#### 3.1 Update IndicesView Component
```typescript
Changes:
- Import useMarketStore hook
- Replace static data with store.indices
- Add loading states and skeletons
- Add click handler to open chart
- Show confidence intervals as tooltips
- Add real-time update indicator
```

#### 3.2 Update StockView Component
```typescript
Changes:
- Import useMarketStore hook  
- Replace static data with store.stocks
- Add loading states
- Add click handler for chart navigation
- Display data freshness (seconds since update)
- Add search/filter functionality
```

#### 3.3 Enhanced TradingChart Component
```typescript
New Features:
- Accept symbol & feedId as props
- Fetch historical data on mount
- Subscribe to real-time updates
- Implement multiple chart types (candlestick, line, area)
- Add technical indicators (SMA, EMA, RSI)
- Show confidence bands
- Add time period selector (1D, 1W, 1M, 3M, 1Y)
```

#### 3.4 Create ChartModal Component (`packages/web/src/components/trading/ChartModal.tsx`)
```typescript
Features:
- Full-screen modal for detailed chart view
- Advanced charting with TradingView-like interface
- Multiple overlay indicators
- Drawing tools
- Export chart as image
```

---

### **Phase 4: Real-Time Updates** ⚡

#### 4.1 WebSocket Connection Manager
```typescript
class PythWebSocketManager {
  - Connect to Pyth Hermes WebSocket
  - Subscribe to specific price feeds
  - Handle reconnection logic
  - Update store with new prices
  - Show connection status in UI
}
```

#### 4.2 Polling Fallback
```typescript
- Implement 1-second polling as fallback
- Use React Query for caching
- Implement smart polling (pause when tab inactive)
```

---

### **Phase 5: UI Enhancements** ✨

#### 5.1 Data Quality Indicators
```typescript
Components:
- PriceConfidenceBadge - Show confidence level
- DataFreshnessIndicator - Time since last update
- ConnectionStatus - WebSocket/API status
- UpdateFrequency - Updates per second
```

#### 5.2 Interactive Features
```typescript
- Hover to show detailed price info
- Click row to open chart
- Right-click for quick actions
- Drag to reorder watchlist
- Pin favorite assets
```

#### 5.3 Search & Filter
```typescript
- Global search bar for any asset
- Filter by exchange
- Filter by asset type
- Sort by various metrics
- Save custom watchlists
```

---

## 🏗️ **FILE STRUCTURE**

```
packages/web/src/
├── services/
│   ├── pythService.ts         # Pyth API integration
│   └── websocketManager.ts    # WebSocket handling
├── store/
│   ├── marketStore.ts         # Zustand market state
│   └── chartStore.ts          # Chart-specific state
├── hooks/
│   ├── usePythPrices.ts      # Price fetching hook
│   ├── useChartData.ts       # Chart data hook
│   └── useWebSocket.ts       # WebSocket hook
├── types/
│   ├── market.ts              # Market data types
│   └── pyth.ts               # Pyth-specific types
├── components/
│   └── trading/
│       ├── IndicesView.tsx    # Updated indices view
│       ├── StockView.tsx      # Updated stock view
│       ├── TradingChart.tsx   # Enhanced chart
│       ├── ChartModal.tsx     # Full-screen chart
│       ├── PriceCell.tsx      # Price display cell
│       ├── ConfidenceBadge.tsx # Confidence indicator
│       └── SearchBar.tsx      # Asset search

packages/backend/src/
├── routes/
│   └── pyth.ts               # Pyth API routes
├── services/
│   └── pythService.ts        # Backend Pyth service
└── websocket/
    └── pythWebSocket.ts      # WebSocket server
```

---

## 📊 **PYTH PRICE FEED IDS**

### Major Indices (ETFs as proxies)
```typescript
'SPY': '0x19e09bb805456ada3979a7d1cbb4b6df5b...', // S&P 500 ETF
'QQQ': '0x293978c92f1b78f49c93bd54e1cc8c3e8...', // NASDAQ-100 ETF
'IWM': '0x1f8b43b8e9e234d7e7c9d1cc8e9ed8a7b...', // Russell 2000 ETF
'DIA': '0x8f9bc394d7e8e234d7e7c9d1cc8e9ed8a7...', // Dow Jones ETF
'VIX': '0x3fa74efa0e2d35e1e7cf9123d8e7af88e...'  // Volatility Index
```

### Individual Stocks (if available)
```typescript
'GME': 'TBD - Search Pyth feeds',
'TSLA': 'TBD - Search Pyth feeds', 
'AAPL': 'TBD - Search Pyth feeds',
'NVDA': 'TBD - Search Pyth feeds'
```

Note: We'll need to search Pyth's available feeds for exact stock tickers or use crypto equivalents.

---

## 🚀 **IMPLEMENTATION STEPS**

### Day 1: Backend Setup
1. ✅ Install dependencies (@pythnetwork/client, ws)
2. ✅ Create PythService class
3. ✅ Set up API endpoints
4. ✅ Test with real Pyth feeds

### Day 2: Frontend Integration
1. ⬜ Create Zustand store
2. ⬜ Update IndicesView component
3. ⬜ Update StockView component
4. ⬜ Add loading states

### Day 3: Chart Enhancement
1. ⬜ Integrate charting library (recharts/lightweight-charts)
2. ⬜ Connect chart to selected asset
3. ⬜ Add historical data fetching
4. ⬜ Implement chart types

### Day 4: Real-Time Features
1. ⬜ Set up WebSocket connection
2. ⬜ Implement real-time updates
3. ⬜ Add connection indicators
4. ⬜ Test performance

### Day 5: Polish & Testing
1. ⬜ Add error handling
2. ⬜ Implement fallbacks
3. ⬜ Optimize performance
4. ⬜ Final testing

---

## 🎯 **SUCCESS METRICS**

- ✅ Live price updates every 400ms
- ✅ Chart loads in < 500ms
- ✅ Support 50+ simultaneous price feeds
- ✅ WebSocket reconnection in < 2s
- ✅ Mobile responsive design
- ✅ Confidence intervals displayed
- ✅ Search returns results in < 100ms

---

## 🔧 **TECHNICAL REQUIREMENTS**

### Dependencies
```json
{
  "@pythnetwork/client": "^2.18.0",
  "@pythnetwork/hermes-client": "^1.0.0",
  "lightweight-charts": "^4.1.0",
  "zustand": "^4.4.0",
  "ws": "^8.14.0",
  "@tanstack/react-query": "^5.0.0"
}
```

### Environment Variables
```env
VITE_PYTH_HERMES_URL=https://hermes.pyth.network
VITE_PYTH_WS_URL=wss://hermes.pyth.network/ws
PYTH_API_KEY=optional_for_higher_rate_limits
```

---

## 📈 **EXPECTED OUTCOME**

After implementation, the frontend will have:

1. **Real-time market data** for indices and stocks
2. **Interactive charts** with technical analysis
3. **Live price updates** via WebSocket
4. **Professional trading interface** comparable to major platforms
5. **Confidence indicators** showing data reliability
6. **Search functionality** for finding any asset
7. **Responsive design** working on all devices

This will transform the static demo into a live, production-ready trading platform powered by Pyth Network's institutional-grade price feeds! 🚀