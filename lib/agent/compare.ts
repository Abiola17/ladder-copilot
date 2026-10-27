// Step 2: deterministic mismatch rules. No AI here.
// `fix` gets a plain English default; explain.ts rewrites it in the user's language.
import type { Finding, IdFields, QualityFlag } from "@/lib/types";
import { isKnownShortForm } from "@/lib/names/shortForms";

type NameField = "surname" | "firstName" | "middleName";

const NAME_FIELDS: NameField[] = ["surname", "firstName", "middleName"];

const FIELD_LABELS: Record<NameField, string> = {
  surname: "surname",
  firstName: "first name",
  middleName: "middle name",
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const QUALITY_FIXES: Record<QualityFlag, string> = {
  blurry: "The photo is blurry. Hold the phone steady and retake it in good light.",
  glare: "There is glare on the ID. Move away from direct light or tilt the card slightly and retake it.",
  cropped: "Part of the ID is cut off. Make sure all four corners are inside the photo.",
  face_not_visible: "The face on the ID is not clear. Retake the photo so the face is fully visible.",
};

/** Trim, collapse spaces, lowercase, strip accents. For matching only. */
export function normalise(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

type YMD = { y: number; m: number; d: number };

function validDate(y: number, m: number, d: number): YMD | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

/**
 * Parse yyyy-mm-dd, dd/mm/yyyy (also - or .), "14 Mar 1996" and "Mar 14, 1996".
 * Numeric dates with the year last are read day-first, as on Nigerian IDs.
 */
export function parseDate(value: string): YMD | null {
  const s = normalise(value);
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    return validDate(+m[1], +m[2], +m[3]);
  }
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    return validDate(+m[3], +m[2], +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})[ -]([a-z]+)\.?,?[ -](\d{4})$/))) {
    const month = MONTHS[m[2].slice(0, 3)];
    return month ? validDate(+m[3], month, +m[1]) : null;
  }
  if ((m = s.match(/^([a-z]+)\.? (\d{1,2}),? (\d{4})$/))) {
    const month = MONTHS[m[1].slice(0, 3)];
    return month ? validDate(+m[3], month, +m[2]) : null;
  }
  return null;
}

function formatDate({ y, m, d }: YMD): string {
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function compareNames(id: IdFields, form: IdFields): Finding[] {
  const findings: Finding[] = [];

  for (const field of NAME_FIELDS) {
    const onId = id[field] ?? "";
    const entered = form[field] ?? "";
    const idName = normalise(onId);
    const enteredName = normalise(entered);
    if (idName === enteredName || !idName) continue;

    const label = FIELD_LABELS[field];
    const base = { field, onId, entered, evidence: `${label} on the ID` };

    const otherIdNames = NAME_FIELDS.filter((f) => f !== field).map((f) => normalise(id[f]));
    const otherFormNames = NAME_FIELDS.filter((f) => f !== field).map((f) => normalise(form[f]));

    if (enteredName && otherIdNames.includes(enteredName)) {
      findings.push({
        ...base,
        type: "name_order",
        fix: `You entered "${entered}" as your ${label}, but on your ID that is a different name. Your ${label} should be "${onId}".`,
      });
    } else if (!enteredName) {
      findings.push({
        ...base,
        type: "missing_name",
        fix: `Your ID has the ${label} "${onId}". Add it to the form exactly as it appears on the ID.`,
      });
    } else if (isKnownShortForm(enteredName, idName)) {
      findings.push({
        ...base,
        type: "short_form",
        fix: `"${entered}" is a short form. Use the full ${label} on your ID: "${onId}".`,
      });
    } else if (levenshtein(enteredName, idName) <= 2) {
      findings.push({
        ...base,
        type: "spelling",
        fix: `The spelling is different from your ID. Type your ${label} as "${onId}".`,
      });
    } else if (enteredName.length >= 4 && idName.startsWith(enteredName)) {
      findings.push({
        ...base,
        type: "short_form",
        fix: `"${entered}" is a shortened name. Use the full ${label} on your ID: "${onId}".`,
      });
    } else if (otherFormNames.includes(idName)) {
      findings.push({
        ...base,
        type: "name_order",
        fix: `You put "${onId}" in a different box. On your ID it is your ${label}.`,
      });
    } else {
      findings.push({
        ...base,
        type: "missing_name",
        fix: `Your ID has the ${label} "${onId}", but it is not on the form. Use the name exactly as it appears on the ID.`,
      });
    }
  }

  return findings;
}

function compareDob(id: IdFields, form: IdFields): Finding[] {
  const onIdDate = parseDate(id.dateOfBirth);
  const enteredDate = parseDate(form.dateOfBirth);
  const base = {
    type: "dob_mismatch" as const,
    field: "dateOfBirth" as const,
    onId: id.dateOfBirth,
    entered: form.dateOfBirth,
    evidence: "date of birth on the ID",
  };

  if (!onIdDate) return []; // readId validates this; nothing reliable to compare against
  const expected = formatDate(onIdDate);

  if (!enteredDate) {
    return [{ ...base, fix: `We could not read the date you entered. Enter it as on your ID: ${expected} (day/month/year).` }];
  }
  const { y, m, d } = enteredDate;
  if (y === onIdDate.y && m === onIdDate.m && d === onIdDate.d) return [];

  if (y === onIdDate.y && m === onIdDate.d && d === onIdDate.m) {
    return [{ ...base, fix: `The day and month are swapped. Your ID says ${expected} (day/month/year).` }];
  }
  return [{ ...base, fix: `This date does not match your ID. Your ID says ${expected} (day/month/year).` }];
}

function compareQuality(quality: QualityFlag[]): Finding[] {
  return quality.map((flag) => ({
    type: "photo_quality" as const,
    field: "photo" as const,
    onId: flag,
    entered: "",
    evidence: "ID photo",
    fix: QUALITY_FIXES[flag],
  }));
}

export function compare(id: IdFields, form: IdFields, quality: QualityFlag[] = []): Finding[] {
  return [...compareNames(id, form), ...compareDob(id, form), ...compareQuality(quality)];
}
