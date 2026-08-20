import type { AppSnapshot } from "@/domain/types";
import { assertSameOrigin } from "@/server/request-security";
import { getStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PortableExport {
  version: 1;
  data: Pick<
    AppSnapshot,
    "devices" | "services" | "inventory" | "notes" | "settings"
  >;
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const payload: unknown = await request.json();
    if (!isPortableExport(payload))
      return Response.json(
        { error: "This file is not a valid HomeLab Commander export." },
        { status: 400 },
      );
    return Response.json(getStore().replacePortableData(payload.data));
  } catch {
    return Response.json(
      { error: "Import failed. Existing data was not overwritten." },
      { status: 400 },
    );
  }
}

function isPortableExport(value: unknown): value is PortableExport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== 1 ||
    !candidate.data ||
    typeof candidate.data !== "object"
  )
    return false;
  const data = candidate.data as Record<string, unknown>;
  if (
    !Array.isArray(data.devices) ||
    !Array.isArray(data.services) ||
    !Array.isArray(data.inventory) ||
    !Array.isArray(data.notes)
  )
    return false;
  if (!data.settings || typeof data.settings !== "object") return false;
  return (
    data.devices.every(hasId) &&
    data.services.every(hasId) &&
    data.inventory.every(hasId) &&
    data.notes.every(hasId)
  );
}

function hasId(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).id === "string",
  );
}
