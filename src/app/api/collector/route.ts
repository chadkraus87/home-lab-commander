import { getCollectorStatus, runCollector } from "@/server/collector";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import { assertSameOrigin } from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  if (isHostedDemo())
    return Response.json({ error: hostedDemoMessage }, { status: 403 });
  return Response.json(getCollectorStatus());
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    if (isHostedDemo())
      return Response.json({ error: hostedDemoMessage }, { status: 403 });
    return Response.json(await runCollector());
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Collector run failed.",
      },
      { status: 400 },
    );
  }
}
