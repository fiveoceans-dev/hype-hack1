import { debridgeClient, DebridgeQuoteRequest } from "./client"

export async function getQuote(): Promise<number> {
    console.info("Fetching deBridge supported chains...")

    try {
        const chains = await debridgeClient.getSupportedChains()
        console.info(`Found ${chains.length} supported chains:`)
        chains.forEach(chain => {
            console.info(`  - ${chain.chainName} (ID: ${chain.chainId})`)
        })

        // Example: Get a quote for bridging USDC from Ethereum to Hyperliquid
        const exampleQuote: DebridgeQuoteRequest = {
            srcChainId: 1, // Ethereum
            srcChainTokenIn: "0xA0b86a33E6441c1b9F6ba1d66E0EE7a0D0D0E0E0", // Example USDC address
            srcChainTokenInAmount: "1000000", // 1 USDC (6 decimals)
            dstChainId: 998, // Hyperliquid (example chain ID)
            dstChainTokenOut: "0xA0b86a33E6441c1b9F6ba1d66E0EE7a0D0D0E0E0", // Example USDC address on destination
        }

        console.info("\nFetching example bridge quote...")
        console.info(`Source: Chain ${exampleQuote.srcChainId}, Amount: ${exampleQuote.srcChainTokenInAmount}`)
        console.info(`Destination: Chain ${exampleQuote.dstChainId}`)

        const quote = await debridgeClient.getQuote(exampleQuote)
        
        console.info("Quote details:")
        console.info(`  - Input: ${quote.estimation.srcChainTokenIn.amount} ${quote.estimation.srcChainTokenIn.symbol}`)
        console.info(`  - Output: ${quote.estimation.dstChainTokenOut.amount} ${quote.estimation.dstChainTokenOut.symbol}`)
        console.info(`  - Fix Fee: ${quote.fixFee}`)
        console.info(`  - Percent Fee: ${quote.percentFee}%`)
        console.info(`  - Recommended Slippage: ${quote.recommendedSlippage}%`)
        console.info(`  - Fulfillment Delay: ~${quote.order.approximateFulfillmentDelay}s`)

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`deBridge operation failed: ${message}`)
        return 1
    }
}

export async function getChains(): Promise<number> {
    console.info("Fetching deBridge supported chains...")

    try {
        const chains = await debridgeClient.getSupportedChains()
        
        console.info(`\nSupported chains (${chains.length} total):`)
        chains.forEach(chain => {
            console.info(`\n${chain.chainName}:`)
            console.info(`  - Chain ID: ${chain.chainId}`)
            if (chain.originalChainId && chain.originalChainId !== chain.chainId) {
                console.info(`  - Original Chain ID: ${chain.originalChainId}`)
            }
            if (chain.nativeCurrency) {
                console.info(`  - Native Currency: ${chain.nativeCurrency.name} (${chain.nativeCurrency.symbol})`)
            }
            if (chain.rpcUrls) {
                console.info(`  - RPC URLs: ${chain.rpcUrls.length} available`)
            }
            if (chain.blockExplorerUrls) {
                console.info(`  - Block Explorers: ${chain.blockExplorerUrls.length} available`)
            }
        })

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Failed to fetch supported chains: ${message}`)
        return 1
    }
}

export async function getTokens(): Promise<number> {
    console.info("Fetching deBridge token information...")

    try {
        // Get tokens for Ethereum mainnet as an example
        const ethTokens = await debridgeClient.getTokenList(1)
        
        console.info(`\nTokens on Ethereum (${ethTokens.length} total):`)
        ethTokens.slice(0, 10).forEach(token => {
            console.info(`  - ${token.name} (${token.symbol}): ${token.address}`)
        })
        
        if (ethTokens.length > 10) {
            console.info(`  ... and ${ethTokens.length - 10} more tokens`)
        }

        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Failed to fetch token list: ${message}`)
        return 1
    }
}