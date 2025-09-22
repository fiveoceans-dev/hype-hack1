// Vercel Serverless Function: /api/evm-chains
// Lists supported EVM chains using deBridge public API

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const baseUrl = process.env.DEBRIDGE_API_URL || 'https://api.dln.trade/v1.0'

  try {
    const url = new URL('/supported-chains-info', baseUrl)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.DEBRIDGE_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.DEBRIDGE_API_KEY}`
    }

    const response = await fetch(url.toString(), { headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const payload = await response.json()
    const chains = Array.isArray(payload?.chains) ? payload.chains : Array.isArray(payload) ? payload : []

    // Filter out non-EVM (e.g., Solana)
    const evmChains = chains.filter((c: any) => !String(c?.chainName || '').toLowerCase().includes('solana'))

    res.status(200).json({
      total: evmChains.length,
      chains: evmChains.map((c: any) => ({ id: c.chainId, name: c.chainName, type: c.chainType || 'evm' })),
    })
  } catch (error: any) {
    // Return demo data on error
    res.status(200).json({
      total: 5,
      chains: [
        { id: 1, name: 'Ethereum', type: 'evm' },
        { id: 137, name: 'Polygon', type: 'evm' },
        { id: 42161, name: 'Arbitrum', type: 'evm' },
        { id: 10, name: 'Optimism', type: 'evm' },
        { id: 56, name: 'BNB Smart Chain', type: 'evm' },
      ],
      note: 'Demo data - API temporarily unavailable',
      error: error?.message,
    })
  }
}

