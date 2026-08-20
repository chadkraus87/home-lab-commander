import { DeviceDetailPage } from "@/features/devices/device-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeviceDetailPage deviceId={id} />;
}
