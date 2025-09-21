import { pathToFileURL } from "url"

import { hyperliquidConfig } from "../config/hyperliquid"
import {
    HYPERLIQUID_TESTNET_CHAIN_IDS,
    type HyperliquidChainIds,
    hyperliquidClient,
    hyperliquidSigner,
} from "./client"

export interface VaultDeploymentPayload {
    vaultAddress: string
    chainIds: HyperliquidChainIds
    timestampIso: string
    metadata: Readonly<{
        environment: "testnet"
        operationId: string
        urls: { http: string; ws: string }
    }>
}

export interface DeploymentSuccess {
    methodSignature: string
    response: unknown
}

interface InvocationResult {
    ok: true
    methodSignature: string
    response: unknown
}

interface InvocationFailure {
    ok: false
    callable: boolean
    errors: string[]
}

type InvocationOutcome = InvocationResult | InvocationFailure

type ClientRecord = Record<string, unknown>

type DeploymentTarget = {
    target: ClientRecord | undefined
    method: string
}

export interface DeploymentResult extends DeploymentSuccess {
    payload: VaultDeploymentPayload
}

const clientRecord = hyperliquidClient as ClientRecord

const DEPLOYMENT_METHODS: DeploymentTarget[] = [
    { target: clientRecord, method: "publishVaultContract" },
    { target: clientRecord, method: "deployVault" },
    { target: clientRecord, method: "publish" },
    { target: clientRecord, method: "deploy" },
    { target: clientRecord, method: "signAndPublish" },
    { target: clientRecord, method: "sendDeployment" },
    { target: clientRecord, method: "send" },
    { target: clientRecord.vault as ClientRecord | undefined, method: "publish" },
    { target: clientRecord.vault as ClientRecord | undefined, method: "deploy" },
    { target: clientRecord.vaultClient as ClientRecord | undefined, method: "publish" },
    { target: clientRecord.vaultClient as ClientRecord | undefined, method: "deploy" },
    { target: clientRecord.contract as ClientRecord | undefined, method: "publish" },
    { target: clientRecord.contract as ClientRecord | undefined, method: "deploy" },
]

function buildDeploymentPayload(): VaultDeploymentPayload {
    const timestampIso = new Date().toISOString()

    return {
        vaultAddress: hyperliquidConfig.vaultAddress,
        chainIds: HYPERLIQUID_TESTNET_CHAIN_IDS,
        timestampIso,
        metadata: Object.freeze({
            environment: "testnet" as const,
            operationId: `hyperliquid-deploy-${Date.now()}`,
            urls: {
                http: hyperliquidConfig.rpcUrl,
                ws: hyperliquidConfig.wsUrl,
            },
        }),
    }
}

function formatForLog(value: unknown): string {
    if (value === undefined) {
        return "<undefined>"
    }

    if (value === null) {
        return "<null>"
    }

    if (typeof value === "string") {
        return value
    }

    try {
        return JSON.stringify(value, null, 2)
    } catch (_error) {
        return String(value)
    }
}

async function tryInvokeMethod(
    target: ClientRecord | undefined,
    method: string,
    payload: VaultDeploymentPayload
): Promise<InvocationOutcome> {
    if (!target || typeof target !== "object") {
        return { ok: false, callable: false, errors: [] }
    }

    const candidate = target[method]

    if (typeof candidate !== "function") {
        return { ok: false, callable: false, errors: [] }
    }

    const fn = candidate as (...args: unknown[]) => unknown

    const invocations: Array<{ signature: string; args: unknown[] }> = [
        { signature: `${method}(payload)`, args: [payload] },
        {
            signature: `${method}(payload, signer)`,
            args: [payload, hyperliquidSigner],
        },
        {
            signature: `${method}(payload, { signer, chainIds })`,
            args: [payload, { signer: hyperliquidSigner, chainIds: HYPERLIQUID_TESTNET_CHAIN_IDS }],
        },
        {
            signature: `${method}({ payload, signer, chainIds })`,
            args: [
                {
                    payload,
                    signer: hyperliquidSigner,
                    chainIds: HYPERLIQUID_TESTNET_CHAIN_IDS,
                },
            ],
        },
        {
            signature: `${method}(vaultAddress, payload)`,
            args: [payload.vaultAddress, payload],
        },
        {
            signature: `${method}(payload, options)`,
            args: [payload, { chainIds: HYPERLIQUID_TESTNET_CHAIN_IDS }],
        },
    ]

    const errors: string[] = []

    for (const invocation of invocations) {
        try {
            const result = await Promise.resolve(fn.apply(target, invocation.args))
            return { ok: true, methodSignature: invocation.signature, response: result }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            errors.push(`${invocation.signature}: ${message}`)
        }
    }

    return { ok: false, callable: true, errors }
}

async function sendDeployment(payload: VaultDeploymentPayload): Promise<DeploymentSuccess> {
    let callableAttempts = 0
    const failureMessages: string[] = []

    for (const candidate of DEPLOYMENT_METHODS) {
        const result = await tryInvokeMethod(candidate.target, candidate.method, payload)
        if (result.ok) {
            return { methodSignature: result.methodSignature, response: result.response }
        }

        if (result.callable) {
            callableAttempts += 1
            failureMessages.push(
                ...result.errors.map(message => `${candidate.method} -> ${message}`)
            )
        }
    }

    if (callableAttempts === 0) {
        throw new Error(
            [
                "Unable to locate a compatible deployment method on the Hyperliquid client.",
                "Checked for methods such as publishVaultContract, deployVault, publish, deploy, signAndPublish, sendDeployment, send on the client, vault, vaultClient, and contract objects.",
            ].join("\n")
        )
    }

    const uniqueMessages = [...new Set(failureMessages)]

    throw new Error(
        [
            "Hyperliquid SDK rejected all deployment attempts.",
            ...uniqueMessages.map(message => ` - ${message}`),
        ].join("\n")
    )
}

export async function performHyperliquidDeployment(): Promise<DeploymentResult> {
    const payload = buildDeploymentPayload()
    const { methodSignature, response } = await sendDeployment(payload)

    return {
        payload,
        methodSignature,
        response,
    }
}

export async function deploy(): Promise<number> {
    console.info(`Preparing Hyperliquid deployment for vault ${hyperliquidConfig.vaultAddress}...`)

    try {
        const { methodSignature, response } = await performHyperliquidDeployment()

        console.info(`Hyperliquid deployment succeeded using ${methodSignature}.`)
        const formattedResponse = formatForLog(response)
        if (formattedResponse) {
            console.info(`Hyperliquid response: ${formattedResponse}`)
        }

        process.exitCode = 0
        return 0
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Hyperliquid deployment failed: ${message}`)
        if (error instanceof Error && error.stack) {
            console.error(error.stack)
        }

        process.exitCode = 1
        return 1
    }
}

const isExecutedDirectly = (() => {
    const entry = process.argv?.[1]
    if (!entry) {
        return false
    }

    try {
        return import.meta.url === pathToFileURL(entry).href
    } catch (error) {
        console.warn(
            `Unable to determine execution context: ${
                error instanceof Error ? error.message : String(error)
            }`
        )
        return false
    }
})()

if (isExecutedDirectly) {
    deploy()
        .then(code => {
            process.exit(code)
        })
        .catch(error => {
            console.error("Deployment encountered an unexpected error:", error)
            process.exit(1)
        })
}
