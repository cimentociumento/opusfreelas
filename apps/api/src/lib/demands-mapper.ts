import type { DemandResponse } from "@amauc/shared";

type DemandRow = {
  id: string;
  contractor_id: string;
  service_type: string;
  description: string;
  municipality: string;
  location?: { coordinates?: [number, number] } | null;
  urgency: DemandResponse["urgency"];
  visibility_radius: number;
  status: DemandResponse["status"];
  created_at: string;
  updated_at: string;
};

export function mapDemandRow(row: DemandRow): DemandResponse {
  const lng = row.location?.coordinates?.[0];
  const lat = row.location?.coordinates?.[1];

  if (lng == null || lat == null) {
    throw new Error(`Demand ${row.id} is missing valid location coordinates`);
  }

  return {
    id: row.id,
    contractorId: row.contractor_id,
    serviceType: row.service_type,
    description: row.description,
    municipality: row.municipality,
    latitude: lat,
    longitude: lng,
    urgency: row.urgency,
    visibilityRadius: row.visibility_radius,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
