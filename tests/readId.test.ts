import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/meta/client", () => ({ callModel: vi.fn(), isMockMode: () => true }));

import { callModel } from "@/lib/meta/client";
import { ReadIdError, readId } from "@/lib/agent/readId";

const mockedCall = vi.mocked(callModel);
const image = new Uint8Array([1, 2, 3]);
const valid = {
  idFields: { surname: "Okafor", firstName: "Chinonso", dateOfBirth: "1990-07-21" },
  quality: ["glare"],
};

describe("readId", () => {
  beforeEach(() => mockedCall.mockReset());

  it("returns validated fields and quality flags", async () => {
    mockedCall.mockResolvedValueOnce(JSON.stringify(valid));
    await expect(readId(image, "image/jpeg")).resolves.toEqual(valid);
    expect(mockedCall).toHaveBeenCalledTimes(1);
  });

  it("accepts JSON wrapped in a code fence", async () => {
    mockedCall.mockResolvedValueOnce("```json\n" + JSON.stringify(valid) + "\n```");
    await expect(readId(image, "image/jpeg")).resolves.toEqual(valid);
  });

  it("retries once when the reply is invalid", async () => {
    mockedCall.mockResolvedValueOnce("not json").mockResolvedValueOnce(JSON.stringify(valid));
    await expect(readId(image, "image/jpeg")).resolves.toEqual(valid);
    expect(mockedCall).toHaveBeenCalledTimes(2);
  });

  it("gives a clear error after two invalid replies", async () => {
    mockedCall.mockResolvedValue(JSON.stringify({ idFields: { surname: "Okafor" }, quality: [] }));
    await expect(readId(image, "image/jpeg")).rejects.toBeInstanceOf(ReadIdError);
    expect(mockedCall).toHaveBeenCalledTimes(2);
  });

  it("rejects a reply containing a full ID number", async () => {
    const leaky = { ...valid, idFields: { ...valid.idFields, idNumberLast4: "12345678901" } };
    mockedCall.mockResolvedValue(JSON.stringify(leaky));
    await expect(readId(image, "image/jpeg")).rejects.toBeInstanceOf(ReadIdError);
  });
});
