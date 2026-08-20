import { diagnosticInputSchema } from "@/domain/schemas";
import { SafeHealthCheckProvider } from "@/server/health-checks";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import { assertSameOrigin } from "@/server/request-security";

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
    const result = await new SafeHealthCheckProvider().run(parsed.data);
    return Response.json(result);
  } catch (error) {
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
