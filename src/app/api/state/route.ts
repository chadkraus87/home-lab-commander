import { mutationSchema } from "@/domain/schemas";
import {
  assertSameOrigin,
  RequestSecurityError,
} from "@/server/request-security";
import { getStore, StoreError } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(getStore().snapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const parsed = mutationSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        {
          error: "Check the highlighted information and try again.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    const store = getStore();
    let snapshot;
    switch (parsed.data.action) {
      case "add-device":
        snapshot = store.addDevice(parsed.data.data);
        break;
      case "update-device":
        snapshot = store.updateDevice(parsed.data.id, parsed.data.data);
        break;
      case "add-service":
        snapshot = store.addService(parsed.data.data);
        break;
      case "acknowledge-alert":
        snapshot = store.setAlertStatus(parsed.data.id, "acknowledged");
        break;
      case "resolve-alert":
        snapshot = store.setAlertStatus(parsed.data.id, "resolved");
        break;
      case "save-inventory":
        snapshot = store.saveInventory(parsed.data.data, parsed.data.id);
        break;
      case "archive-inventory":
        snapshot = store.archiveInventory(parsed.data.id);
        break;
      case "save-note":
        snapshot = store.saveNote(parsed.data.data, parsed.data.id);
        break;
      case "delete-note":
        snapshot = store.deleteNote(parsed.data.id);
        break;
      case "update-settings":
        snapshot = store.updateSettings(parsed.data.data);
        break;
      case "reset-demo":
        snapshot = store.resetDemo();
        break;
    }
    return Response.json(snapshot);
  } catch (error) {
    if (error instanceof StoreError)
      return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof RequestSecurityError)
      return Response.json({ error: error.message }, { status: 403 });
    return Response.json(
      {
        error:
          "The change could not be saved. Your existing data is unchanged.",
      },
      { status: 500 },
    );
  }
}
