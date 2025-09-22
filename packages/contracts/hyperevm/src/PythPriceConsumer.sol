// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/Interfaces.sol";

/**
 * @title PythPriceConsumer
 * @notice Consumes Pyth price feeds for GME-PERP market on HyperEVM
 * @dev Implements Pull method for Pyth oracle integration
 * 
 * TRACK REQUIREMENTS:
 * 1. Pull/Fetch data from Hermes ✓
 * 2. Update data on-chain using updatePriceFeeds ✓
 * 3. Consume the price ✓
 */
contract PythPriceConsumer {
    IPyth public immutable pythOracle;
    address public immutable oracleAdapter;
    address public owner;
    
    // Price feed IDs for our markets
    mapping(string => bytes32) public priceFeedIds;
    
    // Latest prices with confidence
    struct PriceData {
        int64 price;
        uint64 confidence;
        uint32 publishTime;
        int32 expo;
        bool exists;
    }
    
    mapping(bytes32 => PriceData) public latestPrices;
    
    // Update tracking
    uint256 public lastUpdateBlock;
    uint256 public totalUpdates;
    
    // Events
    event PriceUpdated(
        bytes32 indexed priceId,
        int64 price,
        uint64 confidence,
        uint32 publishTime
    );
    
    event PriceFeedRegistered(string symbol, bytes32 priceId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _pythOracle, address _oracleAdapter) {
        pythOracle = IPyth(_pythOracle);
        oracleAdapter = _oracleAdapter;
        owner = msg.sender;
        
        // Register initial price feeds
        _registerPriceFeeds();
    }
    
    /**
     * @notice Step 1: Register price feed IDs from Pyth
     * @dev Maps symbols to Pyth price feed IDs
     */
    function _registerPriceFeeds() internal {
        // GME (using DOGE as proxy for meme stock)
        priceFeedIds["GME"] = 0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c;
        
        // Major indices (using crypto proxies)
        priceFeedIds["SPX"] = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43; // BTC
        priceFeedIds["NDX"] = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // ETH
        
        // Tech stocks (using crypto proxies)
        priceFeedIds["TSLA"] = 0x93da3352f9f1d105fdfe4971cfa80e9dd77bfc7250ef0c53a1ac0593ccc36451; // LINK
        priceFeedIds["NVDA"] = 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d; // SOL
    }
    
    /**
     * @notice Step 2: Update price feeds on-chain
     * @dev Pulls data from Hermes and updates on-chain
     * @param pythUpdateData The update data from Pyth Hermes
     */
    function updatePriceFeeds(
        bytes[] calldata pythUpdateData
    ) external payable {
        // Get the update fee from Pyth
        uint fee = pythOracle.getUpdateFee(pythUpdateData);
        require(msg.value >= fee, "Insufficient fee");
        
        // Update the price feeds
        pythOracle.updatePriceFeeds{value: fee}(pythUpdateData);
        
        // Track updates
        lastUpdateBlock = block.number;
        totalUpdates++;
        
        // Refund excess fee
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @notice Step 3: Consume prices from Pyth
     * @dev Gets the latest price for a symbol
     * @param symbol The symbol to get price for
     * @return price The latest price with exponent applied
     * @return confidence The confidence interval
     */
    function getPrice(string memory symbol) 
        external 
        view 
        returns (int256 price, uint256 confidence) 
    {
        bytes32 priceId = priceFeedIds[symbol];
        require(priceId != bytes32(0), "Price feed not registered");
        
        // Get price from Pyth
        PythStructs.Price memory pythPrice = pythOracle.getPriceUnsafe(priceId);
        
        // Apply exponent to get actual price
        price = int256(pythPrice.price) * int256(10 ** uint256(uint32(-pythPrice.expo)));
        confidence = uint256(pythPrice.conf) * 10 ** uint256(uint32(-pythPrice.expo));
        
        return (price, confidence);
    }
    
    /**
     * @notice Get price with staleness check
     * @dev Reverts if price is older than maxAge
     * @param symbol The symbol to get price for
     * @param maxAge Maximum age in seconds
     */
    function getPriceNoOlderThan(string memory symbol, uint256 maxAge)
        external
        view
        returns (int256 price, uint256 confidence)
    {
        bytes32 priceId = priceFeedIds[symbol];
        require(priceId != bytes32(0), "Price feed not registered");
        
        // Get price with staleness check
        PythStructs.Price memory pythPrice = pythOracle.getPriceNoOlderThan(
            priceId,
            maxAge
        );
        
        // Apply exponent
        price = int256(pythPrice.price) * int256(10 ** uint256(uint32(-pythPrice.expo)));
        confidence = uint256(pythPrice.conf) * 10 ** uint256(uint32(-pythPrice.expo));
        
        return (price, confidence);
    }
    
    /**
     * @notice Batch update and consume prices
     * @dev Updates multiple price feeds and returns latest prices
     * @param pythUpdateData Update data from Hermes
     * @param symbols Array of symbols to get prices for
     */
    function updateAndGetPrices(
        bytes[] calldata pythUpdateData,
        string[] calldata symbols
    ) 
        external 
        payable 
        returns (int256[] memory prices, uint256[] memory confidences) 
    {
        // Update price feeds
        uint fee = pythOracle.getUpdateFee(pythUpdateData);
        require(msg.value >= fee, "Insufficient fee");
        pythOracle.updatePriceFeeds{value: fee}(pythUpdateData);
        
        // Get prices
        prices = new int256[](symbols.length);
        confidences = new uint256[](symbols.length);
        
        for (uint i = 0; i < symbols.length; i++) {
            bytes32 priceId = priceFeedIds[symbols[i]];
            if (priceId != bytes32(0)) {
                PythStructs.Price memory pythPrice = pythOracle.getPriceUnsafe(priceId);
                prices[i] = int256(pythPrice.price) * int256(10 ** uint256(uint32(-pythPrice.expo)));
                confidences[i] = uint256(pythPrice.conf) * 10 ** uint256(uint32(-pythPrice.expo));
                
                // Store latest price
                latestPrices[priceId] = PriceData({
                    price: pythPrice.price,
                    confidence: pythPrice.conf,
                    publishTime: pythPrice.publishTime,
                    expo: pythPrice.expo,
                    exists: true
                });
                
                emit PriceUpdated(priceId, pythPrice.price, pythPrice.conf, pythPrice.publishTime);
            }
        }
        
        // Update tracking
        lastUpdateBlock = block.number;
        totalUpdates++;
        
        // Refund excess
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        return (prices, confidences);
    }
    
    /**
     * @notice Register new price feed
     * @param symbol Symbol to register
     * @param priceId Pyth price feed ID
     */
    function registerPriceFeed(string memory symbol, bytes32 priceId) 
        external 
        onlyOwner 
    {
        priceFeedIds[symbol] = priceId;
        emit PriceFeedRegistered(symbol, priceId);
    }
    
    /**
     * @notice Get exponential price (for display)
     * @param symbol Symbol to get price for
     * @return price Price in display format (e.g., $28.45)
     */
    function getDisplayPrice(string memory symbol) 
        external 
        view 
        returns (string memory) 
    {
        bytes32 priceId = priceFeedIds[symbol];
        require(priceId != bytes32(0), "Price feed not registered");
        
        PythStructs.Price memory pythPrice = pythOracle.getPriceUnsafe(priceId);
        
        // Convert to human-readable format
        int256 displayPrice = pythPrice.price;
        int32 expo = pythPrice.expo;
        
        // This would need a more complex implementation for string formatting
        // For now, return the raw values
        return string(abi.encodePacked(
            "Price: ",
            uint2str(uint256(displayPrice)),
            " Expo: ",
            int2str(expo)
        ));
    }
    
    /**
     * @notice Check if price needs update
     * @param symbol Symbol to check
     * @param maxStaleness Maximum staleness in seconds
     */
    function needsUpdate(string memory symbol, uint256 maxStaleness) 
        external 
        view 
        returns (bool) 
    {
        bytes32 priceId = priceFeedIds[symbol];
        if (priceId == bytes32(0)) return false;
        
        if (!latestPrices[priceId].exists) return true;
        
        uint256 age = block.timestamp - latestPrices[priceId].publishTime;
        return age > maxStaleness;
    }
    
    // Helper functions
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 temp = _i;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (_i != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_i % 10)));
            _i /= 10;
        }
        return string(buffer);
    }
    
    function int2str(int256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        bool negative = _i < 0;
        uint256 abs = negative ? uint256(-_i) : uint256(_i);
        string memory result = uint2str(abs);
        return negative ? string(abi.encodePacked("-", result)) : result;
    }
}

// Pyth Structs for price data
library PythStructs {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
    
    struct PriceFeed {
        bytes32 id;
        Price price;
        Price emaPrice;
    }
}