import type { DemandResponse } from "@amauc/shared";

type DemandRow = {
  id: string;
  contractor_id: string;
  service_type: string;
  description: string;
  municipality: string;
  location?: { coordinates?: [number, number] } | string | null;
  urgency: DemandResponse["urgency"];
  visibility_radius: number;
  status: DemandResponse["status"];
  created_at: string;
  updated_at: string;
};

// PostgREST/Supabase retorna colunas geography(POINT) como hex EWKB
// (ex.: "0101000020E6100000...") em vez de GeoJSON — só objetos com
// `.coordinates` vêm de mocks de teste. Ponto 2D com SRID: 1 byte de
// ordem + 4 bytes tipo/flag SRID + 4 bytes SRID + 8 bytes X + 8 bytes Y.
function parseEwkbPoint(hex: string): { lng: number; lat: number } | null {
  if (hex.length < 50 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const buffer = Buffer.from(hex, "hex");
  if (buffer.readUInt8(0) !== 1) {
    return null; // formato big-endian não esperado neste projeto
  }
  const lng = buffer.readDoubleLE(9);
  const lat = buffer.readDoubleLE(17);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

export function mapDemandRow(row: DemandRow): DemandResponse {
  let lng: number | undefined = typeof row.location === "object" ? row.location?.coordinates?.[0] : undefined;
  let lat: number | undefined = typeof row.location === "object" ? row.location?.coordinates?.[1] : undefined;

  if ((lng == null || lat == null) && typeof row.location === "string") {
    const parsed = parseEwkbPoint(row.location);
    if (parsed) {
      lng = parsed.lng;
      lat = parsed.lat;
    }
  }

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
