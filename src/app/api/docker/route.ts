import { DockerCliProvider } from "@/server/docker";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (isHostedDemo())
    return Response.json({
      available: false,
      containers: [],
      message: hostedDemoMessage,
    });
  const provider = new DockerCliProvider();
  const available = await provider.available();
  if (!available)
    return Response.json({
      available: false,
      containers: [],
      message: "Docker is not available. Demo container data remains active.",
    });
  try {
    return Response.json({
      available: true,
      containers: await provider.listContainers(),
      message: "Connected to the local Docker daemon in read-only mode.",
    });
  } catch {
    return Response.json(
      {
        available: true,
        containers: [],
        message: "Docker responded, but container details could not be read.",
      },
      { status: 503 },
    );
  }
}
