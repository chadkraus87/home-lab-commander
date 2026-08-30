import { createSocket } from "node:dgram";
import { z } from "zod";
import { numberToIpv4, parseCidr } from "@/domain/network";
import { hostedDemoMessage, isHostedDemo } from "@/server/deployment";
import { assertSameOrigin } from "@/server/request-security";
import { getStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  deviceId: z.string().min(1).max(200),
  cidr: z.string().min(1).max(64),
  confirmation: z.string().max(300),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    if (isHostedDemo())
      return Response.json({ error: hostedDemoMessage }, { status: 403 });
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json({ error: "Invalid wake request." }, { status: 400 });
    const snapshot = getStore().snapshot();
    if (snapshot.settings.mode !== "live")
      return Response.json(
        { error: "Wake-on-LAN is available only in Live Mode." },
        { status: 403 },
      );
    if (!snapshot.settings.approvedCidrs.includes(parsed.data.cidr))
      return Response.json(
        { error: "Select an explicitly approved private network." },
        { status: 403 },
      );
    const cidr = parseCidr(parsed.data.cidr);
    if (!cidr || cidr.prefix < 24)
      return Response.json(
        { error: "Wake-on-LAN is limited to approved /24 or smaller ranges." },
        { status: 400 },
      );
    const device = snapshot.devices.find(
      (item) => item.id === parsed.data.deviceId,
    );
    if (!device || device.source === "demo")
      return Response.json(
        { error: "Wake-on-LAN requires a non-demo device record." },
        { status: 404 },
      );
    if (parsed.data.confirmation !== `WAKE ${device.hostname}`)
      return Response.json(
        { error: `Type WAKE ${device.hostname} exactly to confirm.` },
        { status: 400 },
      );
    const mac = device.macAddress.replaceAll(/[^a-fA-F0-9]/g, "");
    if (mac.length !== 12)
      return Response.json(
        { error: "This device does not have a valid MAC address." },
        { status: 400 },
      );
    const address = numberToIpv4(cidr.broadcast);
    const packet = Buffer.concat([
      Buffer.alloc(6, 0xff),
      ...Array.from({ length: 16 }, () => Buffer.from(mac, "hex")),
    ]);
    await sendMagicPacket(packet, address);
    return Response.json({
      ok: true,
      message: `Wake packet sent to ${device.displayName} on ${parsed.data.cidr}.`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Wake-on-LAN failed." },
      { status: 400 },
    );
  }
}

function sendMagicPacket(packet: Buffer, address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createSocket("udp4");
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Wake-on-LAN timed out."));
    }, 3_000);
    socket.once("error", (error) => {
      clearTimeout(timeout);
      socket.close();
      reject(error);
    });
    socket.bind(0, "0.0.0.0", () => {
      socket.setBroadcast(true);
      socket.send(packet, 9, address, (error) => {
        clearTimeout(timeout);
        socket.close();
        if (error) reject(error);
        else resolve();
      });
    });
  });
}
