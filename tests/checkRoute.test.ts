import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/check/route";
import type { CheckResult, IdFields } from "@/lib/types";

// Matches fixtures/mock/readId.json (fictional person)
const matchingForm: IdFields = {
  surname: "Adeyemi",
  firstName: "Funmilayo",
  middleName: "Grace",
  dateOfBirth: "04/03/1996",
};

function request(parts: { image?: File; form?: unknown; language?: string }) {
  const body = new FormData();
  if (parts.image) body.set("image", parts.image);
  if (parts.form !== undefined) body.set("form", JSON.stringify(parts.form));
  if (parts.language) body.set("language", parts.language);
  return new Request("http://localhost/api/check", { method: "POST", body });
}

const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "id.jpg", { type: "image/jpeg" });

describe("POST /api/check (mock mode)", () => {
  beforeEach(() => {
    vi.stubEnv("MOCK_MODE", "true");
  });

  it("returns ready when the form matches the ID", async () => {
    const res = await POST(request({ image: photo, form: matchingForm, language: "en" }));
    expect(res.status).toBe(200);
    const result: CheckResult = await res.json();
    expect(result.status).toBe("ready");
    expect(result.findings).toEqual([]);
    expect(result.idFields.surname).toBe("Adeyemi");
  });

  it("returns findings when the form has problems", async () => {
    const form = { ...matchingForm, firstName: "Funmi", middleName: "", dateOfBirth: "03/04/1996" };
    const res = await POST(request({ image: photo, form, language: "pcm" }));
    const result: CheckResult = await res.json();
    expect(result.status).toBe("needs_fix");
    expect(result.findings.map((f) => f.type)).toEqual(["short_form", "missing_name", "dob_mismatch"]);
  });

  it("rejects a missing image", async () => {
    const res = await POST(request({ form: matchingForm, language: "en" }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-image file", async () => {
    const pdf = new File(["%PDF"], "id.pdf", { type: "application/pdf" });
    const res = await POST(request({ image: pdf, form: matchingForm, language: "en" }));
    expect(res.status).toBe(400);
  });

  it("rejects an unsupported language", async () => {
    const res = await POST(request({ image: photo, form: matchingForm, language: "fr" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid form details", async () => {
    const res = await POST(request({ image: photo, form: { surname: "Adeyemi" }, language: "en" }));
    expect(res.status).toBe(400);
  });
});
