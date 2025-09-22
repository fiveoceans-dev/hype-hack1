// Vercel Serverless Function: /api/vault-info
// Returns summarized Hyperliquid vault configuration/status

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY
    const rpcUrl = process.env.HYPERLIQUID_TESTNET_RPC_URL || 'https://testnet.hyperliquid.xyz/rpc'
    const wsUrl = process.env.HYPERLIQUID_TESTNET_WS_URL || 'wss://testnet.hyperliquid.xyz/ws'
    const vaultAddress = process.env.HYPERLIQUID_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000'

    res.status(200).json({
      network: 'Hyperliquid Testnet',
      vaultAddress,
      rpcUrl: String(rpcUrl).replace(/^https?:\/\//, '').split('/')[0],
      ws: wsUrl,
      status: privateKey ? 'Configured' : 'Demo Mode',
      features: [
        'Vault Deployment Ready',
        'Cross-chain Bridging via deBridge',
        'Real-time Price Feeds via Pyth',
      ],
      note: privateKey
        ? 'Full SDK integration requires @hyperliquid/api or official SDK in environment'
        : 'Running in demo mode - configure .env for full features',
    })
  } catch (error) {
    res.status(500).json({ error: 'Hyperliquid configuration error', hint: 'Please check your .env file' })
  }
}

