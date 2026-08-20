import { getStore } from "@/server/store";

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
    return Response.json(
      { status: "unhealthy", message: "The local database is unavailable." },
      { status: 503 },
    );
  }
}
