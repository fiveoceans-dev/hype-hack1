// Vercel Serverless Function: /api/health

export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      pyth: 'available',
      debridge: 'available',
      hyperliquid: 'configured',
    },
  })
}

