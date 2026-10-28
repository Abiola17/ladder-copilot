// Meta Model API wrapper. In mock mode it returns fixture responses so the app
// works before API credits arrive.
import readIdFixture from "@/fixtures/mock/readId.json";

export type ModelTask = "read_id";

export type ModelRequest = {
  task: ModelTask;
  prompt: string;
  image?: { data: Uint8Array; mimeType: string };
};

export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true" || !process.env.META_API_KEY;
}

const MOCK_RESPONSES: Record<ModelTask, string> = {
  read_id: JSON.stringify(readIdFixture),
};

/** Sends one request and returns the model's raw text reply. */
export async function callModel(request: ModelRequest): Promise<string> {
  if (isMockMode()) return MOCK_RESPONSES[request.task];

  // Live calls are wired up in build step 4, after reading the official docs
  // (https://dev.meta.ai/docs/quickstart). Do not guess the endpoint or model IDs.
  throw new Error("Live Meta API calls are not set up yet. Set MOCK_MODE=true.");
}
