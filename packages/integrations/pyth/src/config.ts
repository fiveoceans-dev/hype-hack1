// Pyth Network Configuration
// This module validates and exports configuration settings for connecting to the Pyth Network's Price Service API.
// It uses the zod library to ensure environment variables are correctly set and provides default values where appropriate.

import { z } from "zod"

const pythEnvSchema = z.object({
    PYTH_PRICE_SERVICE_URL: z
        .string()
        .url("PYTH_PRICE_SERVICE_URL must be a valid URL.")
        .default("https://hermes.pyth.network"),
    PYTH_API_KEY: z
        .string()
        .min(1, "PYTH_API_KEY for enhanced rate limits.")
        .optional(),
})

const parsedEnv = pythEnvSchema.safeParse({
    PYTH_PRICE_SERVICE_URL: process.env.PYTH_PRICE_SERVICE_URL,
    PYTH_API_KEY: process.env.PYTH_API_KEY,
})

if (!parsedEnv.success) {
    console.error("Invalid Pyth Network configuration:")
    console.error(parsedEnv.error.format())
    process.exit(1)
}

type PythEnv = z.infer<typeof pythEnvSchema>

export const pythConfig: Readonly<{
    priceServiceUrl: PythEnv["PYTH_PRICE_SERVICE_URL"]
    apiKey: PythEnv["PYTH_API_KEY"]
}> = Object.freeze({
    priceServiceUrl: parsedEnv.data.PYTH_PRICE_SERVICE_URL,
    apiKey: parsedEnv.data.PYTH_API_KEY,
})

export type PythConfig = typeof pythConfig