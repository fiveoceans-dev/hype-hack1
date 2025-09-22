import { pythClient, PythClient } from "./client"

export async function getPrice(): Promise<number> {
    console.info("Fetching Pyth Network price data...")

    try {
        // Fetch common cryptocurrency prices
        const commonPrices = await pythClient.getPrices([
            PythClient.COMMON_PRICE_IDS.BTC_USD,
            PythClient.COMMON_PRICE_IDS.ETH_USD,
            PythClient.COMMON_PRICE_IDS.USDC_USD,
        ])

        console.info("\nCommon cryptocurrency prices:")
        commonPrices.forEach(priceData => {
            const price = parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo)
            const conf = parseFloat(priceData.price.conf) * Math.pow(10, priceData.price.expo)
            const publishTime = new Date(priceData.price.publishTime * 1000)
            
            let symbol = "UNKNOWN"
            if (priceData.id === PythClient.COMMON_PRICE_IDS.BTC_USD) symbol = "BTC/USD"
            if (priceData.id === PythClient.COMMON_PRICE_IDS.ETH_USD) symbol = "ETH/USD"
            if (priceData.id === PythClient.COMMON_PRICE_IDS.USDC_USD) symbol = "USDC/USD"

            console.info(`  - ${symbol}: $${price.toFixed(2)} ±$${conf.toFixed(2)}`)
            console.info(`    Published: ${publishTime.toISOString()}`)
        })

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Pyth price fetch failed: ${message}`)
        return 1
    }
}

export async function searchFeeds(): Promise<number> {
    console.info("Searching Pyth Network price feeds...")

    try {
        // Search for cryptocurrency-related feeds
        const cryptoFeeds = await pythClient.searchPriceFeeds("crypto")
        
        console.info(`\nFound ${cryptoFeeds.length} cryptocurrency price feeds:`)
        cryptoFeeds.slice(0, 10).forEach(feed => {
            console.info(`  - ${feed.attributes.symbol || feed.attributes.base_symbol}: ${feed.attributes.description || "No description"}`)
            console.info(`    Feed ID: ${feed.id}`)
        })

        if (cryptoFeeds.length > 10) {
            console.info(`  ... and ${cryptoFeeds.length - 10} more feeds`)
        }

        // Search for Hyperliquid-specific feeds
        const hypeFeeds = await pythClient.searchPriceFeeds("hype")
        
        if (hypeFeeds.length > 0) {
            console.info(`\nHyperliquid-related feeds (${hypeFeeds.length} found):`)
            hypeFeeds.forEach(feed => {
                console.info(`  - ${feed.attributes.symbol || feed.attributes.base_symbol}: ${feed.attributes.description || "No description"}`)
                console.info(`    Feed ID: ${feed.id}`)
            })
        } else {
            console.info("\nNo Hyperliquid-specific feeds found")
        }

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Pyth feed search failed: ${message}`)
        return 1
    }
}

export async function listFeeds(): Promise<number> {
    console.info("Fetching all Pyth Network price feed metadata...")

    try {
        const allFeeds = await pythClient.getPriceFeedMetadata()
        
        console.info(`\nTotal available price feeds: ${allFeeds.length}`)
        
        // Group feeds by asset type
        const feedsByType = new Map<string, typeof allFeeds>()
        allFeeds.forEach(feed => {
            const assetType = feed.attributes.asset_type || "unknown"
            if (!feedsByType.has(assetType)) {
                feedsByType.set(assetType, [])
            }
            feedsByType.get(assetType)!.push(feed)
        })

        console.info("\nFeeds by asset type:")
        Array.from(feedsByType.entries()).forEach(([assetType, feeds]) => {
            console.info(`  - ${assetType}: ${feeds.length} feeds`)
        })

        // Show some sample feeds from each category
        console.info("\nSample feeds:")
        Array.from(feedsByType.entries()).slice(0, 3).forEach(([assetType, feeds]) => {
            console.info(`\n${assetType.toUpperCase()} (showing first 3):`)
            feeds.slice(0, 3).forEach(feed => {
                console.info(`  - ${feed.attributes.symbol || feed.attributes.base_symbol}`)
                console.info(`    Description: ${feed.attributes.description || "No description"}`)
                console.info(`    Feed ID: ${feed.id}`)
            })
        })

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Failed to fetch price feed metadata: ${message}`)
        return 1
    }
}

export async function getSpecificPrice(priceId: string): Promise<number> {
    console.info(`Fetching specific price for feed ID: ${priceId}`)

    try {
        const priceData = await pythClient.getPrice(priceId)
        
        const price = parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo)
        const conf = parseFloat(priceData.price.conf) * Math.pow(10, priceData.price.expo)
        const emaPrice = parseFloat(priceData.emaPrice.price) * Math.pow(10, priceData.emaPrice.expo)
        const publishTime = new Date(priceData.price.publishTime * 1000)

        console.info("\nPrice details:")
        console.info(`  - Current Price: $${price.toFixed(6)}`)
        console.info(`  - Confidence: ±$${conf.toFixed(6)}`)
        console.info(`  - EMA Price: $${emaPrice.toFixed(6)}`)
        console.info(`  - Published: ${publishTime.toISOString()}`)
        console.info(`  - Feed ID: ${priceData.id}`)

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Failed to fetch price for ${priceId}: ${message}`)
        return 1
    }
}