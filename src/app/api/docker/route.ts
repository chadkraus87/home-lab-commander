import { DockerCliProvider } from "@/server/docker";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import { log } from "@/server/logger";

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
  if (!available) {
    log("info", "docker.provider.unavailable");
    return Response.json({
      available: false,
      containers: [],
      message: "Docker is not available. Demo container data remains active.",
    });
  }
  try {
    const containers = await provider.listContainers();
    log("info", "docker.provider.completed", {
      containerCount: containers.length,
    });
    return Response.json({
      available: true,
      containers,
      message: "Connected to the local Docker daemon in read-only mode.",
    });
  } catch {
    log("warn", "docker.provider.failed");
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
