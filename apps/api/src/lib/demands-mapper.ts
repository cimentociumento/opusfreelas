import type { DemandResponse } from "@amauc/shared";

type DemandRow = {
  id: string;
  contractor_id: string;
  service_type: string;
  description: string;
  municipality: string;
  location?: unknown;
  latitude?: number | null;
  longitude?: number | null;
  urgency: DemandResponse["urgency"];
  visibility_radius: number;
  status: DemandResponse["status"];
  created_at: string;
  updated_at: string;
};

type ParsedCoordinates = {
  latitude: number;
  longitude: number;
};

function parseGeoJsonLocation(value: unknown): ParsedCoordinates | null {
  if (typeof value === "string") {
    try {
      return parseGeoJsonLocation(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const coordinates = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { latitude, longitude };
}

function parseWktPoint(value: string): ParsedCoordinates | null {
  const match = value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) {
    return null;
  }

  const longitude = Number(match[1]);
  const latitude = Number(match[2]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { latitude, longitude };
}

function parseEwkbPointHex(value: string): ParsedCoordinates | null {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length < 42) {
    return null;
  }

  const buffer = Buffer.from(value, "hex");
  if (buffer.length < 21) {
    return null;
  }

  const littleEndian = buffer[0] === 1;
  const readUInt32 = (offset: number) =>
    littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  const readDouble = (offset: number) =>
    littleEndian ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);

  let offset = 1;
  const wkbType = readUInt32(offset);
  offset += 4;

  if ((wkbType & 0xff) !== 1) {
    return null;
  }

  if ((wkbType & 0x20000000) !== 0) {
    offset += 4;
  }

  if (buffer.length < offset + 16) {
    return null;
  }

  const longitude = readDouble(offset);
  const latitude = readDouble(offset + 8);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function parseDemandLocation(location: unknown): ParsedCoordinates | null {
  if (location == null) {
    return null;
  }

  const geoJson = parseGeoJsonLocation(location);
  if (geoJson) {
    return geoJson;
  }

  if (typeof location === "string") {
    const wkt = parseWktPoint(location);
    if (wkt) {
      return wkt;
    }

    return parseEwkbPointHex(location);
  }

  return null;
}

export function mapDemandRow(row: DemandRow): DemandResponse {
  const fromColumns =
    row.latitude != null && row.longitude != null
      ? { latitude: row.latitude, longitude: row.longitude }
      : null;
  const parsed = fromColumns ?? parseDemandLocation(row.location);

  if (!parsed) {
    throw new Error(`Demand ${row.id} is missing valid location coordinates`);
  }

  return {
    id: row.id,
    contractorId: row.contractor_id,
    serviceType: row.service_type,
    description: row.description,
    municipality: row.municipality,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    urgency: row.urgency,
    visibilityRadius: row.visibility_radius,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
