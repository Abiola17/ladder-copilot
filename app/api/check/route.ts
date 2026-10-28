// POST /api/check: multipart form with `image`, `form` (JSON IdFields) and `language`.
// The image stays in memory and is never logged or saved.
import { ReadIdError } from "@/lib/agent/readId";
import { runCheck } from "@/lib/agent/runCheck";
import { formSchema, languageSchema } from "@/lib/schemas";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return badRequest("Send the check as multipart form data.");
  }

  const image = body.get("image");
  if (!(image instanceof File) || image.size === 0) return badRequest("Add a photo of your ID.");
  if (!image.type.startsWith("image/")) return badRequest("The ID photo must be an image.");
  if (image.size > MAX_IMAGE_BYTES) return badRequest("The ID photo must be under 10 MB.");

  const language = languageSchema.safeParse(body.get("language"));
  if (!language.success) return badRequest("Choose a supported language.");

  let formJson: unknown;
  try {
    formJson = JSON.parse(String(body.get("form") ?? ""));
  } catch {
    return badRequest("The form details are not valid JSON.");
  }
  const form = formSchema.safeParse(formJson);
  if (!form.success) return badRequest("Some form details are missing or invalid.");

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    return Response.json(await runCheck(bytes, image.type, form.data, language.data));
  } catch (err) {
    if (err instanceof ReadIdError) return Response.json({ error: err.message }, { status: 422 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
