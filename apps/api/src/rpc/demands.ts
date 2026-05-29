import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { 
  createDemandSchema, 
  updateDemandSchema, 
  type CreateDemandInput, 
  type UpdateDemandInput,
  demandResponseSchema
} from "@amauc/shared";
import type { Context } from "hono";
import { getAuthUser } from "../middleware/clerk.js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, serviceRoleKey);
}

// Map database row to shared schema
function mapDemandRow(row: any) {
  // Extract coordinates from PostGIS geography point (POINT(lng lat))
  // Usually returned as string or object depending on driver/RPC
  // For standard Supabase select on geography, it might return a GeoJSON-like object
  const lng = row.location?.coordinates?.[0] ?? 0;
  const lat = row.location?.coordinates?.[1] ?? 0;

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

export const demandHandlers = {
  "demands.create": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = createDemandSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { serviceType, description, municipality, latitude, longitude, urgency, visibilityRadius } = parsed.data;
    const supabase = getSupabaseAdmin();

    const duplicateWindowStart = new Date(Date.now() - 60_000).toISOString();
    const { data: recentDuplicate } = await supabase
      .from("demands")
      .select()
      .eq("contractor_id", auth.userId)
      .eq("service_type", serviceType)
      .eq("description", description)
      .gte("created_at", duplicateWindowStart)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentDuplicate) {
      return c.json(mapDemandRow(recentDuplicate));
    }

    // Use RPC or raw SQL for PostGIS insertion if possible, 
    // but Supabase JS allows strings for geography in some versions or via explicit casting in RPC.
    // Here we use a common pattern for PostGIS via Supabase: ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    // Since we don't have a custom RPC yet, we'll try standard insertion if geography is supported as GeoJSON/String
    
    const { data, error } = await supabase
      .from("demands")
      .insert({
        contractor_id: auth.userId,
        service_type: serviceType,
        description: description,
        municipality: municipality,
        location: `POINT(${longitude} ${latitude})`,
        urgency: urgency,
        visibility_radius: visibilityRadius,
        status: "aberta"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating demand:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json(mapDemandRow(data));
  },

  "demands.listMyDemands": async (c: Context) => {
    const auth = getAuthUser(c);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("demands")
      .select()
      .eq("contractor_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json(data.map(mapDemandRow));
  },

  "demands.update": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateDemandSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    // Need ID in input for update
    const { id, ...updateData } = input as any;
    if (!id) return c.json({ error: "Missing demand ID" }, 400);

    const supabase = getSupabaseAdmin();

    // Verify ownership and status
    const { data: existing, error: fetchError } = await supabase
      .from("demands")
      .select("contractor_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: "Demand not found" }, 404);
    }

    if (existing.contractor_id !== auth.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (existing.status === "encerrada" && !parsed.data.status) {
      return c.json({ error: "Cannot edit closed demand" }, 400);
    }

    const dbUpdate: any = {};
    if (parsed.data.serviceType) dbUpdate.service_type = parsed.data.serviceType;
    if (parsed.data.description) dbUpdate.description = parsed.data.description;
    if (parsed.data.municipality) dbUpdate.municipality = parsed.data.municipality;
    if (parsed.data.urgency) dbUpdate.urgency = parsed.data.urgency;
    if (parsed.data.visibilityRadius) dbUpdate.visibility_radius = parsed.data.visibilityRadius;
    if (parsed.data.status) dbUpdate.status = parsed.data.status;
    if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
      dbUpdate.location = `POINT(${parsed.data.longitude} ${parsed.data.latitude})`;
    }

    const { data, error } = await supabase
      .from("demands")
      .update(dbUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json(mapDemandRow(data));
  },

  "demands.listVisible": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const schema = z.object({
      latitude: z.number(),
      longitude: z.number(),
      municipality: z.string().optional()
    });

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { latitude, longitude, municipality } = parsed.data;
    const supabase = getSupabaseAdmin();

    // Use PostGIS ST_DWithin
    // ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, visibility_radius * 1000)
    // In Supabase, we can use a raw filter or a stored procedure (RPC)
    // Raw filter with PostGIS is tricky via .filter(). 
    // Recommended approach for spatial in Supabase is RPC.
    
    const { data, error } = await supabase.rpc("get_visible_demands", {
      user_lat: latitude,
      user_lng: longitude,
      filter_municipality: municipality || null
    });

    if (error) {
      console.error("Error fetching visible demands:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json(data.map(mapDemandRow));
  }
};
