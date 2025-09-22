import { z } from "zod"

const hyperliquidEnvSchema = z.object({
    HYPERLIQUID_PRIVATE_KEY: z
        .string()
        .regex(
            /^0x[0-9a-fA-F]{64}$/u,
            "HYPERLIQUID_PRIVATE_KEY must be a 66 character hex string prefixed with 0x."
        ),
    HYPERLIQUID_TESTNET_RPC_URL: z.string().url("HYPERLIQUID_TESTNET_RPC_URL must be a valid URL."),
    HYPERLIQUID_TESTNET_WS_URL: z
        .string()
        .url("HYPERLIQUID_TESTNET_WS_URL must be a valid URL.")
        .refine(
            value => value.startsWith("ws://") || value.startsWith("wss://"),
            "HYPERLIQUID_TESTNET_WS_URL must use the ws:// or wss:// protocol."
        ),
    HYPERLIQUID_VAULT_ADDRESS: z
        .string()
        .regex(
            /^0x[0-9a-fA-F]{40}$/u,
            "HYPERLIQUID_VAULT_ADDRESS must be a 42 character hex string prefixed with 0x."
        ),
})

const parsedEnv = hyperliquidEnvSchema.safeParse({
    HYPERLIQUID_PRIVATE_KEY: process.env.HYPERLIQUID_PRIVATE_KEY,
    HYPERLIQUID_TESTNET_RPC_URL: process.env.HYPERLIQUID_TESTNET_RPC_URL,
    HYPERLIQUID_TESTNET_WS_URL: process.env.HYPERLIQUID_TESTNET_WS_URL,
    HYPERLIQUID_VAULT_ADDRESS: process.env.HYPERLIQUID_VAULT_ADDRESS,
})

if (!parsedEnv.success) {
    console.error("Invalid Hyperliquid configuration:")
    console.error(parsedEnv.error.format())
    process.exit(1)
}

type HyperliquidEnv = z.infer<typeof hyperliquidEnvSchema>

export const hyperliquidConfig: Readonly<{
    privateKey: HyperliquidEnv["HYPERLIQUID_PRIVATE_KEY"]
    rpcUrl: HyperliquidEnv["HYPERLIQUID_TESTNET_RPC_URL"]
    wsUrl: HyperliquidEnv["HYPERLIQUID_TESTNET_WS_URL"]
    vaultAddress: HyperliquidEnv["HYPERLIQUID_VAULT_ADDRESS"]
}> = Object.freeze({
    privateKey: parsedEnv.data.HYPERLIQUID_PRIVATE_KEY,
    rpcUrl: parsedEnv.data.HYPERLIQUID_TESTNET_RPC_URL,
    wsUrl: parsedEnv.data.HYPERLIQUID_TESTNET_WS_URL,
    vaultAddress: parsedEnv.data.HYPERLIQUID_VAULT_ADDRESS,
})

export type HyperliquidConfig = typeof hyperliquidConfig
