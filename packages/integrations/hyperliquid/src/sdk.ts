/**
 * Lightweight stub of the official Hyperliquid SDK.
 *
 * The real `@hyperliquid/api` package is not available in this execution
 * environment.  The rest of the codebase has been written defensively so that
 * it can fall back to stubbed behaviour when the SDK cannot be imported.  This
 * module keeps that contract by exposing the same surface area while providing
 * informative error messages for any runtime usage.
 */

const UNAVAILABLE_MESSAGE = [
    "The Hyperliquid SDK is not available in this environment.",
    "Install the official `@hyperliquid/api` package to enable live deployments.",
].join("\n")

function unavailable(): never {
    throw new Error(UNAVAILABLE_MESSAGE)
}

export function createClient(): never {
    return unavailable()
}

export function getClient(): never {
    return unavailable()
}

export function createSigner(): never {
    return unavailable()
}

export function createSignerFromPrivateKey(): never {
    return unavailable()
}

export function walletFromPrivateKey(): never {
    return unavailable()
}

export class PrivateKeySigner {
    constructor() {
        unavailable()
    }
}

export class Signer {
    constructor() {
        unavailable()
    }
}

export class HyperliquidClient {
    constructor() {
        unavailable()
    }
}

export class VaultClient {
    constructor() {
        unavailable()
    }
}

export default {
    createClient,
    getClient,
    createSigner,
    createSignerFromPrivateKey,
    walletFromPrivateKey,
    PrivateKeySigner,
    Signer,
    HyperliquidClient,
    VaultClient,
}
