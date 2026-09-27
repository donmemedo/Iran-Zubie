import { VehicleDetailView } from "@/components/dashboard/views/vehicle-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleDetailView vehicleId={Number(id)} />;
}
