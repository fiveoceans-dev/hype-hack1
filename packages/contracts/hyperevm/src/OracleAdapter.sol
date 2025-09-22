// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/Interfaces.sol";

/**
 * @title OracleAdapter
 * @notice Integrates Pyth Network price feeds with Hyperliquid's HyperEVM
 * @dev Provides price validation, TWAP calculations, and circuit breaker functionality
 */
contract OracleAdapter {
    // Constants
    uint256 public constant MAX_PRICE_STALENESS = 10; // 10 seconds
    uint256 public constant MAX_DEVIATION_PERCENT = 1000; // 10% in basis points
    uint256 public constant TWAP_WINDOW = 300; // 5 minutes
    
    // State variables
    IPyth public immutable pythOracle;
    IHyperCore public immutable hyperCore;
    IRiskManager public immutable riskManager;
    
    bytes32 public immutable gmePriceFeedId;
    address public keeper;
    address public admin;
    
    // Circuit breaker state
    bool public circuitBreakerActive;
    uint256 public lastCircuitBreakerTimestamp;
    
    // Price history for TWAP
    struct PricePoint {
        int64 price;
        uint64 conf;
        uint256 timestamp;
    }
    
    PricePoint[] public priceHistory;
    uint256 public constant MAX_HISTORY_LENGTH = 60; // Keep 60 data points
    
    // Events
    event PriceUpdated(int64 price, uint64 confidence, uint256 timestamp);
    event CircuitBreakerTriggered(string reason, uint256 timestamp);
    event CircuitBreakerReset(uint256 timestamp);
    event TWAPCalculated(int64 twapPrice, uint256 window);
    event PriceDeviationDetected(int64 spotPrice, int64 twapPrice, uint256 deviation);
    
    // Modifiers
    modifier onlyKeeper() {
        require(msg.sender == keeper, "Only keeper can call");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }
    
    modifier circuitBreakerNotActive() {
        require(!circuitBreakerActive, "Circuit breaker is active");
        _;
    }
    
    constructor(
        address _pythOracle,
        address _hyperCore,
        address _riskManager,
        bytes32 _gmePriceFeedId,
        address _keeper,
        address _admin
    ) {
        pythOracle = IPyth(_pythOracle);
        hyperCore = IHyperCore(_hyperCore);
        riskManager = IRiskManager(_riskManager);
        gmePriceFeedId = _gmePriceFeedId;
        keeper = _keeper;
        admin = _admin;
    }
    
    /**
     * @notice Get the latest GME price from Pyth
     * @return price The price with 8 decimal precision
     * @return confidence The confidence interval
     * @return timestamp The price publish timestamp
     */
    function getGMEPrice() external view returns (
        int64 price,
        uint64 confidence,
        uint256 timestamp
    ) {
        PythStructs.Price memory pythPrice = pythOracle.getPriceUnsafe(gmePriceFeedId);
        
        // Validate freshness
        require(validatePriceFreshness(pythPrice.publishTime), "Price too stale");
        
        // Convert to 8 decimal precision if needed
        price = _normalizePrice(pythPrice.price, pythPrice.expo);
        confidence = uint64(_normalizePrice(int64(pythPrice.conf), pythPrice.expo));
        timestamp = pythPrice.publishTime;
        
        return (price, confidence, timestamp);
    }
    
    /**
     * @notice Update price and check for deviations
     * @param priceUpdateData The Pyth price update data
     */
    function updatePriceAndValidate(bytes[] calldata priceUpdateData) 
        external 
        payable 
        onlyKeeper 
        circuitBreakerNotActive 
    {
        // Get update fee from Pyth
        uint fee = pythOracle.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient fee");
        
        // Update the price
        pythOracle.updatePriceFeeds{value: fee}(priceUpdateData);
        
        // Get the updated price
        PythStructs.Price memory pythPrice = pythOracle.getPriceUnsafe(gmePriceFeedId);
        
        // Validate and store
        _validateAndStorePrice(pythPrice);
        
        // Refund excess fee
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @notice Calculate TWAP over specified duration
     * @param duration The duration in seconds (max TWAP_WINDOW)
     * @return twapPrice The time-weighted average price
     */
    function calculateTWAP(uint256 duration) public view returns (int64 twapPrice) {
        require(duration > 0 && duration <= TWAP_WINDOW, "Invalid duration");
        require(priceHistory.length > 0, "No price history");
        
        uint256 cutoffTime = block.timestamp - duration;
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = priceHistory.length; i > 0; i--) {
            PricePoint memory point = priceHistory[i - 1];
            
            if (point.timestamp < cutoffTime) break;
            
            uint256 weight = 1; // Could implement time-weighted logic
            weightedSum += uint256(uint64(point.price)) * weight;
            totalWeight += weight;
        }
        
        require(totalWeight > 0, "Insufficient price data");
        twapPrice = int64(weightedSum / totalWeight);
    }
    
    /**
     * @notice Check price deviation between spot and TWAP
     * @param spotPrice The current spot price
     * @param twapPrice The TWAP price
     * @return isDeviated Whether price deviation exceeds threshold
     * @return deviationBps Deviation in basis points
     */
    function checkPriceDeviation(int64 spotPrice, int64 twapPrice) 
        public 
        pure 
        returns (bool isDeviated, uint256 deviationBps) 
    {
        require(spotPrice > 0 && twapPrice > 0, "Invalid prices");
        
        uint256 deviation = spotPrice > twapPrice 
            ? uint256(spotPrice - twapPrice) 
            : uint256(twapPrice - spotPrice);
            
        deviationBps = (deviation * 10000) / uint256(uint64(twapPrice));
        isDeviated = deviationBps > MAX_DEVIATION_PERCENT;
    }
    
    /**
     * @notice Trigger circuit breaker
     * @param reason The reason for triggering
     */
    function triggerCircuitBreaker(string calldata reason) external onlyKeeper {
        require(!circuitBreakerActive, "Already active");
        
        circuitBreakerActive = true;
        lastCircuitBreakerTimestamp = block.timestamp;
        
        // Notify risk manager to pause market
        riskManager.pauseMarket();
        
        emit CircuitBreakerTriggered(reason, block.timestamp);
    }
    
    /**
     * @notice Reset circuit breaker
     */
    function resetCircuitBreaker() external onlyAdmin {
        require(circuitBreakerActive, "Not active");
        require(
            block.timestamp >= lastCircuitBreakerTimestamp + 300, 
            "Must wait 5 minutes"
        );
        
        circuitBreakerActive = false;
        
        // Notify risk manager to resume market
        riskManager.resumeMarket();
        
        emit CircuitBreakerReset(block.timestamp);
    }
    
    /**
     * @notice Validate price freshness
     * @param publishTime The price publish timestamp
     * @return isFresh Whether the price is fresh enough
     */
    function validatePriceFreshness(uint256 publishTime) public view returns (bool isFresh) {
        return block.timestamp - publishTime <= MAX_PRICE_STALENESS;
    }
    
    /**
     * @notice Get oracle health status
     * @return isHealthy Overall health status
     * @return lastUpdateTime Last successful update
     * @return priceDeviation Current price deviation from TWAP
     */
    function getOracleHealth() external view returns (
        bool isHealthy,
        uint256 lastUpdateTime,
        uint256 priceDeviation
    ) {
        if (priceHistory.length == 0) {
            return (false, 0, 0);
        }
        
        PricePoint memory lastPrice = priceHistory[priceHistory.length - 1];
        lastUpdateTime = lastPrice.timestamp;
        
        // Check freshness
        isHealthy = validatePriceFreshness(lastUpdateTime) && !circuitBreakerActive;
        
        // Calculate deviation if we have enough history
        if (priceHistory.length >= 5) {
            int64 twap = calculateTWAP(60); // 1 minute TWAP
            (, priceDeviation) = checkPriceDeviation(lastPrice.price, twap);
        }
    }
    
    // Internal functions
    
    function _validateAndStorePrice(PythStructs.Price memory pythPrice) internal {
        // Check freshness
        require(validatePriceFreshness(pythPrice.publishTime), "Price too stale");
        
        // Normalize price
        int64 normalizedPrice = _normalizePrice(pythPrice.price, pythPrice.expo);
        uint64 normalizedConf = uint64(_normalizePrice(int64(pythPrice.conf), pythPrice.expo));
        
        // Store in history
        priceHistory.push(PricePoint({
            price: normalizedPrice,
            conf: normalizedConf,
            timestamp: pythPrice.publishTime
        }));
        
        // Trim history if too long
        if (priceHistory.length > MAX_HISTORY_LENGTH) {
            for (uint i = 0; i < priceHistory.length - MAX_HISTORY_LENGTH; i++) {
                priceHistory[i] = priceHistory[i + 1];
            }
            for (uint i = 0; i < priceHistory.length - MAX_HISTORY_LENGTH; i++) {
                priceHistory.pop();
            }
        }
        
        // Check for deviation if we have enough history
        if (priceHistory.length >= 5) {
            int64 twap = calculateTWAP(60); // 1 minute TWAP
            (bool isDeviated, uint256 deviationBps) = checkPriceDeviation(normalizedPrice, twap);
            
            if (isDeviated) {
                emit PriceDeviationDetected(normalizedPrice, twap, deviationBps);
                
                // Auto-trigger circuit breaker on extreme deviation
                if (deviationBps > MAX_DEVIATION_PERCENT * 2) {
                    circuitBreakerActive = true;
                    lastCircuitBreakerTimestamp = block.timestamp;
                    riskManager.pauseMarket();
                    emit CircuitBreakerTriggered("Extreme price deviation", block.timestamp);
                }
            }
        }
        
        emit PriceUpdated(normalizedPrice, normalizedConf, pythPrice.publishTime);
    }
    
    function _normalizePrice(int64 price, int32 expo) internal pure returns (int64) {
        // Normalize to 8 decimal places
        int32 targetExpo = -8;
        int32 expoDiff = targetExpo - expo;
        
        if (expoDiff > 0) {
            return price / int64(10 ** uint32(expoDiff));
        } else if (expoDiff < 0) {
            return price * int64(10 ** uint32(-expoDiff));
        } else {
            return price;
        }
    }
    
    // Admin functions
    
    function updateKeeper(address newKeeper) external onlyAdmin {
        keeper = newKeeper;
    }
    
    function updateAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}