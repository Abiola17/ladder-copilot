export type Language = "en" | "pcm" | "yo" | "ig" | "ha"; // English, Pidgin, Yoruba, Igbo, Hausa

export type IdFields = {
  surname: string;
  firstName: string;
  middleName?: string;
  dateOfBirth: string; // ISO yyyy-mm-dd
  idNumberLast4?: string; // never store or log the full ID number
};

export type QualityFlag = "blurry" | "glare" | "cropped" | "face_not_visible";

export type FindingType =
  | "name_order"
  | "short_form"
  | "spelling"
  | "missing_name"
  | "dob_mismatch"
  | "photo_quality";

export type Finding = {
  type: FindingType;
  field: keyof IdFields | "photo";
  onId: string; // what the ID says
  entered: string; // what the user typed
  evidence: string; // where on the ID this comes from, e.g. "name field, line 1"
  fix: string; // plain-language fix in the chosen language
};

export type CheckResult = {
  status: "ready" | "needs_fix";
  findings: Finding[];
  idFields: IdFields;
  quality: QualityFlag[];
};
