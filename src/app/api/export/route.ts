import { getStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const snapshot = getStore().snapshot();
  const body = JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        devices: snapshot.devices,
        services: snapshot.services,
        inventory: snapshot.inventory,
        notes: snapshot.notes,
        settings: snapshot.settings,
      },
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="homelab-commander-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
