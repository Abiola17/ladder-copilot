import { describe, expect, it } from "vitest";
import { compare, levenshtein, normalise, parseDate } from "@/lib/agent/compare";
import type { IdFields } from "@/lib/types";

// Fictional person
const id: IdFields = {
  surname: "Adeyemi",
  firstName: "Funmilayo",
  middleName: "Grace",
  dateOfBirth: "1996-03-14",
};

const types = (form: Partial<IdFields>, quality: Parameters<typeof compare>[2] = []) =>
  compare(id, { ...id, ...form }, quality).map((f) => [f.type, f.field]);

describe("normalise", () => {
  it("trims, collapses spaces, lowercases and strips accents", () => {
    expect(normalise("  Fúnmiláyọ̀   ADÉ ")).toBe("funmilayo ade");
  });
});

describe("levenshtein", () => {
  it("counts edits", () => {
    expect(levenshtein("adeyemi", "adeyemi")).toBe(0);
    expect(levenshtein("adeyemi", "adeyami")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("parseDate", () => {
  it.each([
    ["1996-03-14"],
    ["14/03/1996"],
    ["14-03-1996"],
    ["14.3.1996"],
    ["14 Mar 1996"],
    ["14 March 1996"],
    ["March 14, 1996"],
  ])("parses %s", (input) => {
    expect(parseDate(input)).toEqual({ y: 1996, m: 3, d: 14 });
  });

  it("rejects impossible or unknown dates", () => {
    expect(parseDate("31/02/1996")).toBeNull();
    expect(parseDate("14 Foo 1996")).toBeNull();
    expect(parseDate("yesterday")).toBeNull();
  });
});

describe("compare", () => {
  it("returns no findings when everything matches", () => {
    expect(compare(id, id)).toEqual([]);
  });

  it("ignores case, extra spaces, accents and date format", () => {
    expect(
      types({ surname: " ADEYEMI ", firstName: "Fúnmiláyọ̀", dateOfBirth: "14/03/1996" }),
    ).toEqual([]);
  });

  describe("name_order", () => {
    it("flags swapped surname and first name", () => {
      expect(types({ surname: "Funmilayo", firstName: "Adeyemi" })).toEqual([
        ["name_order", "surname"],
        ["name_order", "firstName"],
      ]);
    });

    it("flags swapped first and middle name", () => {
      expect(types({ firstName: "Grace", middleName: "Funmilayo" })).toEqual([
        ["name_order", "firstName"],
        ["name_order", "middleName"],
      ]);
    });
  });

  describe("short_form", () => {
    it("flags a known short form", () => {
      const [finding] = compare(id, { ...id, firstName: "Funmi" });
      expect(finding).toMatchObject({
        type: "short_form",
        field: "firstName",
        onId: "Funmilayo",
        entered: "Funmi",
      });
    });

    it("flags a known short form shorter than 4 letters", () => {
      const ada = { ...id, firstName: "Adaeze" };
      expect(compare(ada, { ...ada, firstName: "Ada" }).map((f) => f.type)).toEqual(["short_form"]);
    });

    it("flags a prefix of at least 4 letters", () => {
      const named = { ...id, middleName: "Christabel" };
      expect(compare(named, { ...named, middleName: "Christ" }).map((f) => f.type)).toEqual([
        "short_form",
      ]);
    });

    it("does not treat a 3-letter unknown prefix as a short form", () => {
      const named = { ...id, middleName: "Gracious" };
      expect(compare(named, { ...named, middleName: "Gra" }).map((f) => f.type)).toEqual([
        "missing_name",
      ]);
    });
  });

  describe("spelling", () => {
    it("flags a 1-character difference", () => {
      expect(types({ surname: "Adeyami" })).toEqual([["spelling", "surname"]]);
    });

    it("flags a 2-character difference", () => {
      expect(types({ surname: "Adeyimy" })).toEqual([["spelling", "surname"]]);
    });

    it("does not flag 3+ character differences as spelling", () => {
      expect(types({ surname: "Okonkwo" })).toEqual([["missing_name", "surname"]]);
    });
  });

  describe("missing_name", () => {
    it("flags a middle name left blank", () => {
      const [finding] = compare(id, { ...id, middleName: "" });
      expect(finding).toMatchObject({ type: "missing_name", field: "middleName", onId: "Grace" });
    });

    it("flags a name replaced by a different one", () => {
      expect(types({ firstName: "Bolanle" })).toEqual([["missing_name", "firstName"]]);
    });

    it("does not flag a middle name the ID does not have", () => {
      const noMiddle = { ...id, middleName: undefined };
      expect(compare(noMiddle, { ...noMiddle, middleName: "" })).toEqual([]);
    });
  });

  describe("dob_mismatch", () => {
    it("flags a different date", () => {
      const [finding] = compare(id, { ...id, dateOfBirth: "15/03/1996" });
      expect(finding.type).toBe("dob_mismatch");
      expect(finding.fix).toContain("14/03/1996");
    });

    it("flags a day/month swap specifically", () => {
      // ID says 4 March; user typed 03/04 (read day-first as 3 April)
      const early = { ...id, dateOfBirth: "1996-03-04" };
      const [swap] = compare(early, { ...early, dateOfBirth: "03/04/1996" });
      expect(swap.type).toBe("dob_mismatch");
      expect(swap.fix).toMatch(/swapped/);
    });

    it("does not call a plain wrong date a swap", () => {
      const [finding] = compare(id, { ...id, dateOfBirth: "15/03/1996" });
      expect(finding.fix).not.toMatch(/swapped/);
    });

    it("flags an unreadable date", () => {
      const [finding] = compare(id, { ...id, dateOfBirth: "fourteenth" });
      expect(finding.type).toBe("dob_mismatch");
      expect(finding.fix).toMatch(/could not read/);
    });
  });

  describe("photo_quality", () => {
    it("adds one finding per quality flag", () => {
      expect(types({}, ["blurry", "glare"])).toEqual([
        ["photo_quality", "photo"],
        ["photo_quality", "photo"],
      ]);
    });
  });

  it("every finding points to evidence and has a fix", () => {
    const findings = compare(
      id,
      { surname: "Funmilayo", firstName: "Adeyemi", middleName: "", dateOfBirth: "1 Jan 1990" },
      ["cropped"],
    );
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.evidence).not.toBe("");
      expect(f.fix).not.toBe("");
    }
  });
});
