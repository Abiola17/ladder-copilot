// Zod schemas for API input and model output. Types still come from lib/types.ts;
// the annotations below make the compiler fail if the two drift apart.
import { z } from "zod";
import type { IdFields, Language, QualityFlag } from "@/lib/types";

export const languageSchema: z.ZodType<Language> = z.enum(["en", "pcm", "yo", "ig", "ha"]);

export const qualityFlagSchema: z.ZodType<QualityFlag> = z.enum([
  "blurry",
  "glare",
  "cropped",
  "face_not_visible",
]);

const name = z.string().trim().max(100);

/** Fields read from the ID. Date must be ISO; never more than the last 4 ID digits. */
export const idFieldsSchema: z.ZodType<IdFields> = z.object({
  surname: name.min(1),
  firstName: name.min(1),
  middleName: name.optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  idNumberLast4: z.string().length(4).optional(),
});

/** What the user plans to enter. The date can be in any format compare.ts understands. */
export const formSchema: z.ZodType<IdFields> = z.object({
  surname: name,
  firstName: name,
  middleName: name.optional(),
  dateOfBirth: z.string().trim().max(40),
  idNumberLast4: z.string().length(4).optional(),
});

export const readIdOutputSchema = z.object({
  idFields: idFieldsSchema,
  quality: z.array(qualityFlagSchema),
});
