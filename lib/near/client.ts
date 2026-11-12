import OpenAI from 'openai'

export const BASE_URL = 'https://cloud-api.near.ai/v1'
// z-ai/glm-5.3-flash is the canonical TEE-hosted model (zai-org/GLM-5.1-FP8 is an alias)
export const DEFAULT_TEE_MODEL = 'z-ai/glm-5.3-flash'

export function createClient(): OpenAI {
  const apiKey = process.env.NEAR_AI_API_KEY
  if (!apiKey) throw new Error('NEAR_AI_API_KEY is not set in environment')
  const baseURL = process.env.NEAR_AI_BASE_URL ?? BASE_URL
  return new OpenAI({ baseURL, apiKey })
}

export async function listModels(client: OpenAI): Promise<OpenAI.Models.Model[]> {
  const response = await client.models.list()
  return response.data
}

// TEE-hosted models on NEAR AI Cloud. z-ai/* and zai-org/* are confirmed TEE-hosted (Nov 2026).
const TEE_ORG_PREFIXES = ['z-ai/', 'zai-org/', 'near-ai/', 'nearai/']

export function selectTeeModel(models: OpenAI.Models.Model[]): string {
  const teeModel = models.find((m) =>
    TEE_ORG_PREFIXES.some((prefix) => m.id.startsWith(prefix))
  )
  return teeModel?.id ?? DEFAULT_TEE_MODEL
}
