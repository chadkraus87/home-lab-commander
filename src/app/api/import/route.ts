import { portableExportSchema } from "@/domain/schemas";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import { assertSameOrigin } from "@/server/request-security";
import { getStore } from "@/server/store";
import { log } from "@/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumImportBytes = 2 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    if (isHostedDemo())
      return Response.json({ error: hostedDemoMessage }, { status: 403 });
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > maximumImportBytes)
      return Response.json(
        { error: "The import is larger than the 2 MB safety limit." },
        { status: 413 },
      );
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maximumImportBytes)
      return Response.json(
        { error: "The import is larger than the 2 MB safety limit." },
        { status: 413 },
      );
    const parsedJson: unknown = JSON.parse(text);
    const payload = portableExportSchema.safeParse(parsedJson);
    if (!payload.success)
      return Response.json(
        { error: "This file is not a valid HomeLab Commander export." },
        { status: 400 },
      );
    log("info", "portable_import.validated", {
      deviceCount: payload.data.data.devices.length,
      serviceCount: payload.data.data.services.length,
      inventoryCount: payload.data.data.inventory.length,
      noteCount: payload.data.data.notes.length,
    });
    return Response.json(
      getStore().replacePortableData({
        ...payload.data.data,
        settings: { ...payload.data.data.settings, mode: "demo" },
      }),
    );
  } catch (error) {
    log("warn", "portable_import.rejected", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      { error: "Import failed. Existing data was not overwritten." },
      { status: 400 },
    );
  }
}
