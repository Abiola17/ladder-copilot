// Orchestrates steps 1-3: read the ID, compare with the form, explain the fixes.
import { compare } from "@/lib/agent/compare";
import { explain } from "@/lib/agent/explain";
import { readId } from "@/lib/agent/readId";
import type { CheckResult, IdFields, Language } from "@/lib/types";

export async function runCheck(
  image: Uint8Array,
  mimeType: string,
  form: IdFields,
  language: Language,
): Promise<CheckResult> {
  const { idFields, quality } = await readId(image, mimeType);
  const findings = await explain(compare(idFields, form, quality), language);
  return {
    status: findings.length === 0 ? "ready" : "needs_fix",
    findings,
    idFields,
    quality,
  };
}
