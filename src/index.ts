import { hyperliquidConfig } from "./config/hyperliquid"
import { deploy as deployHyperliquid } from "./hyperliquid/deploy"

type CommandHandler = () => Promise<number | void>

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
    "deploy:hyperliquid": deployHyperliquid,
    "deploy-hyperliquid": deployHyperliquid,
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
        console.error("Available commands: deploy:hyperliquid")
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
