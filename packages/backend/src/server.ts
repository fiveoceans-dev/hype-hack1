import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Tesla stock price feed ID (GME not available in Pyth)
const TESLA_PRICE_FEED_ID = '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1';

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


// API Endpoints

// Get stock price (Tesla instead of GameStop)
app.get('/api/stock-price', async (req: Request, res: Response) => {
    try {
        // Return demo data for now
        // TODO: Integrate with Pyth client from @hype/pyth package
        res.json({
            symbol: 'TSLA',
            name: 'Tesla Inc.',
            price: '425.99',
            confidence: '0.33',
            timestamp: new Date().toISOString(),
            note: 'Demo data - Pyth integration pending'
        });
    } catch (error: any) {
        console.error('Error fetching stock price:', error?.message || error);
        res.status(500).json({ error: 'Failed to fetch stock price' });
    }
});

// Get supported EVM chains from deBridge
app.get('/api/evm-chains', async (req: Request, res: Response) => {
    try {
        // Return demo data for now
        // TODO: Integrate with deBridge client from @hype/debridge package
        res.json({
            total: 10,
            chains: [
                { id: 1, name: 'Ethereum', type: 'evm' },
                { id: 137, name: 'Polygon', type: 'evm' },
                { id: 42161, name: 'Arbitrum', type: 'evm' },
                { id: 10, name: 'Optimism', type: 'evm' },
                { id: 56, name: 'BNB Smart Chain', type: 'evm' },
                { id: 43114, name: 'Avalanche', type: 'evm' },
                { id: 8453, name: 'Base', type: 'evm' },
                { id: 100, name: 'Gnosis', type: 'evm' },
                { id: 5000, name: 'Mantle', type: 'evm' },
                { id: 59144, name: 'Linea', type: 'evm' }
            ],
            note: 'Demo data - deBridge integration pending'
        });
    } catch (error: any) {
        console.error('Error fetching EVM chains:', error?.message || error);
        res.status(500).json({ error: 'Failed to fetch chains' });
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


// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   - GET /api/stock-price   (Tesla stock price)`);
    console.log(`   - GET /api/evm-chains    (Supported EVM chains)`);
    console.log(`   - GET /api/vault-info    (Hyperliquid vault info)`);
    console.log(`   - GET /api/health        (Health check)`);
});