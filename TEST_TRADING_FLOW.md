# 📊 Trading Interface Test Guide

## ✅ **Complete Integration Checklist**

### 1. **Data Flow Test**
- [ ] Start the app: `cd packages/web && yarn dev`
- [ ] Open browser to `http://localhost:5173`
- [ ] Navigate to **Indices Tab**
- [ ] Verify indices are loading (SPX, NDX, DJI, RUT, VIX)
- [ ] Navigate to **Stock Tab**
- [ ] Verify stocks are loading (GME shows "Trending Stock" badge)

### 2. **Click-to-Chart Flow**
- [ ] In **Stock Tab**, click on **GME** row
- [ ] Verify automatically switches to **Charts Tab**
- [ ] Verify chart header shows "GME" and "GameStop Corp"
- [ ] Verify "🚀 Trending" badge appears for GME
- [ ] Go back to **Indices Tab**, click on **SPX** row
- [ ] Verify chart updates to show "SPX" and "S&P 500 Index"
- [ ] Verify "Index" badge appears

### 3. **Order Book Integration**
- [ ] Select any stock/index
- [ ] Check **Order Book** shows selected symbol badge
- [ ] Verify order book prices update based on selected asset
- [ ] Verify spread calculation updates

### 4. **Trading Controls Integration**
- [ ] Select **GME** from Stock tab
- [ ] Verify Buy button shows "Buy GME"
- [ ] Verify Sell button shows "Sell GME"
- [ ] Select **SPX** from Indices tab
- [ ] Verify Buy button shows "Buy SPX"
- [ ] Verify Sell button shows "Sell SPX"
- [ ] Check price field shows current asset price
- [ ] Verify Total calculation updates with size input

### 5. **Live Data Updates**
- [ ] Check for "Live" or "Polling" badge in Indices/Stock views
- [ ] Verify "via Pyth Network" or "Powered by Pyth" text
- [ ] Check timestamp shows "Updated: Xs ago"
- [ ] Verify confidence intervals display (±$X.XX)

### 6. **Chart Features**
- [ ] Select any asset
- [ ] Test period buttons (1D, 1W, 1M, 3M, 1Y)
- [ ] Verify chart data updates
- [ ] Hover over chart bars to see tooltips
- [ ] Check confidence bands visualization

---

## 🎯 **Expected Behavior**

### **Indices Tab**
```
Symbol | Name                  | Price        | Confidence
SPX    | S&P 500 Index        | $4453.53     | ±$0.05
NDX    | NASDAQ-100 Index     | $15234.12    | ±$0.08
DJI    | Dow Jones Industrial | $38456.23    | ±$0.12
```

### **Stock Tab**
```
Symbol | Name              | Price     | Badge
GME    | GameStop Corp     | $28.45    | [🚀 Trending Stock]
TSLA   | Tesla Inc         | $248.67   | -
AAPL   | Apple Inc         | $225.77   | -
```

### **Order Book (with GME selected)**
```
Order Book  Trades  [GME]
Price     Size     Total
28.461    54.02    2985.60
28.460    37.36    2931.58
------- Spread: 0.002 (0.007%) -------
28.459    72.93    72.93
28.458    12.50    85.43
```

### **Trading Controls (with GME selected)**
```
[Buy] [Sell]
Available: 0.00 USDC

Size: [    0.001    ] GME
Price: 28.459
Total: 0.028

[  Buy GME  ]
```

---

## 🔧 **Troubleshooting**

### If data doesn't load:
1. Check console for errors
2. Verify `.env` has Pyth URLs set
3. Check network tab for API calls
4. Fallback mock data should appear

### If selection doesn't work:
1. Check browser console for store updates
2. Verify `selectedAsset` in Redux DevTools
3. Check z-index values in elements

### If charts don't appear:
1. Verify chart tab is active
2. Check `chartData` in store
3. Look for loading/error states

---

## ✅ **Success Criteria**

1. **All indices and stocks display with live/mock data**
2. **Clicking any row opens chart with correct data**
3. **Order book updates with selected asset**
4. **Buy/Sell buttons show selected symbol**
5. **Price updates reflect selected asset**
6. **"Trending Stock" badge appears for GME**
7. **Smooth tab transitions**
8. **No z-index/overlay issues**

---

## 🚀 **Complete Flow Example**

1. **User opens app** → Sees Stock tab with GME showing "Trending Stock"
2. **User clicks GME** → Auto-switches to Charts tab, shows GME chart
3. **Order book updates** → Shows GME order data with badge
4. **Trading controls update** → Shows "Buy GME" / "Sell GME"
5. **User switches to Indices** → Sees SPX, NDX, etc.
6. **User clicks SPX** → Chart updates to S&P 500 data
7. **All components sync** → Order book, controls, chart all show SPX

This creates a seamless trading experience where selecting any asset updates the entire interface! 🎯