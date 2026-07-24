import { parseGa4MarketOpportunitiesSnapshot } from "@/lib/ga4/dashboard";
import { getLatestGa4Snapshot } from "@/lib/ga4/snapshot";
import { buildVehiclePerformance } from "@/lib/ga4/vehicle-performance";
import { VehiclePerformance } from "../vehicle-performance";

export default async function VehiclePerformancePage() {
  const { snapshot, error } = await getLatestGa4Snapshot();
  return <>{error ? <div className="notice" role="status">Vehicle website-demand data could not be refreshed. Please try again shortly.</div> : null}<VehiclePerformance data={buildVehiclePerformance(parseGa4MarketOpportunitiesSnapshot(snapshot))}/></>;
}
