import { z } from "zod";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import {
  checkProviderById,
  listProviderSummaries,
} from "@/server/provider-registry";
import { assertSameOrigin } from "@/server/request-security";
import { getStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  if (isHostedDemo())
    return Response.json({ providers: [], message: hostedDemoMessage });
  try {
    return Response.json({ providers: listProviderSummaries() });
  } catch (error) {
    return Response.json(
      {
        providers: [],
        error:
          error instanceof Error
            ? error.message
            : "Provider configuration failed.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    if (isHostedDemo())
      return Response.json({ error: hostedDemoMessage }, { status: 403 });
    const parsed = z
      .object({ id: z.string().min(1).max(80) })
      .safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Invalid provider identifier." },
        { status: 400 },
      );
    const result = await checkProviderById(
      parsed.data.id,
      getStore().snapshot().settings.approvedCidrs,
    );
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Provider check failed.",
      },
      { status: 400 },
    );
  }
}
