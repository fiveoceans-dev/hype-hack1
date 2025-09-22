// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPyth
 * @notice Interface for Pyth Network price oracle
 */
interface IPyth {
    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory price);
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint fee);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
}

/**
 * @title PythStructs
 * @notice Struct definitions for Pyth oracle
 */
library PythStructs {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
}

/**
 * @title IHyperCore
 * @notice Interface for HyperCore precompile
 */
interface IHyperCore {
    function getMarketInfo(bytes32 marketId) external view returns (
        bool exists,
        bool isPaused,
        address collateral,
        uint256 maxLeverage,
        uint256 makerFee,
        uint256 takerFee
    );
    
    function getPositionInfo(bytes32 marketId, address trader) external view returns (
        int256 size,
        uint256 margin,
        uint256 avgEntryPrice,
        uint256 lastUpdateTime
    );
    
    function executeOrder(
        bytes32 marketId,
        address trader,
        int256 size,
        uint256 price,
        uint256 margin
    ) external returns (bool success);
}

/**
 * @title IOracleAdapter
 * @notice Interface for Oracle Adapter contract
 */
interface IOracleAdapter {
    function getGMEPrice() external view returns (
        int64 price,
        uint64 confidence,
        uint256 timestamp
    );
    
    function validatePriceFreshness(uint256 publishTime) external view returns (bool isFresh);
    function calculateTWAP(uint256 duration) external view returns (int64 twapPrice);
    function checkPriceDeviation(int64 spotPrice, int64 twapPrice) external pure returns (bool isDeviated, uint256 deviationBps);
    function triggerCircuitBreaker(string calldata reason) external;
    function getOracleHealth() external view returns (bool isHealthy, uint256 lastUpdateTime, uint256 priceDeviation);
}

/**
 * @title IRiskManager
 * @notice Interface for Risk Manager contract
 */
interface IRiskManager {
    function pauseMarket() external;
    function resumeMarket() external;
    function setEarningsMode(bool enabled) external;
    function checkPositionHealth(address account) external view returns (bool isHealthy, uint256 healthFactor);
    function liquidatePosition(address trader) external;
    function updateFundingRate() external;
}

/**
 * @title ICoreWriter
 * @notice Interface for CoreWriter contract
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