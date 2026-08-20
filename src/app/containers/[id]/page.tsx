import { ContainerDetailPage } from "@/features/containers/container-detail-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContainerDetailPage containerId={id} />;
}
