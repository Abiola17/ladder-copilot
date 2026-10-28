// Step 1: read the ID photo into structured fields plus photo quality flags.
import { callModel } from "@/lib/meta/client";
import { readIdOutputSchema } from "@/lib/schemas";
import type { IdFields, QualityFlag } from "@/lib/types";

export class ReadIdError extends Error {}

const PROMPT = `You are reading a photo of an identity document.
Reply with JSON only, no other text, in exactly this shape:
{"idFields":{"surname":"","firstName":"","middleName":"","dateOfBirth":"yyyy-mm-dd","idNumberLast4":""},"quality":[]}
Rules:
- Copy names exactly as printed. Leave out middleName if there is none.
- dateOfBirth must be ISO yyyy-mm-dd.
- idNumberLast4 is only the last 4 characters of the ID number. Never return the full number.
- quality lists any of: "blurry", "glare", "cropped", "face_not_visible". Use [] if the photo is clear.`;

function parseReply(reply: string) {
  const json = reply.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "");
  try {
    return readIdOutputSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Reads the ID; retries once if the model's reply is not valid, then gives up. */
export async function readId(
  image: Uint8Array,
  mimeType: string,
): Promise<{ idFields: IdFields; quality: QualityFlag[] }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await callModel({ task: "read_id", prompt: PROMPT, image: { data: image, mimeType } });
    const parsed = parseReply(reply);
    if (parsed?.success) return parsed.data;
  }
  throw new ReadIdError("We could not read your ID. Please retake the photo and try again.");
}
