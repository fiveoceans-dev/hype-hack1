# GME-PERP Implementation Plan
## Hyperliquid x Pyth x deBridge Hackathon

---

## 📋 Project Overview
**GME-PERP**: A synthetic GameStop perpetual futures market on Hyperliquid, powered by Pyth's real-time equity price feeds and cross-chain collateral via deBridge.

---

## 🏗️ Architecture Components

### 1. Smart Contracts (HyperEVM)

#### A. Oracle Adapter Contract (`OracleAdapter.sol`)
```solidity
// packages/contracts/hyperevm/OracleAdapter.sol
contract OracleAdapter {
    // Core functionality:
    - Pyth price feed integration
    - Price freshness validation (<10 seconds)
    - TWAP calculation and deviation checks
    - Circuit breaker triggers
    - Health status reporting
    
    // Key methods:
    - getGMEPrice() returns (price, confidence, timestamp)
    - validatePriceFreshness(timestamp) returns (bool)
    - calculateTWAP(duration) returns (price)
    - checkPriceDeviation(spot, twap) returns (bool)
    - triggerCircuitBreaker() onlyKeeper
}
```

#### B. Risk Manager Contract (`RiskManager.sol`)
```solidity
// packages/contracts/hyperevm/RiskManager.sol
contract RiskManager {
    // Core functionality:
    - Dynamic leverage adjustment
    - Margin requirement updates
    - Earnings mode activation
    - Position limits enforcement
    
    // Key methods:
    - setEarningsMode(bool) onlyAdmin
    - updateLeverageTiers(tiers[]) onlyAdmin
    - checkPositionHealth(account) returns (bool)
    - liquidationPrice(position) returns (price)
}
```

#### C. Builder Code Registry (`BuilderCodeRegistry.sol`)
```solidity
// packages/contracts/hyperevm/BuilderCodeRegistry.sol
contract BuilderCodeRegistry {
    // Core functionality:
    - Builder code registration
    - Fee distribution tracking
    - Referral system
    - Revenue analytics
    
    // Key methods:
    - registerBuilderCode(code, recipient)
    - trackFeeRevenue(code, amount)
    - claimFees(code)
    - getReferralStats(code) returns (stats)
}
```

### 2. CoreWriter Integration

#### A. Market Admin Module
```typescript
// packages/integrations/corewriter/MarketAdmin.ts
class MarketAdmin {
    // Administrative actions via CoreWriter:
    - pauseMarket(marketId)
    - resumeMarket(marketId)
    - updateMarginRequirements(marketId, requirements)
    - setFundingRate(marketId, rate)
    - toggleEarningsMode(marketId, enabled)
}
```

#### B. Oracle Health Monitor
```typescript
// packages/integrations/corewriter/OracleHealthMonitor.ts
class OracleHealthMonitor {
    // Automated monitoring:
    - checkPythFeedHealth()
    - monitorPriceDeviations()
    - autoTriggerCircuitBreaker()
    - alertOnStalePrice()
}
```

### 3. HIP-3 Market Deployment

#### Market Configuration
```json
{
  "marketName": "GME-PERP",
  "collateral": "USDC",
  "oracle": {
    "provider": "Pyth",
    "feedId": "GME_USD_FEED_ID",
    "heartbeat": 10,
    "deviationThreshold": 0.05
  },
  "leverage": {
    "initial": 10,
    "maintenance": 5,
    "tiers": [
      {"size": 10000, "leverage": 20},
      {"size": 50000, "leverage": 15},
      {"size": 100000, "leverage": 10},
      {"size": 500000, "leverage": 5}
    ]
  },
  "fees": {
    "maker": -0.0002,
    "taker": 0.0005,
    "funding": "dynamic"
  },
  "limits": {
    "maxPositionSize": 1000000,
    "minOrderSize": 10
  }
}
```

---

## 📦 Package Structure

```
packages/
├── contracts/                    # Smart contracts
│   ├── hyperevm/
│   │   ├── OracleAdapter.sol
│   │   ├── RiskManager.sol
│   │   ├── BuilderCodeRegistry.sol
│   │   └── interfaces/
│   ├── hip3/
│   │   ├── GMEPerpMarket.json   # Market config
│   │   └── deploy/
│   └── test/
│
├── integrations/
│   ├── corewriter/
│   │   ├── src/
│   │   │   ├── MarketAdmin.ts
│   │   │   ├── OracleHealthMonitor.ts
│   │   │   └── CircuitBreaker.ts
│   │   └── package.json
│   │
│   ├── pyth-adapter/
│   │   ├── src/
│   │   │   ├── GMEPriceFeed.ts
│   │   │   ├── PriceValidator.ts
│   │   │   └── TWAPCalculator.ts
│   │   └── package.json
│   │
│   └── debridge-collateral/
│       ├── src/
│       │   ├── CollateralBridge.ts
│       │   ├── CrossChainDeposit.ts
│       │   └── WithdrawalManager.ts
│       └── package.json
│
├── keeper/                       # Automated keeper scripts
│   ├── src/
│   │   ├── OracleKeeper.ts     # Monitor & update oracle
│   │   ├── RiskKeeper.ts       # Check positions health
│   │   └── FundingKeeper.ts    # Update funding rates
│   └── package.json
│
├── web/                         # Frontend updates
│   └── src/
│       ├── components/
│       │   └── trading/
│       │       ├── GMEPerpWidget.tsx
│       │       ├── PythPriceFeed.tsx
│       │       └── DeBridgeDeposit.tsx
│       └── services/
│           ├── hip3.service.ts
│           └── builder-code.service.ts
│
└── tools/                       # Developer tools
    ├── oracle-monitor/          # Public good tool
    │   ├── src/
    │   │   ├── cli.ts
    │   │   └── dashboard.ts
    │   └── package.json
    └── testnet-faucet/
        └── src/
```

---

## 🚀 Implementation Phases

### Phase 1: Core Contracts (Days 1-3)
- [ ] Deploy OracleAdapter contract on HyperEVM testnet
- [ ] Integrate Pyth GME price feed
- [ ] Implement TWAP and deviation checks
- [ ] Deploy RiskManager contract
- [ ] Test circuit breaker functionality

### Phase 2: HIP-3 Market Creation (Days 4-5)
- [ ] Configure GME-PERP market parameters
- [ ] Deploy market via HIP-3
- [ ] Set up funding rate mechanism
- [ ] Configure leverage tiers
- [ ] Test order matching on testnet

### Phase 3: CoreWriter Integration (Days 6-7)
- [ ] Implement MarketAdmin module
- [ ] Create keeper scripts for automation
- [ ] Test earnings mode toggle
- [ ] Implement position health monitoring
- [ ] Deploy oracle health monitor

### Phase 4: Cross-chain & Builder Codes (Days 8-9)
- [ ] Integrate deBridge for USDC deposits
- [ ] Implement builder code registry
- [ ] Create referral tracking system
- [ ] Test cross-chain collateral flow
- [ ] Deploy fee distribution mechanism

### Phase 5: Frontend & Tools (Days 10-12)
- [ ] Update trading UI with GME-PERP widget
- [ ] Add Pyth price display component
- [ ] Integrate deBridge deposit flow
- [ ] Build oracle monitor dashboard
- [ ] Create CLI tools for developers

### Phase 6: Testing & Documentation (Days 13-14)
- [ ] End-to-end testnet testing
- [ ] Write deployment guides
- [ ] Create video demo
- [ ] Document API endpoints
- [ ] Prepare hackathon submission

---

## 📊 Key Metrics & Success Criteria

### Technical Metrics
- Oracle update frequency: < 1 second
- Price staleness threshold: < 10 seconds
- Cross-chain deposit time: < 5 minutes
- Order execution latency: < 100ms

### Business Metrics
- Builder code revenue share: 10% of fees
- Supported collateral: USDC, USDT
- Max leverage: 20x (scaled by position size)
- Funding rate: Dynamic based on skew

### Risk Parameters
- Max position size: $1M notional
- Liquidation threshold: 80% of maintenance margin
- Circuit breaker trigger: 10% price deviation
- Earnings mode: 50% leverage reduction

---

## 🔧 Development Commands

```bash
# Deploy contracts
yarn workspace @hype/contracts deploy:testnet

# Start keeper services
yarn workspace @hype/keeper start

# Run oracle monitor
yarn workspace @hype/tools oracle-monitor

# Deploy HIP-3 market
yarn workspace @hype/hip3 deploy:gme-perp

# Test cross-chain flow
yarn workspace @hype/debridge-collateral test:deposit
```

---

## 🎯 Hackathon Deliverables

### Track 1: Programmable Trading
- ✅ OracleAdapter smart contract with Pyth integration
- ✅ CoreWriter automation for risk management
- ✅ Earnings mode toggle functionality

### Track 2: HIP-3 Markets
- ✅ GME-PERP market deployment
- ✅ Custom funding and margin parameters
- ✅ Leverage tier configuration

### Track 3: Builder Codes
- ✅ Builder code registry contract
- ✅ Fee tracking and distribution
- ✅ Referral system implementation

### Track 4: Developer Tools
- ✅ Oracle health monitor (public good)
- ✅ Cross-chain collateral widget
- ✅ CLI tools for market interaction

---

## 🚨 Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| Oracle manipulation | Multi-source validation, TWAP checks, circuit breakers |
| Bridge failures | Timeout handling, manual recovery process |
| Regulatory concerns | Clear derivative disclaimers, geo-blocking if needed |
| Market manipulation | Position limits, funding rate adjustments |
| Technical failures | Keeper redundancy, automated monitoring |

---

## 📈 Post-Hackathon Roadmap

### Month 1
- Audit smart contracts
- Optimize gas usage
- Add more equity feeds

### Month 2
- Launch on mainnet
- Integrate social trading
- Mobile app development

### Month 3
- Add options trading
- Cross-chain liquidity pools
- Institutional API

---

## 📝 Resources & Links

- [Hyperliquid Docs](https://docs.hyperliquid.xyz)
- [Pyth Network Feeds](https://pyth.network/price-feeds)
- [deBridge Protocol](https://docs.debridge.finance)
- [HIP-3 Specification](https://github.com/hyperliquid/HIPs/blob/main/HIPs/HIP-3.md)

---

## 🏆 Why We Win

1. **Complete Integration**: We use all three protocols (Hyperliquid, Pyth, deBridge) meaningfully
2. **Multiple Tracks**: We address all four hackathon tracks with concrete implementations
3. **Real Innovation**: First on-chain synthetic equity perp with real-time oracle
4. **Production Ready**: Not just a demo - can go live immediately after hackathon
5. **Open Source Value**: Oracle monitor tool benefits entire ecosystem

---

This plan positions GME-PERP as a comprehensive, track-aligned project that showcases the full potential of Hyperliquid's infrastructure with real-world asset trading.