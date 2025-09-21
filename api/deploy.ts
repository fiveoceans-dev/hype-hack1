import { performHyperliquidDeployment } from "../src/hyperliquid/deploy"

const ALLOWED_METHOD = "POST" as const

type AllowedMethod = typeof ALLOWED_METHOD

type DeployRequest = {
    method?: string
}

type DeployResponse = {
    status: (statusCode: number) => DeployResponse
    json: (body: unknown) => DeployResponse
    setHeader: (name: string, value: string | readonly string[]) => void
}

function methodNotAllowedResponse(response: DeployResponse, method: string | undefined): DeployResponse {
    response.setHeader("Allow", ALLOWED_METHOD)
    const description = method ? `${method.toUpperCase()} is not supported.` : "An HTTP method is required."

    return response.status(405).json({
        ok: false,
        error: "Method Not Allowed",
        details: [
            description,
            `Use ${ALLOWED_METHOD} to trigger a Hyperliquid deployment.`,
        ],
    })
}

export default async function handler(request: DeployRequest, response: DeployResponse): Promise<void> {
    const method = request.method?.toUpperCase() as AllowedMethod | undefined

    if (method !== ALLOWED_METHOD) {
        methodNotAllowedResponse(response, request.method)
        return
    }

    try {
        const result = await performHyperliquidDeployment()

        response.status(200).json({
            ok: true,
            methodSignature: result.methodSignature,
            payload: result.payload,
            response: result.response,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const [headline, ...rest] = message.split("\n").map(part => part.trim()).filter(Boolean)

        console.error("Hyperliquid deployment failed while serving /api/deploy:", error)

        response.status(500).json({
            ok: false,
            error: headline ?? "Deployment failed with an unknown error.",
            details: rest.length > 0 ? rest : undefined,
        })
    }
}
