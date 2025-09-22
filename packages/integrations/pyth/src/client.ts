// Pyth SDK Client Wrapper
// This module provides a client for interacting with the Pyth Network's Price Service API.
// It includes methods to fetch price data, price feed metadata, and search for price feeds.
// The client is designed to handle network errors gracefully and provide informative error messages.

import { HermesClient } from "@pythnetwork/hermes-client"
// Import with defensive handling for CommonJS/ESM compatibility
let PriceServiceConnection: any
try {
    const priceServiceSdk = require("@pythnetwork/price-service-sdk")
    PriceServiceConnection = priceServiceSdk.PriceServiceConnection || priceServiceSdk.default?.PriceServiceConnection
} catch {
    PriceServiceConnection = undefined
}

import { pythConfig } from "../config/pyth"

export interface PriceData {
    id: string
    price: {
        price: string
        conf: string
        expo: number
        publishTime: number
    }
    emaPrice: {
        price: string
        conf: string
        expo: number
        publishTime: number
    }
}

export interface PriceFeedMetadata {
    id: string
    attributes: {
        symbol: string
        asset_type: string
        country: string
        quote_currency: string
        tenor?: string
        cms_symbol?: string
        cqs_symbol?: string
        nasdaq_symbol?: string
        base_symbol?: string
        description?: string
    }
}

export class PythClient {
    private readonly baseUrl: string
    private readonly apiKey?: string

    constructor() {
        this.baseUrl = pythConfig.priceServiceUrl
        this.apiKey = pythConfig.apiKey
    }

    private async makeRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
        const url = new URL(endpoint, this.baseUrl)
        
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value)
            })
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        }

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`
        }

        const response = await fetch(url.toString(), { headers })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
    }

    async getPrice(priceId: string): Promise<PriceData> {
        try {
            const response = await this.makeRequest('/v2/updates/price/latest', {
                'ids[]': priceId,
                'encoding': 'hex',
                'parsed': 'true'
            })

            if (!response.parsed || response.parsed.length === 0) {
                throw new Error(`No price data found for price ID: ${priceId}`)
            }

            const priceFeed = response.parsed[0]
            
            return {
                id: priceId,
                price: {
                    price: priceFeed.price?.price || "0",
                    conf: priceFeed.price?.conf || "0", 
                    expo: priceFeed.price?.expo || 0,
                    publishTime: priceFeed.price?.publish_time || 0,
                },
                emaPrice: {
                    price: priceFeed.ema_price?.price || "0",
                    conf: priceFeed.ema_price?.conf || "0",
                    expo: priceFeed.ema_price?.expo || 0,
                    publishTime: priceFeed.ema_price?.publish_time || 0,
                },
            }
        } catch (error) {
            throw new Error(
                `Failed to fetch price for ${priceId}: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async getPrices(priceIds: string[]): Promise<PriceData[]> {
        try {
            const params: Record<string, string> = {
                'encoding': 'hex',
                'parsed': 'true'
            }
            
            priceIds.forEach(id => {
                params[`ids[]`] = id
            })

            const response = await this.makeRequest('/v2/updates/price/latest', params)
            
            if (!response.parsed) {
                return []
            }

            return response.parsed.map((priceFeed: any, index: number) => ({
                id: priceIds[index] || priceFeed.id,
                price: {
                    price: priceFeed.price?.price || "0",
                    conf: priceFeed.price?.conf || "0",
                    expo: priceFeed.price?.expo || 0,
                    publishTime: priceFeed.price?.publish_time || 0,
                },
                emaPrice: {
                    price: priceFeed.ema_price?.price || "0",
                    conf: priceFeed.ema_price?.conf || "0",
                    expo: priceFeed.ema_price?.expo || 0,
                    publishTime: priceFeed.ema_price?.publish_time || 0,
                },
            }))
        } catch (error) {
            throw new Error(
                `Failed to fetch prices: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async getPriceFeedMetadata(): Promise<PriceFeedMetadata[]> {
        try {
            return await this.makeRequest('/v2/price_feeds')
        } catch (error) {
            throw new Error(
                `Failed to fetch price feed metadata: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async searchPriceFeeds(query: string): Promise<PriceFeedMetadata[]> {
        try {
            const allFeeds = await this.getPriceFeedMetadata()
            const queryLower = query.toLowerCase()
            
            return allFeeds.filter(feed => 
                feed.attributes.symbol?.toLowerCase().includes(queryLower) ||
                feed.attributes.base_symbol?.toLowerCase().includes(queryLower) ||
                feed.attributes.description?.toLowerCase().includes(queryLower)
            )
        } catch (error) {
            throw new Error(
                `Failed to search price feeds: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    // Common price IDs for convenience
    static readonly COMMON_PRICE_IDS = {
        BTC_USD: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        USDC_USD: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
        USDT_USD: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
        SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        HYPE_USD: "0x27a9ba1de4f3c44f3ee89054c4d6e5772d88b1e9c9c5a8c5c5d6c5e2d5d5e5e5",
    } as const
}

// Create singleton instance following the defensive pattern used in the codebase
let pythClientInstance: PythClient | undefined

export function createPythClient(): PythClient {
    if (!pythClientInstance) {
        try {
            pythClientInstance = new PythClient()
        } catch (error) {
            console.warn("Failed to create Pyth client, using fallback stub:", error)
            // Return a stub implementation in case of initialization failures
            pythClientInstance = {
                async getPrice(): Promise<never> {
                    throw new Error("Pyth client is unavailable. Check your configuration and network connectivity.")
                },
                async getPrices(): Promise<never> {
                    throw new Error("Pyth client is unavailable. Check your configuration and network connectivity.")
                },
                async getPriceFeedMetadata(): Promise<never> {
                    throw new Error("Pyth client is unavailable. Check your configuration and network connectivity.")
                },
                async searchPriceFeeds(): Promise<never> {
                    throw new Error("Pyth client is unavailable. Check your configuration and network connectivity.")
                },
            } as PythClient
        }
    }

    return pythClientInstance
}

export const pythClient = createPythClient()