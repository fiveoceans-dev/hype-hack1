// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/Interfaces.sol";

/**
 * @title RiskManager
 * @notice Manages risk parameters for GME-PERP market on Hyperliquid
 * @dev Integrates with CoreWriter for administrative actions
 */
contract RiskManager {
    // Structs
    struct LeverageTier {
        uint256 maxPositionSize;  // Maximum position size in USD (8 decimals)
        uint256 maxLeverage;      // Maximum leverage in basis points (100 = 1x)
        uint256 initialMargin;    // Initial margin requirement in basis points
        uint256 maintenanceMargin; // Maintenance margin requirement in basis points
    }
    
    struct MarketConfig {
        bool isPaused;
        bool isEarningsMode;
        uint256 maxPositionSize;
        uint256 minOrderSize;
        uint256 makerFee;      // In basis points (negative for rebates)
        uint256 takerFee;       // In basis points
        uint256 fundingRate;    // Current funding rate in basis points per hour
    }
    
    struct Position {
        address trader;
        int256 size;          // Positive for long, negative for short
        uint256 avgEntryPrice;
        uint256 margin;
        uint256 lastUpdateTime;
        uint256 fundingPaid;
    }
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRICE_DECIMALS = 1e8;
    uint256 public constant EARNINGS_MODE_LEVERAGE_REDUCTION = 5000; // 50% reduction
    uint256 public constant MAX_FUNDING_RATE = 100; // 1% per hour max
    
    // State variables
    IHyperCore public immutable hyperCore;
    IOracleAdapter public immutable oracleAdapter;
    ICoreWriter public immutable coreWriter;
    
    address public admin;
    address public keeper;
    bytes32 public marketId;
    
    MarketConfig public marketConfig;
    LeverageTier[] public leverageTiers;
    
    mapping(address => Position) public positions;
    mapping(address => bool) public liquidators;
    
    // Tracking
    int256 public totalOpenInterest;
    int256 public totalLongOpenInterest;
    int256 public totalShortOpenInterest;
    uint256 public lastFundingUpdate;
    
    // Events
    event MarketPaused(uint256 timestamp);
    event MarketResumed(uint256 timestamp);
    event EarningsModeToggled(bool enabled, uint256 timestamp);
    event LeverageTiersUpdated(uint256 tierCount);
    event PositionOpened(address indexed trader, int256 size, uint256 price);
    event PositionClosed(address indexed trader, int256 pnl);
    event PositionLiquidated(address indexed trader, address indexed liquidator, int256 pnl);
    event FundingRateUpdated(uint256 newRate, int256 skew);
    event MarginAdded(address indexed trader, uint256 amount);
    event MarginRemoved(address indexed trader, uint256 amount);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == admin, "Only keeper");
        _;
    }
    
    modifier onlyLiquidator() {
        require(liquidators[msg.sender], "Only liquidator");
        _;
    }
    
    modifier marketNotPaused() {
        require(!marketConfig.isPaused, "Market paused");
        _;
    }
    
    constructor(
        address _hyperCore,
        address _oracleAdapter,
        address _coreWriter,
        bytes32 _marketId,
        address _admin,
        address _keeper
    ) {
        hyperCore = IHyperCore(_hyperCore);
        oracleAdapter = IOracleAdapter(_oracleAdapter);
        coreWriter = ICoreWriter(_coreWriter);
        marketId = _marketId;
        admin = _admin;
        keeper = _keeper;
        
        // Initialize default market config
        marketConfig = MarketConfig({
            isPaused: false,
            isEarningsMode: false,
            maxPositionSize: 1000000 * PRICE_DECIMALS, // $1M
            minOrderSize: 10 * PRICE_DECIMALS,         // $10
            makerFee: 0,                                // -0.02% rebate (handled separately)
            takerFee: 50,                                // 0.05%
            fundingRate: 10                             // 0.1% per hour default
        });
        
        // Initialize default leverage tiers
        _initializeDefaultTiers();
    }
    
    /**
     * @notice Pause market trading
     */
    function pauseMarket() external {
        require(
            msg.sender == admin || 
            msg.sender == keeper || 
            msg.sender == address(oracleAdapter),
            "Unauthorized"
        );
        
        marketConfig.isPaused = true;
        
        // Call CoreWriter to pause on HyperCore
        coreWriter.pauseMarket(marketId);
        
        emit MarketPaused(block.timestamp);
    }
    
    /**
     * @notice Resume market trading
     */
    function resumeMarket() external {
        require(
            msg.sender == admin || 
            msg.sender == address(oracleAdapter),
            "Unauthorized"
        );
        
        marketConfig.isPaused = false;
        
        // Call CoreWriter to resume on HyperCore
        coreWriter.resumeMarket(marketId);
        
        emit MarketResumed(block.timestamp);
    }
    
    /**
     * @notice Toggle earnings mode (reduced leverage)
     * @param enabled Whether to enable earnings mode
     */
    function setEarningsMode(bool enabled) external onlyAdmin {
        marketConfig.isEarningsMode = enabled;
        
        // Update leverage tiers if entering earnings mode
        if (enabled) {
            _applyEarningsModeLeverage();
        } else {
            _restoreNormalLeverage();
        }
        
        // Notify CoreWriter
        coreWriter.updateMarketConfig(marketId, abi.encode(marketConfig));
        
        emit EarningsModeToggled(enabled, block.timestamp);
    }
    
    /**
     * @notice Update leverage tiers
     * @param tiers Array of new leverage tiers
     */
    function updateLeverageTiers(LeverageTier[] calldata tiers) external onlyAdmin {
        require(tiers.length > 0, "Empty tiers");
        
        delete leverageTiers;
        
        for (uint i = 0; i < tiers.length; i++) {
            require(tiers[i].maxLeverage > 0, "Invalid leverage");
            require(tiers[i].initialMargin <= BASIS_POINTS, "Invalid IM");
            require(tiers[i].maintenanceMargin <= tiers[i].initialMargin, "MM > IM");
            
            leverageTiers.push(tiers[i]);
        }
        
        emit LeverageTiersUpdated(tiers.length);
    }
    
    /**
     * @notice Check position health
     * @param account The trader's address
     * @return isHealthy Whether position meets margin requirements
     * @return healthFactor Position health factor (100% = fully collateralized)
     */
    function checkPositionHealth(address account) external view returns (
        bool isHealthy,
        uint256 healthFactor
    ) {
        Position memory pos = positions[account];
        
        if (pos.size == 0) {
            return (true, type(uint256).max);
        }
        
        // Get current price
        (int64 price,,) = oracleAdapter.getGMEPrice();
        uint256 markPrice = uint256(uint64(price));
        
        // Calculate unrealized PnL
        int256 unrealizedPnl = _calculatePnl(pos, markPrice);
        
        // Calculate equity (margin + unrealized PnL)
        uint256 equity = unrealizedPnl >= 0 
            ? pos.margin + uint256(unrealizedPnl)
            : pos.margin > uint256(-unrealizedPnl) 
                ? pos.margin - uint256(-unrealizedPnl)
                : 0;
        
        // Get maintenance margin requirement
        uint256 notionalValue = _abs(pos.size) * markPrice / PRICE_DECIMALS;
        LeverageTier memory tier = _getLeverageTier(notionalValue);
        uint256 maintenanceRequired = notionalValue * tier.maintenanceMargin / BASIS_POINTS;
        
        isHealthy = equity >= maintenanceRequired;
        healthFactor = maintenanceRequired > 0 
            ? (equity * BASIS_POINTS) / maintenanceRequired 
            : type(uint256).max;
    }
    
    /**
     * @notice Calculate liquidation price for a position
     * @param position The position to check
     * @return liquidationPrice The price at which position will be liquidated
     */
    function liquidationPrice(Position memory position) external pure returns (uint256) {
        if (position.size == 0) {
            return 0;
        }
        
        // For longs: liquidation when mark falls to entry - (margin / size)
        // For shorts: liquidation when mark rises to entry + (margin / size)
        
        uint256 marginPerUnit = (position.margin * PRICE_DECIMALS) / _abs(position.size);
        
        if (position.size > 0) {
            // Long position
            return position.avgEntryPrice > marginPerUnit 
                ? position.avgEntryPrice - marginPerUnit 
                : 0;
        } else {
            // Short position
            return position.avgEntryPrice + marginPerUnit;
        }
    }
    
    /**
     * @notice Liquidate an unhealthy position
     * @param trader The position owner to liquidate
     */
    function liquidatePosition(address trader) external onlyLiquidator marketNotPaused {
        Position storage pos = positions[trader];
        require(pos.size != 0, "No position");
        
        // Check if position is unhealthy
        (bool isHealthy,) = this.checkPositionHealth(trader);
        require(!isHealthy, "Position healthy");
        
        // Get current price
        (int64 price,,) = oracleAdapter.getGMEPrice();
        uint256 markPrice = uint256(uint64(price));
        
        // Calculate final PnL
        int256 pnl = _calculatePnl(pos, markPrice);
        
        // Update open interest
        _updateOpenInterest(-pos.size);
        
        // Clear position
        delete positions[trader];
        
        // Pay liquidator reward (from remaining margin if any)
        uint256 liquidatorReward = pos.margin / 10; // 10% of margin
        if (liquidatorReward > 0) {
            payable(msg.sender).transfer(liquidatorReward);
        }
        
        emit PositionLiquidated(trader, msg.sender, pnl);
    }
    
    /**
     * @notice Update funding rate based on market skew
     */
    function updateFundingRate() external onlyKeeper {
        require(block.timestamp >= lastFundingUpdate + 3600, "Too soon");
        
        // Calculate skew
        int256 skew = totalLongOpenInterest - totalShortOpenInterest;
        int256 totalOI = totalLongOpenInterest + totalShortOpenInterest;
        
        if (totalOI == 0) {
            marketConfig.fundingRate = 10; // Default rate
        } else {
            // Funding rate proportional to skew
            int256 skewRatio = (skew * int256(BASIS_POINTS)) / totalOI;
            
            // Convert to funding rate (positive = longs pay shorts)
            uint256 newRate = uint256(_abs(skewRatio) / 100); // Scale down
            
            // Cap at max funding rate
            if (newRate > MAX_FUNDING_RATE) {
                newRate = MAX_FUNDING_RATE;
            }
            
            marketConfig.fundingRate = newRate;
        }
        
        lastFundingUpdate = block.timestamp;
        
        // Update on CoreWriter
        coreWriter.setFundingRate(marketId, marketConfig.fundingRate);
        
        emit FundingRateUpdated(marketConfig.fundingRate, skew);
    }
    
    // Internal functions
    
    function _initializeDefaultTiers() internal {
        leverageTiers.push(LeverageTier({
            maxPositionSize: 10000 * PRICE_DECIMALS,
            maxLeverage: 2000, // 20x
            initialMargin: 500, // 5%
            maintenanceMargin: 250 // 2.5%
        }));
        
        leverageTiers.push(LeverageTier({
            maxPositionSize: 50000 * PRICE_DECIMALS,
            maxLeverage: 1500, // 15x
            initialMargin: 667, // 6.67%
            maintenanceMargin: 333 // 3.33%
        }));
        
        leverageTiers.push(LeverageTier({
            maxPositionSize: 100000 * PRICE_DECIMALS,
            maxLeverage: 1000, // 10x
            initialMargin: 1000, // 10%
            maintenanceMargin: 500 // 5%
        }));
        
        leverageTiers.push(LeverageTier({
            maxPositionSize: 500000 * PRICE_DECIMALS,
            maxLeverage: 500, // 5x
            initialMargin: 2000, // 20%
            maintenanceMargin: 1000 // 10%
        }));
    }
    
    function _applyEarningsModeLeverage() internal {
        for (uint i = 0; i < leverageTiers.length; i++) {
            leverageTiers[i].maxLeverage = 
                (leverageTiers[i].maxLeverage * EARNINGS_MODE_LEVERAGE_REDUCTION) / BASIS_POINTS;
            leverageTiers[i].initialMargin = 
                (leverageTiers[i].initialMargin * BASIS_POINTS) / EARNINGS_MODE_LEVERAGE_REDUCTION;
        }
    }
    
    function _restoreNormalLeverage() internal {
        _initializeDefaultTiers();
    }
    
    function _getLeverageTier(uint256 positionSize) internal view returns (LeverageTier memory) {
        for (uint i = 0; i < leverageTiers.length; i++) {
            if (positionSize <= leverageTiers[i].maxPositionSize) {
                return leverageTiers[i];
            }
        }
        return leverageTiers[leverageTiers.length - 1];
    }
    
    function _calculatePnl(Position memory pos, uint256 markPrice) internal pure returns (int256) {
        if (pos.size > 0) {
            // Long PnL = size * (mark - entry) / entry
            return pos.size * int256(markPrice - pos.avgEntryPrice) / int256(pos.avgEntryPrice);
        } else {
            // Short PnL = -size * (mark - entry) / entry
            return -pos.size * int256(pos.avgEntryPrice - markPrice) / int256(pos.avgEntryPrice);
        }
    }
    
    function _updateOpenInterest(int256 sizeDelta) internal {
        totalOpenInterest += sizeDelta;
        
        if (sizeDelta > 0) {
            totalLongOpenInterest += sizeDelta;
        } else {
            totalShortOpenInterest += -sizeDelta;
        }
    }
    
    function _abs(int256 value) internal pure returns (uint256) {
        return value >= 0 ? uint256(value) : uint256(-value);
    }
    
    // Admin functions
    
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
    
    function setKeeper(address newKeeper) external onlyAdmin {
        keeper = newKeeper;
    }
    
    function addLiquidator(address liquidator) external onlyAdmin {
        liquidators[liquidator] = true;
    }
    
    function removeLiquidator(address liquidator) external onlyAdmin {
        liquidators[liquidator] = false;
    }
    
    function updateMarketConfig(MarketConfig calldata config) external onlyAdmin {
        marketConfig = config;
        coreWriter.updateMarketConfig(marketId, abi.encode(config));
    }
}