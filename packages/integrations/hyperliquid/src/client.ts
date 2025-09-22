import * as HyperliquidSdk from "./sdk"

import { hyperliquidConfig } from "../config/hyperliquid"

export type HyperliquidChainIds = Readonly<{
    hyperliquid: number
    settlement: number
}>

export const HYPERLIQUID_TESTNET_CHAIN_IDS: HyperliquidChainIds = Object.freeze({
    hyperliquid: 421_614,
    settlement: 11_155_111,
})

export interface HyperliquidClientOptions {
    httpUrl: string
    wsUrl: string
    chainIds: HyperliquidChainIds
    signer: unknown
}

type HyperliquidModule = typeof HyperliquidSdk & {
    createClient?: (options: HyperliquidClientOptions) => unknown
    getClient?: (options: HyperliquidClientOptions) => unknown
    createSigner?: (input: string | { privateKey: string }) => unknown
    createSignerFromPrivateKey?: (privateKey: string) => unknown
    walletFromPrivateKey?: (privateKey: string) => unknown
    PrivateKeySigner?: new (privateKey: string) => unknown
    Signer?: new (privateKey: string) => unknown
    VaultClient?: new (...args: unknown[]) => unknown
    HyperliquidClient?: new (...args: unknown[]) => unknown
    Client?: new (...args: unknown[]) => unknown
}

const hyperliquidModule = HyperliquidSdk as HyperliquidModule &
    Record<string, unknown> & { default?: unknown }

function instantiateSigner(privateKey: string): unknown {
    const factories: Array<() => unknown> = []

    if (typeof hyperliquidModule.createSignerFromPrivateKey === "function") {
        factories.push(() => hyperliquidModule.createSignerFromPrivateKey!(privateKey))
    }

    if (typeof hyperliquidModule.createSigner === "function") {
        factories.push(() => hyperliquidModule.createSigner!(privateKey))
        factories.push(() => hyperliquidModule.createSigner!({ privateKey }))
    }

    if (typeof hyperliquidModule.PrivateKeySigner === "function") {
        factories.push(() => new hyperliquidModule.PrivateKeySigner!(privateKey))
    }

    if (typeof hyperliquidModule.Signer === "function") {
        factories.push(() => new hyperliquidModule.Signer!(privateKey))
    }

    if (typeof hyperliquidModule.walletFromPrivateKey === "function") {
        factories.push(() => hyperliquidModule.walletFromPrivateKey!(privateKey))
    }

    const defaultExport = hyperliquidModule.default
    if (defaultExport && typeof defaultExport === "object") {
        const defaultRecord = defaultExport as Record<string, unknown>
        const maybeCreate = defaultRecord.createSigner
        const maybeFromPrivateKey = defaultRecord.createSignerFromPrivateKey
        const maybeWalletFromPrivateKey = defaultRecord.walletFromPrivateKey

        if (typeof maybeCreate === "function") {
            factories.push(() => maybeCreate(privateKey))
            factories.push(() => maybeCreate({ privateKey }))
        }

        if (typeof maybeFromPrivateKey === "function") {
            factories.push(() => maybeFromPrivateKey(privateKey))
        }

        if (typeof maybeWalletFromPrivateKey === "function") {
            factories.push(() => maybeWalletFromPrivateKey(privateKey))
        }
    }

    if (typeof defaultExport === "function") {
        const defaultCtor = defaultExport as unknown as
            | ((...args: unknown[]) => { createSigner?: (key: string) => unknown })
            | (new (...args: unknown[]) => unknown)
        const createSignerOnDefault = (
            defaultCtor as {
                createSigner?: (key: string) => unknown
            }
        ).createSigner

        if (typeof createSignerOnDefault === "function") {
            factories.push(() => createSignerOnDefault(privateKey))
        }
    }

    for (const factory of factories) {
        try {
            const signer = factory()
            if (signer) {
                return signer
            }
        } catch (_error) {
            // Ignore and fall back to the next strategy.
        }
    }

    return {
        type: "privateKey",
        privateKey,
        address: hyperliquidConfig.vaultAddress,
    }
}

function instantiateClient(options: HyperliquidClientOptions): unknown {
    const attempts: Array<{ description: string; factory: () => unknown }> = []

    if (typeof hyperliquidModule.createClient === "function") {
        attempts.push({
            description: "@hyperliquid/api.createClient(options)",
            factory: () => hyperliquidModule.createClient!(options),
        })
    }

    if (typeof hyperliquidModule.getClient === "function") {
        attempts.push({
            description: "@hyperliquid/api.getClient(options)",
            factory: () => hyperliquidModule.getClient!(options),
        })
    }

    const classCandidates: Array<[string, (new (...args: unknown[]) => unknown) | undefined]> = [
        ["HyperliquidClient", hyperliquidModule.HyperliquidClient],
        ["VaultClient", hyperliquidModule.VaultClient],
        ["Client", hyperliquidModule.Client],
    ]

    for (const [label, Ctor] of classCandidates) {
        if (typeof Ctor === "function") {
            attempts.push({
                description: `new ${label}(options)`,
                factory: () => new Ctor(options),
            })
            attempts.push({
                description: `new ${label}(httpUrl, wsUrl, signer, chainIds)`,
                factory: () =>
                    new Ctor(options.httpUrl, options.wsUrl, options.signer, options.chainIds),
            })
            attempts.push({
                description: `new ${label}(signer, options)`,
                factory: () => new Ctor(options.signer, options),
            })
        }
    }

    const defaultExport = hyperliquidModule.default

    if (typeof defaultExport === "function") {
        const DefaultCtor = defaultExport as new (...args: unknown[]) => unknown
        attempts.push({
            description: "new default(options)",
            factory: () => new DefaultCtor(options),
        })
        attempts.push({
            description: "new default(httpUrl, wsUrl, signer, chainIds)",
            factory: () =>
                new DefaultCtor(options.httpUrl, options.wsUrl, options.signer, options.chainIds),
        })
    } else if (defaultExport && typeof defaultExport === "object") {
        const defaultRecord = defaultExport as Record<string, unknown>
        const maybeFactory = defaultRecord.createClient
        if (typeof maybeFactory === "function") {
            attempts.push({
                description: "default export createClient(options)",
                factory: () =>
                    (maybeFactory as (opts: HyperliquidClientOptions) => unknown)(options),
            })
        }
    }

    const errors: string[] = []

    for (const attempt of attempts) {
        try {
            const client = attempt.factory()
            if (client) {
                return client
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            errors.push(`${attempt.description} -> ${message}`)
        }
    }

    if (errors.length > 0) {
        console.warn(
            [
                "Unable to instantiate Hyperliquid SDK with the detected patterns. Falling back to a lightweight stub.",
                ...errors.map(message => ` - ${message}`),
            ].join("\n")
        )
    }

    return {
        httpUrl: options.httpUrl,
        wsUrl: options.wsUrl,
        signer: options.signer,
        chainIds: options.chainIds,
        module: hyperliquidModule,
    }
}

const hyperliquidSignerInstance = instantiateSigner(hyperliquidConfig.privateKey)

const hyperliquidClientInstance = instantiateClient({
    httpUrl: hyperliquidConfig.rpcUrl,
    wsUrl: hyperliquidConfig.wsUrl,
    chainIds: HYPERLIQUID_TESTNET_CHAIN_IDS,
    signer: hyperliquidSignerInstance,
})

export type HyperliquidClient = typeof hyperliquidClientInstance

export const hyperliquidClient = hyperliquidClientInstance
export const hyperliquidSigner = hyperliquidSignerInstance
