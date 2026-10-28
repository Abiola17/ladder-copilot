// Step 3: rewrite each finding's fix in the user's language.
import { isMockMode } from "@/lib/meta/client";
import type { Finding, Language } from "@/lib/types";

export async function explain(findings: Finding[], language: Language): Promise<Finding[]> {
  // Mock mode keeps compare.ts's English fixes. The live Meta call is added in build step 4.
  if (isMockMode() || findings.length === 0) return findings;
  void language;
  throw new Error("Live Meta API calls are not set up yet. Set MOCK_MODE=true.");
}
