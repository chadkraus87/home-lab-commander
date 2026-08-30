import { diagnosticInputSchema } from "@/domain/schemas";
import { SafeHealthCheckProvider } from "@/server/health-checks";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import { assertSameOrigin } from "@/server/request-security";
import { log } from "@/server/logger";
import { resolveApprovedAddresses } from "@/server/local-http";
import { getStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    if (isHostedDemo())
      return Response.json({ error: hostedDemoMessage }, { status: 403 });
    const parsed = diagnosticInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid diagnostic request.",
        },
        { status: 400 },
      );
    await resolveApprovedAddresses(
      parsed.data.host,
      getStore().snapshot().settings.approvedCidrs,
    );
    const result = await new SafeHealthCheckProvider().run(parsed.data);
    log("info", "diagnostic.completed", {
      kind: parsed.data.kind,
      ok: result.ok,
    });
    return Response.json(result);
  } catch (error) {
    log("warn", "diagnostic.rejected", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The diagnostic could not be completed.",
      },
      { status: 400 },
    );
  }
}
