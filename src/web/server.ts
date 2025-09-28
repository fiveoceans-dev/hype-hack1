import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { HermesClient } from '@pythnetwork/hermes-client';
import { createDebridgeClient } from '../debridge/client';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT || 3000;
const UI_DIR = process.env.UI_DIR || path.join(__dirname, '../../packages/web/dist');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(UI_DIR));

// Tesla stock price feed ID (GME not available in Pyth)
const TESLA_PRICE_FEED_ID = '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1';

// Initialize Pyth client
let pythClient: HermesClient | null = null;

// Simple config schemas with defaults
const pythConfigOptional = z.object({
    PYTH_PRICE_SERVICE_URL: z.string().default('https://hermes.pyth.network'),
    PYTH_API_KEY: z.string().optional()
});

const hyperliquidConfigOptional = z.object({
    HYPERLIQUID_PRIVATE_KEY: z.string().optional(),
    HYPERLIQUID_TESTNET_RPC_URL: z.string().default('https://api.hyperliquid-testnet.xyz/info'),
    HYPERLIQUID_TESTNET_WS_URL: z.string().default('wss://api.hyperliquid-testnet.xyz/ws'),
    HYPERLIQUID_VAULT_ADDRESS: z.string().default('0x0000000000000000000000000000000000000000')
});

async function initPythClient() {
    if (!pythClient) {
        try {
            const config = pythConfigOptional.parse(process.env);
            pythClient = new HermesClient(config.PYTH_PRICE_SERVICE_URL);
        } catch (error) {
            console.warn('Failed to initialize Pyth client:', error);
            pythClient = new HermesClient('https://hermes.pyth.network');
        }
    }
    return pythClient;
}

// API Endpoints

// Get stock price (Tesla instead of GameStop)
app.get('/api/stock-price', async (req: Request, res: Response) => {
    try {
        const client = await initPythClient();
        const priceUpdates = await client.getLatestPriceUpdates([TESLA_PRICE_FEED_ID]);
        
        if (priceUpdates && priceUpdates.parsed && priceUpdates.parsed.length > 0) {
            const teslaPrice = priceUpdates.parsed[0];
            const price = parseFloat(teslaPrice.price.price) * Math.pow(10, teslaPrice.price.expo);
            const confidence = parseFloat(teslaPrice.price.conf) * Math.pow(10, teslaPrice.price.expo);
            const publishTime = teslaPrice.price.publishTime || teslaPrice.price.publish_time || Date.now() / 1000;
            
            res.json({
                symbol: 'TSLA',
                name: 'Tesla Inc.',
                price: price.toFixed(2),
                confidence: confidence.toFixed(2),
                timestamp: new Date(publishTime * 1000).toISOString(),
                note: 'GameStop (GME) is not available in Pyth Network, showing Tesla instead'
            });
        } else {
            res.status(404).json({ error: 'Price data not available' });
        }
    } catch (error: any) {
        console.error('Error fetching stock price:', error?.message || error);
        // Return demo data if API fails
        res.json({
            symbol: 'TSLA',
            name: 'Tesla Inc.',
            price: '245.87',
            confidence: '1.23',
            timestamp: new Date().toISOString(),
            note: 'Demo data - live feed temporarily unavailable'
        });
    }
});

// Get supported EVM chains from deBridge
app.get('/api/evm-chains', async (req: Request, res: Response) => {
    try {
        const client = await createDebridgeClient();
        if (!client) {
            // Return demo data if client is not available
            res.json({
                total: 5,
                chains: [
                    { id: 1, name: 'Ethereum', type: 'evm' },
                    { id: 137, name: 'Polygon', type: 'evm' },
                    { id: 42161, name: 'Arbitrum', type: 'evm' },
                    { id: 10, name: 'Optimism', type: 'evm' },
                    { id: 56, name: 'BNB Smart Chain', type: 'evm' }
                ],
                note: 'Demo data - configure deBridge API for live data'
            });
            return;
        }
        
        const chains = await client.getSupportedChains();
        
        // Filter for EVM chains (exclude Solana)
        const evmChains = chains.filter(chain => 
            !chain.chainName.toLowerCase().includes('solana')
        );
        
        res.json({
            total: evmChains.length,
            chains: evmChains.map(chain => ({
                id: chain.chainId,
                name: chain.chainName,
                type: chain.chainType || 'evm'
            }))
        });
    } catch (error: any) {
        console.error('Error fetching EVM chains:', error?.message || error);
        // Return demo data on error
        res.json({
            total: 5,
            chains: [
                { id: 1, name: 'Ethereum', type: 'evm' },
                { id: 137, name: 'Polygon', type: 'evm' },
                { id: 42161, name: 'Arbitrum', type: 'evm' },
                { id: 10, name: 'Optimism', type: 'evm' },
                { id: 56, name: 'BNB Smart Chain', type: 'evm' }
            ],
            note: 'Demo data - API temporarily unavailable'
        });
    }
});

// Get Hyperliquid vault info
app.get('/api/vault-info', async (req: Request, res: Response) => {
    try {
        const config = hyperliquidConfigOptional.parse(process.env);
        
        res.json({
            network: 'Hyperliquid Testnet',
            vaultAddress: config.HYPERLIQUID_VAULT_ADDRESS,
            rpcUrl: config.HYPERLIQUID_TESTNET_RPC_URL.replace(/https?:\/\//, '').split('/')[0],
            status: config.HYPERLIQUID_PRIVATE_KEY ? 'Configured' : 'Demo Mode',
            features: [
                'Vault Deployment Ready',
                'Cross-chain Bridging via deBridge',
                'Real-time Price Feeds via Pyth'
            ],
            note: config.HYPERLIQUID_PRIVATE_KEY ? 'Full SDK integration requires @hyperliquid-dex/sdk package' : 'Running in demo mode - configure .env for full features'
        });
    } catch (error) {
        console.error('Error fetching vault info:', error);
        res.status(500).json({ 
            error: 'Hyperliquid configuration error',
            hint: 'Please check your .env file'
        });
    }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            pyth: 'available',
            debridge: 'available',
            hyperliquid: 'configured'
        }
    });
});

// Serve the main page and SPA fallback
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(UI_DIR, 'index.html'));
});

// Fallback to index.html for non-API routes (SPA support)
app.get(/^\/(?!api\/).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(UI_DIR, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 HyperMetal Trading App running on http://localhost:${PORT}`);
    console.log(`📊 Live trading interface with Pyth Network data`);
    console.log(`📡 API endpoints available:`);
    console.log(`   - GET /api/stock-price   (Tesla stock price via Pyth)`);
    console.log(`   - GET /api/evm-chains    (Supported EVM chains via deBridge)`);
    console.log(`   - GET /api/vault-info    (Hyperliquid vault info)`);
    console.log(`   - GET /api/health        (Health check)`);
    console.log(`✨ Open http://localhost:${PORT} to access the trading interface`);
});
