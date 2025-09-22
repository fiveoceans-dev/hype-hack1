import { hyperliquidConfig } from "./config/hyperliquid"
import { deploy as deployHyperliquid } from "./hyperliquid/deploy"
import { getQuote as debridgeQuote, getChains as debridgeChains, getTokens as debridgeTokens } from "./debridge/operations"
import { getPrice as pythPrices, searchFeeds as pythSearch, listFeeds as pythList, getSpecificPrice as pythSpecific } from "./pyth/operations"

type CommandHandler = () => Promise<number | void>

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
    "deploy:hyperliquid": deployHyperliquid,
    "deploy-hyperliquid": deployHyperliquid,
    
    // deBridge commands
    "debridge:quote": debridgeQuote,
    "debridge:chains": debridgeChains,
    "debridge:tokens": debridgeTokens,
    
    // Pyth Network commands
    "pyth:prices": pythPrices,
    "pyth:search": pythSearch,
    "pyth:list": pythList,
    "pyth:price": () => {
        const priceId = process.argv[3]
        if (!priceId) {
            console.error("Usage: pyth:price <price-feed-id>")
            console.error("Example: pyth:price 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43")
            return Promise.resolve(1)
        }
        return pythSpecific(priceId)
    },
}

const DEFAULT_COMMAND_MESSAGE = `Hyperliquid configuration loaded for vault ${hyperliquidConfig.vaultAddress}.`

async function main(): Promise<void> {
    const [, , rawCommand] = process.argv

    if (!rawCommand) {
        console.log(DEFAULT_COMMAND_MESSAGE)
        return
    }

    const normalizedCommand = rawCommand.toLowerCase()
    const handler = COMMAND_HANDLERS[normalizedCommand]

    if (!handler) {
        console.error(`Unknown command: ${rawCommand}`)
        console.error("Available commands:")
        console.error("  Hyperliquid: deploy:hyperliquid")
        console.error("  deBridge: debridge:quote, debridge:chains, debridge:tokens")
        console.error("  Pyth: pyth:prices, pyth:search, pyth:list, pyth:price <price-id>")
        process.exitCode = 1
        return
    }

    try {
        const exitCode = await handler()
        if (typeof exitCode === "number") {
            process.exit(exitCode)
        }
    } catch (error) {
        console.error(`Command ${rawCommand} failed with an unexpected error:`)
        console.error(error)
        process.exit(1)
    }
}

void main()
