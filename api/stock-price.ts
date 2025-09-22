// Vercel Serverless Function: /api/stock-price
// Returns Tesla stock-like data via Pyth Hermes HTTP API (GME not available)

const TESLA_PRICE_FEED_ID =
  '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const baseUrl = process.env.PYTH_PRICE_SERVICE_URL || 'https://hermes.pyth.network'

  try {
    const url = new URL('/v2/updates/price/latest', baseUrl)
    url.searchParams.set('ids[]', TESLA_PRICE_FEED_ID)
    url.searchParams.set('encoding', 'hex')
    url.searchParams.set('parsed', 'true')

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.PYTH_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.PYTH_API_KEY}`
    }

    const response = await fetch(url.toString(), { headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const parsed = data?.parsed
    if (!parsed || parsed.length === 0) {
      res.status(404).json({ error: 'Price data not available' })
      return
    }

    const p = parsed[0]
    const price = Number(p?.price?.price || 0) * Math.pow(10, Number(p?.price?.expo || 0))
    const confidence = Number(p?.price?.conf || 0) * Math.pow(10, Number(p?.price?.expo || 0))
    const publishTime = Number(p?.price?.publish_time || p?.price?.publishTime || Date.now() / 1000)

    res.status(200).json({
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: price.toFixed(2),
      confidence: confidence.toFixed(2),
      timestamp: new Date(publishTime * 1000).toISOString(),
      note: 'GameStop (GME) is not available in Pyth Network, showing Tesla instead',
    })
  } catch (error: any) {
    // Return demo data if API fails
    res.status(200).json({
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: '245.87',
      confidence: '1.23',
      timestamp: new Date().toISOString(),
      note: 'Demo data - live feed temporarily unavailable',
      error: error?.message,
    })
  }
}

