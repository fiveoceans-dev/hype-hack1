import axios, { AxiosInstance, AxiosRequestConfig } from "axios"

import { debridgeConfig } from "../config/debridge"

export interface DebridgeQuoteRequest {
    srcChainId: number
    srcChainTokenIn: string
    srcChainTokenInAmount: string
    dstChainId: number
    dstChainTokenOut: string
    dstChainTokenOutRecipient?: string
    srcChainOrderAuthorityAddress?: string
    dstChainOrderAuthorityAddress?: string
    affiliateFeePercent?: number
    affiliateFeeRecipient?: string
    integrator?: string
}

export interface DebridgeQuoteResponse {
    estimation: {
        srcChainTokenIn: {
            address: string
            name: string
            symbol: string
            decimals: number
            amount: string
        }
        srcChainTokenOut: {
            address: string
            name: string
            symbol: string
            decimals: number
            amount: string
            recommendedAmount: string
        }
        dstChainTokenOut: {
            address: string
            name: string
            symbol: string
            decimals: number
            amount: string
            recommendedAmount: string
        }
    }
    tx: {
        to: string
        data: string
        value: string
    }
    order: {
        approximateFulfillmentDelay: number
        makerOrderNonce: string
        makerSrc: string
    }
    fixFee: string
    percentFee: string
    recommendedSlippage: number
}

export interface DebridgeOrderStatus {
    orderId: string
    status: "Created" | "Fulfilled" | "SentUnlock" | "OrderCancelled" | "ClaimedUnlock"
    fulfilledDstEventMetadata?: {
        transactionHash: string
        blockNumber: number
        logIndex: number
    }
}

export interface ChainInfo {
    chainId: number
    originalChainId?: number
    chainName: string
    nativeCurrency?: {
        name: string
        symbol: string
        decimals: number
    }
    rpcUrls?: string[]
    blockExplorerUrls?: string[]
}

export class DebridgeClient {
    private readonly httpClient: AxiosInstance

    constructor() {
        this.httpClient = this.createHttpClient()
    }

    private createHttpClient(): AxiosInstance {
        const config: AxiosRequestConfig = {
            baseURL: debridgeConfig.apiUrl,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "hyperliquid-vault-deployer/1.0.0",
            },
        }

        if (debridgeConfig.apiKey) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${debridgeConfig.apiKey}`,
            }
        }

        return axios.create(config)
    }

    async getQuote(request: DebridgeQuoteRequest): Promise<DebridgeQuoteResponse> {
        try {
            const response = await this.httpClient.get("/quote", {
                params: {
                    srcChainId: request.srcChainId,
                    srcChainTokenIn: request.srcChainTokenIn,
                    srcChainTokenInAmount: request.srcChainTokenInAmount,
                    dstChainId: request.dstChainId,
                    dstChainTokenOut: request.dstChainTokenOut,
                    dstChainTokenOutRecipient: request.dstChainTokenOutRecipient,
                    srcChainOrderAuthorityAddress: request.srcChainOrderAuthorityAddress,
                    dstChainOrderAuthorityAddress: request.dstChainOrderAuthorityAddress,
                    affiliateFeePercent: request.affiliateFeePercent,
                    affiliateFeeRecipient: request.affiliateFeeRecipient,
                    integrator: request.integrator || "hyperliquid-vault",
                },
            })

            return response.data
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `deBridge quote request failed: ${error.message}${
                        error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""
                    }`
                )
            }
            throw error
        }
    }

    async getOrderStatus(orderId: string): Promise<DebridgeOrderStatus> {
        try {
            const response = await this.httpClient.get(`/order/${orderId}`)
            return response.data
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `deBridge order status request failed: ${error.message}${
                        error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""
                    }`
                )
            }
            throw error
        }
    }

    async getSupportedChains(): Promise<ChainInfo[]> {
        try {
            const response = await this.httpClient.get("/supported-chains-info")
            const data = response.data
            
            // The API returns { chains: [...] }
            if (data && Array.isArray(data.chains)) {
                return data.chains
            }
            
            // Fallback if the structure is different
            return Array.isArray(data) ? data : []
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `deBridge supported chains request failed: ${error.message}${
                        error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""
                    }`
                )
            }
            throw error
        }
    }

    async getTokenList(chainId: number): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
        try {
            const response = await this.httpClient.get(`/token-list`, {
                params: { chainId },
            })
            return response.data
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `deBridge token list request failed: ${error.message}${
                        error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ""
                    }`
                )
            }
            throw error
        }
    }
}

// Create singleton instance following the defensive pattern used in the codebase
let debridgeClientInstance: DebridgeClient | undefined

export function createDebridgeClient(): DebridgeClient {
    if (!debridgeClientInstance) {
        try {
            debridgeClientInstance = new DebridgeClient()
        } catch (error) {
            console.warn("Failed to create deBridge client, using fallback stub:", error)
            // Return a stub implementation in case of initialization failures
            debridgeClientInstance = {
                async getQuote(): Promise<never> {
                    throw new Error("deBridge client is unavailable. Check your configuration and network connectivity.")
                },
                async getOrderStatus(): Promise<never> {
                    throw new Error("deBridge client is unavailable. Check your configuration and network connectivity.")
                },
                async getSupportedChains(): Promise<never> {
                    throw new Error("deBridge client is unavailable. Check your configuration and network connectivity.")
                },
                async getTokenList(): Promise<never> {
                    throw new Error("deBridge client is unavailable. Check your configuration and network connectivity.")
                },
            } as DebridgeClient
        }
    }

    return debridgeClientInstance
}

export const debridgeClient = createDebridgeClient()