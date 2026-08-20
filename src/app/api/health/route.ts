import { getStore } from "@/server/store";
import { log } from "@/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  try {
    const snapshot = getStore().snapshot();
    return Response.json({
      status: "healthy",
      mode: snapshot.settings.mode,
      deployment: snapshot.hostedDemo ? "hosted-demo" : "local",
      database: snapshot.hostedDemo ? "ephemeral" : "ready",
      generatedAt: snapshot.generatedAt,
    });
  } catch {
    log("error", "health.database.unavailable");
    return Response.json(
      { status: "unhealthy", message: "The local database is unavailable." },
      { status: 503 },
    );
  }
}
