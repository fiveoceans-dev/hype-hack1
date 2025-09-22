/**
 * HIP-3 Deployment Script for GME-PERP Market
 * 
 * This script deploys a new perpetual market on Hyperliquid using HIP-3
 * It configures the market with custom parameters for synthetic GME trading
 */

import { ethers } from 'ethers';
import marketConfig from './GMEPerpMarket.json';

// Hyperliquid testnet configuration
const HYPERLIQUID_TESTNET_RPC = process.env.HYPERLIQUID_TESTNET_RPC_URL || 'https://api.hyperliquid-testnet.xyz/evm';
const PRIVATE_KEY = process.env.HYPERLIQUID_PRIVATE_KEY;

// HIP-3 Market Factory address (example - would be provided by Hyperliquid)
const MARKET_FACTORY_ADDRESS = '0x0000000000000000000000000000000000001337';

// Contract ABIs
const MARKET_FACTORY_ABI = [
    'function deployPerpetualMarket(bytes32 marketId, bytes calldata config) external returns (address)',
    'function registerOracle(bytes32 marketId, address oracleAdapter) external',
    'function setRiskParameters(bytes32 marketId, bytes calldata riskParams) external',
    'function enableMarket(bytes32 marketId) external',
    'function getMarket(bytes32 marketId) external view returns (address)',
    'event MarketDeployed(bytes32 indexed marketId, address indexed marketAddress)',
];

interface DeploymentResult {
    marketId: string;
    marketAddress: string;
    oracleAdapter: string;
    riskManager: string;
    coreWriter: string;
    transactionHash: string;
    blockNumber: number;
}

/**
 * Deploy GME-PERP market via HIP-3
 */
async function deployGMEPerpMarket(): Promise<DeploymentResult> {
    console.log('🚀 Starting GME-PERP market deployment via HIP-3...\n');
    
    // Validate environment
    if (!PRIVATE_KEY) {
        throw new Error('Missing HYPERLIQUID_PRIVATE_KEY environment variable');
    }
    
    // Connect to Hyperliquid testnet
    const provider = new ethers.JsonRpcProvider(HYPERLIQUID_TESTNET_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`📍 Deployer address: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH\n`);
    
    // Connect to Market Factory
    const marketFactory = new ethers.Contract(
        MARKET_FACTORY_ADDRESS,
        MARKET_FACTORY_ABI,
        wallet
    );
    
    // Generate market ID from symbol
    const marketId = ethers.id(marketConfig.marketId);
    console.log(`🏷️ Market ID: ${marketId}`);
    
    // Step 1: Encode market configuration
    console.log('\n📝 Encoding market configuration...');
    const encodedConfig = encodeMarketConfig(marketConfig);
    
    // Step 2: Deploy the perpetual market
    console.log('\n🔨 Deploying perpetual market...');
    const deployTx = await marketFactory.deployPerpetualMarket(marketId, encodedConfig);
    console.log(`  Transaction hash: ${deployTx.hash}`);
    
    const deployReceipt = await deployTx.wait();
    console.log(`  ✅ Market deployed at block ${deployReceipt.blockNumber}`);
    
    // Get market address from events
    const marketDeployedEvent = deployReceipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('MarketDeployed(bytes32,address)')
    );
    
    const marketAddress = ethers.getAddress('0x' + marketDeployedEvent.topics[2].slice(26));
    console.log(`  📍 Market address: ${marketAddress}`);
    
    // Step 3: Deploy and register Oracle Adapter
    console.log('\n🔮 Deploying Oracle Adapter...');
    const oracleAdapter = await deployOracleAdapter(wallet, marketId);
    
    console.log('  Registering oracle with market...');
    const registerOracleTx = await marketFactory.registerOracle(marketId, oracleAdapter);
    await registerOracleTx.wait();
    console.log('  ✅ Oracle registered');
    
    // Step 4: Deploy and configure Risk Manager
    console.log('\n⚠️ Deploying Risk Manager...');
    const riskManager = await deployRiskManager(wallet, marketId, oracleAdapter);
    
    // Step 5: Deploy CoreWriter implementation
    console.log('\n✍️ Deploying CoreWriter...');
    const coreWriter = await deployCoreWriter(wallet, marketId);
    
    // Step 6: Set risk parameters
    console.log('\n📊 Configuring risk parameters...');
    const riskParams = encodeRiskParameters(marketConfig);
    const setRiskTx = await marketFactory.setRiskParameters(marketId, riskParams);
    await setRiskTx.wait();
    console.log('  ✅ Risk parameters configured');
    
    // Step 7: Enable the market
    console.log('\n🟢 Enabling market for trading...');
    const enableTx = await marketFactory.enableMarket(marketId);
    const enableReceipt = await enableTx.wait();
    console.log('  ✅ Market enabled');
    
    // Update deployment info
    const result: DeploymentResult = {
        marketId: marketConfig.marketId,
        marketAddress,
        oracleAdapter,
        riskManager,
        coreWriter,
        transactionHash: enableReceipt.hash,
        blockNumber: enableReceipt.blockNumber,
    };
    
    // Save deployment info
    await saveDeploymentInfo(result);
    
    console.log('\n🎉 GME-PERP market successfully deployed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Market ID:      ${result.marketId}`);
    console.log(`Market Address: ${result.marketAddress}`);
    console.log(`Oracle:         ${result.oracleAdapter}`);
    console.log(`Risk Manager:   ${result.riskManager}`);
    console.log(`CoreWriter:     ${result.coreWriter}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return result;
}

/**
 * Encode market configuration for HIP-3
 */
function encodeMarketConfig(config: typeof marketConfig): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    return abiCoder.encode(
        [
            'string',   // name
            'string',   // symbol
            'string',   // description
            'address',  // collateral
            'uint8',    // collateral decimals
            'bytes32',  // oracle feed ID
            'uint256',  // max position size
            'uint256',  // min order size
            'int256',   // maker fee
            'uint256',  // taker fee
            'tuple(uint256,uint256,uint256,uint256,uint256)[]', // leverage tiers
        ],
        [
            config.name,
            config.symbol,
            config.description,
            config.collateral.address,
            config.collateral.decimals,
            config.oracle.feedId,
            config.limits.maxPositionSize,
            config.limits.minOrderSize,
            config.fees.maker,
            config.fees.taker,
            config.leverage.tiers.map(tier => [
                tier.minSize,
                tier.maxSize,
                tier.maxLeverage,
                tier.initialMargin,
                tier.maintenanceMargin,
            ]),
        ]
    );
}

/**
 * Encode risk parameters
 */
function encodeRiskParameters(config: typeof marketConfig): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    return abiCoder.encode(
        [
            'bool',     // auto deleveraging
            'uint256',  // ADL threshold
            'uint256',  // liquidation penalty
            'uint256',  // insurance fund contribution
            'uint256',  // max funding skew
            'uint256',  // funding interval
            'uint256',  // base funding rate
            'uint256',  // max funding rate
        ],
        [
            config.riskParameters.autoDeleveraging,
            config.riskParameters.adlThreshold,
            config.riskParameters.liquidationPenalty,
            config.riskParameters.insuranceFundContribution,
            config.riskParameters.maxFundingSkew,
            config.funding.interval,
            config.funding.baseRate,
            config.funding.maxRate,
        ]
    );
}

/**
 * Deploy Oracle Adapter contract
 */
async function deployOracleAdapter(
    wallet: ethers.Wallet,
    marketId: string
): Promise<string> {
    // In production, this would deploy the actual OracleAdapter.sol
    // For now, return a placeholder address
    const mockAddress = '0x' + ethers.keccak256(ethers.toUtf8Bytes('OracleAdapter')).slice(26);
    console.log(`  📍 Oracle Adapter: ${mockAddress}`);
    return mockAddress;
}

/**
 * Deploy Risk Manager contract
 */
async function deployRiskManager(
    wallet: ethers.Wallet,
    marketId: string,
    oracleAdapter: string
): Promise<string> {
    // In production, this would deploy the actual RiskManager.sol
    // For now, return a placeholder address
    const mockAddress = '0x' + ethers.keccak256(ethers.toUtf8Bytes('RiskManager')).slice(26);
    console.log(`  📍 Risk Manager: ${mockAddress}`);
    return mockAddress;
}

/**
 * Deploy CoreWriter implementation
 */
async function deployCoreWriter(
    wallet: ethers.Wallet,
    marketId: string
): Promise<string> {
    // In production, this would deploy the actual CoreWriter.sol
    // For now, return a placeholder address
    const mockAddress = '0x' + ethers.keccak256(ethers.toUtf8Bytes('CoreWriter')).slice(26);
    console.log(`  📍 CoreWriter: ${mockAddress}`);
    return mockAddress;
}

/**
 * Save deployment information to file
 */
async function saveDeploymentInfo(result: DeploymentResult): Promise<void> {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    
    const deploymentData = {
        ...marketConfig,
        deployment: {
            ...marketConfig.deployment,
            blockNumber: result.blockNumber,
            transactionHash: result.transactionHash,
            timestamp: new Date().toISOString(),
            deployer: result.marketAddress,
        },
        contracts: {
            ...marketConfig.contracts,
            marketAddress: result.marketAddress,
            oracleAdapter: result.oracleAdapter,
            riskManager: result.riskManager,
            coreWriter: result.coreWriter,
        },
    };
    
    const outputPath = path.join(__dirname, `deployment-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
    console.log(`\n💾 Deployment info saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
    try {
        await deployGMEPerpMarket();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    main();
}

export { deployGMEPerpMarket, DeploymentResult };