// deBridge Configuration
// This module validates and exports configuration settings for connecting to the deBridge API.
// It uses the zod library to ensure environment variables are correctly set and provides default values where appropriate.

import { z } from "zod"

const debridgeEnvSchema = z.object({
    DEBRIDGE_API_URL: z
        .string()
        .url("DEBRIDGE_API_URL must be a valid URL.")
        .default("https://api.dln.trade/v1.0"),
    DEBRIDGE_API_KEY: z
        .string()
        .min(1, "DEBRIDGE_API_KEY is required for API access.")
        .optional(),
})

const parsedEnv = debridgeEnvSchema.safeParse({
    DEBRIDGE_API_URL: process.env.DEBRIDGE_API_URL,
    DEBRIDGE_API_KEY: process.env.DEBRIDGE_API_KEY,
})

if (!parsedEnv.success) {
    console.error("Invalid deBridge configuration:")
    console.error(parsedEnv.error.format())
    process.exit(1)
}

type DebridgeEnv = z.infer<typeof debridgeEnvSchema>

export const debridgeConfig: Readonly<{
    apiUrl: DebridgeEnv["DEBRIDGE_API_URL"]
    apiKey: DebridgeEnv["DEBRIDGE_API_KEY"]
}> = Object.freeze({
    apiUrl: parsedEnv.data.DEBRIDGE_API_URL,
    apiKey: parsedEnv.data.DEBRIDGE_API_KEY,
})

export type DebridgeConfig = typeof debridgeConfig