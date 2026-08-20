import { discoveryInputSchema } from "@/domain/schemas";
import { LocalDiscoveryProvider } from "@/server/discovery";
import { assertSameOrigin } from "@/server/request-security";
import { getStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastDiscoveryAt = 0;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const parsed = discoveryInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid discovery request.",
        },
        { status: 400 },
      );
    if (
      !getStore().snapshot().settings.approvedCidrs.includes(parsed.data.cidr)
    )
      return Response.json(
        { error: "Approve this private network in Settings before discovery." },
        { status: 403 },
      );
    const now = Date.now();
    if (now - lastDiscoveryAt < 30_000)
      return Response.json(
        {
          error:
            "Discovery is rate-limited. Wait 30 seconds before scanning again.",
        },
        { status: 429 },
      );
    lastDiscoveryAt = now;
    const results = await new LocalDiscoveryProvider().discover(
      parsed.data.cidr,
      parsed.data.method,
    );
    return Response.json({
      cidr: parsed.data.cidr,
      method: parsed.data.method,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Discovery is unavailable on this system.";
    return Response.json({ error: message }, { status: 400 });
  }
}
