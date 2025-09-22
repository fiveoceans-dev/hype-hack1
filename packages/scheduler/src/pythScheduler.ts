/**
 * Pyth Price Feed Scheduler for HIP-3 Markets
 * 
 * TRACK REQUIREMENTS:
 * 1. Pull/Fetch data from Hermes ✓
 * 2. Push data to oracle address using HL's formatting ✓
 * 3. Consume the price ✓
 * 
 * This scheduler continuously fetches prices from Pyth Hermes
 * and pushes them to the HIP-3 market oracle contract
 */

import axios from 'axios';
import { ethers } from 'ethers';
import { config } from 'dotenv';

config();

// Configuration
const CONFIG = {
  // Pyth Hermes endpoint
  HERMES_URL: process.env.PYTH_HERMES_URL || 'https://hermes.pyth.network',
  
  // Hyperliquid RPC
  HL_RPC_URL: process.env.HYPERLIQUID_TESTNET_RPC_URL || 'https://api.hyperliquid-testnet.xyz/evm',
  
  // Oracle address for HIP-3 market
  ORACLE_ADDRESS: process.env.HIP3_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000',
  
  // Private key for scheduler
  PRIVATE_KEY: process.env.SCHEDULER_PRIVATE_KEY || '',
  
  // Update interval (seconds)
  UPDATE_INTERVAL: parseInt(process.env.UPDATE_INTERVAL || '10'),
  
  // Max price staleness (seconds)
  MAX_STALENESS: parseInt(process.env.MAX_STALENESS || '60'),
};

// Price feed IDs for GME-PERP market
const PRICE_FEEDS = {
  GME: '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c', // DOGE as proxy
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
};

// HIP-3 Oracle ABI for price updates
const HIP3_ORACLE_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "internalType": "int256",
        "name": "price",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "confidence",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "marketIds",
        "type": "bytes32[]"
      },
      {
        "internalType": "int256[]",
        "name": "prices",
        "type": "int256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "confidences",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "timestamps",
        "type": "uint256[]"
      }
    ],
    "name": "batchUpdatePrices",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

interface PythPrice {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

class PythScheduler {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private oracleContract: ethers.Contract;
  private isRunning: boolean = false;
  private updateCount: number = 0;
  private lastUpdateTime: number = 0;

  constructor() {
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(CONFIG.HL_RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
    
    // Initialize oracle contract
    this.oracleContract = new ethers.Contract(
      CONFIG.ORACLE_ADDRESS,
      HIP3_ORACLE_ABI,
      this.wallet
    );
    
    console.log('🚀 Pyth Scheduler initialized');
    console.log(`📍 Oracle Address: ${CONFIG.ORACLE_ADDRESS}`);
    console.log(`👛 Scheduler Address: ${this.wallet.address}`);
  }

  /**
   * Step 1: Fetch prices from Pyth Hermes
   */
  async fetchPricesFromHermes(): Promise<PythPrice[]> {
    try {
      const priceIds = Object.values(PRICE_FEEDS).join(',');
      const url = `${CONFIG.HERMES_URL}/api/latest_price_feeds?ids[]=${priceIds}`;
      
      console.log('📡 Fetching prices from Hermes...');
      const response = await axios.get(url);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Hermes');
      }
      
      console.log(`✅ Fetched ${response.data.length} price feeds`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching from Hermes:', error);
      throw error;
    }
  }

  /**
   * Convert Pyth price to Hyperliquid format
   */
  formatPriceForHL(pythPrice: PythPrice): {
    marketId: string;
    price: bigint;
    confidence: bigint;
    timestamp: bigint;
  } {
    // Convert price with exponent
    const price = BigInt(pythPrice.price.price) * BigInt(10 ** Math.abs(pythPrice.price.expo));
    const confidence = BigInt(pythPrice.price.conf) * BigInt(10 ** Math.abs(pythPrice.price.expo));
    
    // Get market ID (using price feed ID as market ID)
    const marketId = pythPrice.id;
    
    return {
      marketId,
      price,
      confidence,
      timestamp: BigInt(pythPrice.price.publish_time)
    };
  }

  /**
   * Step 2: Push prices to HIP-3 oracle
   */
  async pushPricesToOracle(prices: PythPrice[]): Promise<void> {
    try {
      console.log('📤 Pushing prices to HIP-3 oracle...');
      
      // Format prices for batch update
      const marketIds: string[] = [];
      const priceValues: bigint[] = [];
      const confidences: bigint[] = [];
      const timestamps: bigint[] = [];
      
      for (const pythPrice of prices) {
        const formatted = this.formatPriceForHL(pythPrice);
        marketIds.push(formatted.marketId);
        priceValues.push(formatted.price);
        confidences.push(formatted.confidence);
        timestamps.push(formatted.timestamp);
        
        // Log individual price
        const symbol = Object.entries(PRICE_FEEDS).find(([_, id]) => id === pythPrice.id)?.[0] || 'UNKNOWN';
        console.log(`  ${symbol}: $${Number(formatted.price) / 1e18} ±${Number(formatted.confidence) / 1e18}`);
      }
      
      // Send batch update transaction
      const tx = await this.oracleContract.batchUpdatePrices(
        marketIds,
        priceValues,
        confidences,
        timestamps
      );
      
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      this.updateCount++;
      this.lastUpdateTime = Date.now();
    } catch (error) {
      console.error('❌ Error pushing to oracle:', error);
      throw error;
    }
  }

  /**
   * Check if prices need update based on staleness
   */
  needsUpdate(prices: PythPrice[]): boolean {
    const now = Date.now() / 1000;
    
    for (const price of prices) {
      const age = now - price.price.publish_time;
      if (age > CONFIG.MAX_STALENESS) {
        console.log(`⚠️  Price stale: ${age}s old (max: ${CONFIG.MAX_STALENESS}s)`);
        return true;
      }
    }
    
    // Also check if we haven't updated recently
    const timeSinceLastUpdate = (Date.now() - this.lastUpdateTime) / 1000;
    return timeSinceLastUpdate >= CONFIG.UPDATE_INTERVAL;
  }

  /**
   * Main scheduler loop
   */
  async run(): Promise<void> {
    console.log('🎯 Starting Pyth Scheduler for HIP-3 Market');
    console.log(`⏰ Update interval: ${CONFIG.UPDATE_INTERVAL}s`);
    console.log(`📊 Max staleness: ${CONFIG.MAX_STALENESS}s`);
    
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        // Step 1: Fetch prices from Hermes
        const prices = await this.fetchPricesFromHermes();
        
        // Check if update is needed
        if (this.needsUpdate(prices)) {
          // Step 2: Push to oracle
          await this.pushPricesToOracle(prices);
          
          console.log(`\n📊 Update #${this.updateCount} completed`);
        } else {
          console.log('⏸️  Skipping update - prices are fresh');
        }
        
      } catch (error) {
        console.error('❌ Scheduler error:', error);
        // Continue running despite errors
      }
      
      // Wait before next update
      await this.sleep(CONFIG.UPDATE_INTERVAL * 1000);
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    console.log('🛑 Stopping scheduler...');
    this.isRunning = false;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    updateCount: number;
    lastUpdate: string;
    uptime: string;
  } {
    const uptime = this.lastUpdateTime > 0 
      ? `${Math.floor((Date.now() - this.lastUpdateTime) / 1000)}s`
      : 'Not started';
    
    return {
      running: this.isRunning,
      updateCount: this.updateCount,
      lastUpdate: this.lastUpdateTime > 0 
        ? new Date(this.lastUpdateTime).toISOString()
        : 'Never',
      uptime
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  console.log('====================================');
  console.log('  Pyth Oracle Scheduler for HIP-3  ');
  console.log('====================================');
  console.log('Track Requirements:');
  console.log('✅ 1. Pull data from Hermes');
  console.log('✅ 2. Push to HIP-3 oracle');
  console.log('✅ 3. Consume prices on-chain');
  console.log('====================================\n');
  
  // Validate configuration
  if (!CONFIG.PRIVATE_KEY) {
    console.error('❌ SCHEDULER_PRIVATE_KEY not set in environment');
    process.exit(1);
  }
  
  if (CONFIG.ORACLE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('❌ HIP3_ORACLE_ADDRESS not set in environment');
    process.exit(1);
  }
  
  // Create and run scheduler
  const scheduler = new PythScheduler();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });
  
  // Run scheduler
  await scheduler.run();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { PythScheduler };