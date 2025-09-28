# Pyth Network Trading App Integration

This document describes the integration of Pyth Network live data feeds with the HyperMetal trading app interface.

## Overview

The trading app has been enhanced with real-time market data powered by Pyth Network, providing live price feeds for stocks and market indices. The integration includes:

- **Live Price Data**: Real-time stock and index prices from Pyth Network API
- **Interactive Charts**: Dynamic charts that update with live data every 5 seconds
- **Asset Selection**: Click-to-select functionality for stocks and indices
- **Fallback Systems**: Robust error handling with multiple data source fallbacks

## Architecture

### Core Components

1. **`pythApi.ts`** - Enhanced Pyth Network API service
   - Direct integration with Pyth Hermes API
   - Fallback to Express API endpoints
   - Demo data generation for testing
   - Real price feed ID mappings

2. **`marketStore.ts`** - Enhanced Zustand store
   - Live data management with automatic updates
   - Asset selection state management
   - Chart data caching and updates
   - Loading states and error handling

3. **Trading Components**:
   - **`TradingChart.tsx`** - Interactive chart with live updates
   - **`StockView.tsx`** - Stock listings with clickable selection
   - **`IndicesView.tsx`** - Index listings with clickable selection
   - **`TradingTabs.tsx`** - Main coordinator with lifecycle management

### Data Flow

```
Pyth Network API → pythApi.ts → marketStore.ts → Trading Components → UI Updates
                     ↓
              Express API (Fallback)
                     ↓
              Demo Data (Final Fallback)
```

## Features

### 1. Live Stock Selection
- Click any stock in the Stock tab to select it
- Selected stock automatically switches to Charts tab
- Live chart data loads for the selected stock
- Real-time price updates every 5 seconds

### 2. Live Index Selection
- Click any index in the Indices tab to select it
- Same automatic chart switching and updates as stocks
- Index-specific styling and metadata

### 3. Interactive Charts
- Real-time price line charts with area fills
- Hover tooltips showing price and confidence intervals
- Multiple timeframe selection (1D, 1W, 1M, 3M, 1Y)
- Volume charts with realistic volume patterns
- Live update indicators and status badges

### 4. Market Status Indicators
- Live data connection status
- Last update timestamps
- Price confidence intervals
- Data source attribution (Pyth Network)

## API Integration

### Pyth Network Price Feeds

The app uses real Pyth Network price feed IDs for major assets:

**Stocks:**
- TSLA: Tesla Inc
- AAPL: Apple Inc  
- MSFT: Microsoft Corporation
- AMZN: Amazon.com Inc
- NVDA: NVIDIA Corporation
- GME: GameStop Corp (featured as trending)

**Indices/ETFs:**
- SPY: SPDR S&P 500 ETF
- QQQ: Invesco QQQ Trust
- IWM: iShares Russell 2000 ETF
- DIA: SPDR Dow Jones Industrial Average ETF
- VTI: Vanguard Total Stock Market ETF

### Real-time Updates

- **Primary**: Pyth Hermes API (`https://hermes.pyth.network`)
- **Fallback**: Express API endpoints (`/api/stock-price`)
- **Demo**: Generated realistic price movements

Updates occur every 5 seconds with automatic retry on failures.

## Usage

### 1. Basic Navigation
```bash
# Access the main trading interface
http://localhost:5173/trading

# Or the full demo page
http://localhost:5173/trading-demo
```

### 2. Selecting Assets
1. Navigate to "Stock" or "Indices" tab
2. Click on any row in the table
3. Chart tab automatically opens with live data
4. Data updates every 5 seconds

### 3. Chart Interaction
- Select different timeframes (1D, 1W, 1M, etc.)
- Hover over data points for details
- Monitor live status indicators
- View volume patterns in bottom chart

## Configuration

### Environment Variables
```env
# Optional: Custom Pyth Network endpoints
VITE_PYTH_HERMES_URL=https://hermes.pyth.network
VITE_PYTH_WS_URL=wss://hermes.pyth.network/ws
```

### Customization

**Adding New Assets:**
1. Add price feed ID to `PYTH_PRICE_FEEDS` in `pythApi.ts`
2. Update `DEFAULT_STOCKS` or `DEFAULT_INDICES` in `marketStore.ts`
3. Add asset name mapping in the respective service

**Adjusting Update Frequency:**
```typescript
// In marketStore.ts
const PRICE_UPDATE_INTERVAL = 5000; // Change to desired milliseconds
```

## Error Handling

The system includes multiple layers of error handling:

1. **Network Failures**: Automatic fallback to alternative endpoints
2. **API Errors**: Graceful degradation to demo data
3. **Data Validation**: Type checking and data sanitization
4. **UI Resilience**: Loading states and error messages

## Performance Optimizations

- **Debounced Updates**: Prevents excessive API calls
- **Data Caching**: Stores recent chart data to reduce requests  
- **Selective Updates**: Only updates changed data points
- **Component Optimization**: React.memo and selective re-renders

## Demo Features

The `/trading-demo` route includes:

- **Status Dashboard**: Live connection and data feed status
- **Featured Assets**: Quick preview of top stocks and indices
- **Interactive Tutorials**: Guided introduction to features
- **Real-time Metrics**: Updates, asset counts, and system health

## Development

### Running Locally
```bash
cd packages/web
npm install
npm run dev
```

### Testing with Mock Data
Set `NODE_ENV=development` to enable detailed logging and mock data fallbacks.

### Adding Custom Indicators
Chart indicators can be added by extending the `TradingChart.tsx` component with additional SVG overlays.

## Production Considerations

1. **API Keys**: Production deployments should use authenticated Pyth endpoints
2. **Rate Limiting**: Implement request throttling for high-traffic scenarios
3. **Caching**: Add Redis or similar for price data caching
4. **Monitoring**: Set up alerts for API failures and data staleness
5. **Compliance**: Ensure market data usage complies with financial regulations

## Troubleshooting

### Common Issues

**No Live Data:**
- Check network connectivity
- Verify Pyth Network API status
- Check browser console for errors

**Charts Not Updating:**
- Ensure asset is selected
- Check update interval settings
- Verify chart data is loading

**Performance Issues:**
- Reduce update frequency
- Limit number of tracked assets
- Check for memory leaks in browser dev tools

### Support

For issues or questions about the Pyth Network integration, check:
- [Pyth Network Documentation](https://docs.pyth.network/)
- Browser developer console logs
- Network tab for failed API requests