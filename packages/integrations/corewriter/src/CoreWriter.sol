// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CoreWriter
 * @notice Interface to HyperCore for administrative write operations
 * @dev Allows HyperEVM contracts to modify HyperCore state for market management
 */
interface ICoreWriter {
    function pauseMarket(bytes32 marketId) external;
    function resumeMarket(bytes32 marketId) external;
    function updateMarketConfig(bytes32 marketId, bytes calldata config) external;
    function setFundingRate(bytes32 marketId, uint256 rate) external;
    function updateMarginRequirements(bytes32 marketId, uint256 initial, uint256 maintenance) external;
    function setMaxLeverage(bytes32 marketId, uint256 leverage) external;
    function updateFees(bytes32 marketId, int256 makerFee, uint256 takerFee) external;
    function setPositionLimits(bytes32 marketId, uint256 maxSize, uint256 minSize) external;
}

/**
 * @title CoreWriterImplementation
 * @notice Implements CoreWriter functionality for GME-PERP market administration
 * @dev This contract has privileged access to modify HyperCore state
 */
contract CoreWriterImplementation is ICoreWriter {
    // Events
    event MarketPaused(bytes32 indexed marketId, uint256 timestamp);
    event MarketResumed(bytes32 indexed marketId, uint256 timestamp);
    event MarketConfigUpdated(bytes32 indexed marketId, bytes config);
    event FundingRateUpdated(bytes32 indexed marketId, uint256 rate);
    event MarginRequirementsUpdated(bytes32 indexed marketId, uint256 initial, uint256 maintenance);
    event MaxLeverageUpdated(bytes32 indexed marketId, uint256 leverage);
    event FeesUpdated(bytes32 indexed marketId, int256 makerFee, uint256 takerFee);
    event PositionLimitsUpdated(bytes32 indexed marketId, uint256 maxSize, uint256 minSize);
    
    // State
    mapping(bytes32 => MarketState) public marketStates;
    mapping(address => bool) public authorizedCallers;
    address public admin;
    
    struct MarketState {
        bool isPaused;
        bool isEarningsMode;
        uint256 maxLeverage;
        uint256 initialMargin;
        uint256 maintenanceMargin;
        int256 makerFee;
        uint256 takerFee;
        uint256 fundingRate;
        uint256 maxPositionSize;
        uint256 minOrderSize;
        uint256 lastUpdateTime;
    }
    
    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == admin, "Unauthorized");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor(address _admin) {
        admin = _admin;
    }
    
    /**
     * @notice Pause trading on a market
     * @param marketId The market identifier
     */
    function pauseMarket(bytes32 marketId) external override onlyAuthorized {
        marketStates[marketId].isPaused = true;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // In production, this would call into HyperCore precompile
        _callHyperCore(
            abi.encodeWithSignature("pauseMarket(bytes32)", marketId)
        );
        
        emit MarketPaused(marketId, block.timestamp);
    }
    
    /**
     * @notice Resume trading on a market
     * @param marketId The market identifier
     */
    function resumeMarket(bytes32 marketId) external override onlyAuthorized {
        marketStates[marketId].isPaused = false;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // In production, this would call into HyperCore precompile
        _callHyperCore(
            abi.encodeWithSignature("resumeMarket(bytes32)", marketId)
        );
        
        emit MarketResumed(marketId, block.timestamp);
    }
    
    /**
     * @notice Update full market configuration
     * @param marketId The market identifier
     * @param config Encoded configuration data
     */
    function updateMarketConfig(bytes32 marketId, bytes calldata config) external override onlyAuthorized {
        // Decode and validate config
        MarketState memory newState = abi.decode(config, (MarketState));
        
        // Validate parameters
        require(newState.maxLeverage > 0 && newState.maxLeverage <= 100000, "Invalid leverage"); // Max 100x
        require(newState.initialMargin >= newState.maintenanceMargin, "IM < MM");
        require(newState.maxPositionSize > newState.minOrderSize, "Invalid size limits");
        
        // Update state
        marketStates[marketId] = newState;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // Update HyperCore
        _callHyperCore(
            abi.encodeWithSignature("updateMarketConfig(bytes32,bytes)", marketId, config)
        );
        
        emit MarketConfigUpdated(marketId, config);
    }
    
    /**
     * @notice Set funding rate for a market
     * @param marketId The market identifier
     * @param rate Funding rate in basis points per hour
     */
    function setFundingRate(bytes32 marketId, uint256 rate) external override onlyAuthorized {
        require(rate <= 100, "Rate too high"); // Max 1% per hour
        
        marketStates[marketId].fundingRate = rate;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // Update HyperCore
        _callHyperCore(
            abi.encodeWithSignature("setFundingRate(bytes32,uint256)", marketId, rate)
        );
        
        emit FundingRateUpdated(marketId, rate);
    }
    
    /**
     * @notice Update margin requirements
     * @param marketId The market identifier
     * @param initial Initial margin in basis points
     * @param maintenance Maintenance margin in basis points
     */
    function updateMarginRequirements(
        bytes32 marketId,
        uint256 initial,
        uint256 maintenance
    ) external override onlyAuthorized {
        require(initial >= maintenance, "IM < MM");
        require(initial <= 10000, "IM too high"); // Max 100%
        
        marketStates[marketId].initialMargin = initial;
        marketStates[marketId].maintenanceMargin = maintenance;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // Update HyperCore
        _callHyperCore(
            abi.encodeWithSignature(
                "updateMarginRequirements(bytes32,uint256,uint256)",
                marketId,
                initial,
                maintenance
            )
        );
        
        emit MarginRequirementsUpdated(marketId, initial, maintenance);
    }
    
    /**
     * @notice Set maximum leverage for a market
     * @param marketId The market identifier
     * @param leverage Max leverage in basis points (10000 = 1x)
     */
    function setMaxLeverage(bytes32 marketId, uint256 leverage) external override onlyAuthorized {
        require(leverage >= 10000 && leverage <= 1000000, "Invalid leverage"); // 1x to 100x
        
        marketStates[marketId].maxLeverage = leverage;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // Recalculate margin requirements based on leverage
        uint256 newInitialMargin = 10000 * 10000 / leverage; // BASIS_POINTS^2 / leverage
        uint256 newMaintenanceMargin = newInitialMargin / 2; // 50% of initial
        
        marketStates[marketId].initialMargin = newInitialMargin;
        marketStates[marketId].maintenanceMargin = newMaintenanceMargin;
        
        // Update HyperCore
        _callHyperCore(
            abi.encodeWithSignature("setMaxLeverage(bytes32,uint256)", marketId, leverage)
        );
        
        emit MaxLeverageUpdated(marketId, leverage);
    }
    
    /**
     * @notice Update trading fees
     * @param marketId The market identifier
     * @param makerFee Maker fee in basis points (negative for rebate)
     * @param takerFee Taker fee in basis points
     */
    function updateFees(
        bytes32 marketId,
        int256 makerFee,
        uint256 takerFee
    ) external override onlyAuthorized {
        require(makerFee >= -50 && makerFee <= 50, "Invalid maker fee"); // -0.5% to 0.5%
        require(takerFee <= 100, "Invalid taker fee"); // Max 1%
        
        marketStates[marketId].makerFee = makerFee;
        marketStates[marketId].takerFee = takerFee;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // Update HyperCore
        _callHyperCore(
            abi.encodeWithSignature(
                "updateFees(bytes32,int256,uint256)",
                marketId,
                makerFee,
                takerFee
            )
        );
        
        emit FeesUpdated(marketId, makerFee, takerFee);
    }
    
    /**
     * @notice Set position size limits
     * @param marketId The market identifier
     * @param maxSize Maximum position size
     * @param minSize Minimum order size
     */
    function setPositionLimits(
        bytes32 marketId,
        uint256 maxSize,
        uint256 minSize
    ) external override onlyAuthorized {
        require(maxSize > minSize, "Invalid limits");
        require(minSize > 0, "Min size must be positive");
        
        marketStates[marketId].maxPositionSize = maxSize;
        marketStates[marketId].minOrderSize = minSize;
        marketStates[marketId].lastUpdateTime = block.timestamp;
        
        // Update HyperCore
        _callHyperCore(
            abi.encodeWithSignature(
                "setPositionLimits(bytes32,uint256,uint256)",
                marketId,
                maxSize,
                minSize
            )
        );
        
        emit PositionLimitsUpdated(marketId, maxSize, minSize);
    }
    
    /**
     * @notice Toggle earnings mode for a market
     * @param marketId The market identifier
     * @param enabled Whether earnings mode is enabled
     */
    function setEarningsMode(bytes32 marketId, bool enabled) external onlyAuthorized {
        marketStates[marketId].isEarningsMode = enabled;
        
        if (enabled) {
            // Reduce leverage by 50% during earnings
            uint256 currentLeverage = marketStates[marketId].maxLeverage;
            uint256 earningsLeverage = currentLeverage / 2;
            
            setMaxLeverage(marketId, earningsLeverage);
            
            // Increase funding rate sensitivity
            uint256 currentFunding = marketStates[marketId].fundingRate;
            setFundingRate(marketId, currentFunding * 2);
        } else {
            // Restore normal parameters
            // These would be stored separately in production
            setMaxLeverage(marketId, 200000); // 20x default
            setFundingRate(marketId, 10); // 0.1% per hour default
        }
    }
    
    // Admin functions
    
    function addAuthorizedCaller(address caller) external onlyAdmin {
        authorizedCallers[caller] = true;
    }
    
    function removeAuthorizedCaller(address caller) external onlyAdmin {
        authorizedCallers[caller] = false;
    }
    
    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
    
    // Internal functions
    
    /**
     * @notice Call HyperCore precompile
     * @dev In production, this would use the actual precompile address
     * @param data The encoded function call
     */
    function _callHyperCore(bytes memory data) internal {
        // HyperCore precompile address (example)
        address hyperCore = address(0x1000);
        
        // Make the call
        (bool success,) = hyperCore.call(data);
        require(success, "HyperCore call failed");
    }
    
    /**
     * @notice Get current market state
     * @param marketId The market identifier
     * @return state The current market state
     */
    function getMarketState(bytes32 marketId) external view returns (MarketState memory) {
        return marketStates[marketId];
    }
    
    /**
     * @notice Check if market is active
     * @param marketId The market identifier
     * @return isActive Whether market is active and not paused
     */
    function isMarketActive(bytes32 marketId) external view returns (bool) {
        return !marketStates[marketId].isPaused;
    }
}