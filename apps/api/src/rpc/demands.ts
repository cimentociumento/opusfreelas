import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  createDemandSchema,
  updateDemandRpcSchema,
  deleteDemandSchema,
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

function mapDemandRow(row: any) {
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

async function getOwnedDemand(supabase: ReturnType<typeof getSupabaseAdmin>, id: string, userId: string) {
  const { data: existing, error: fetchError } = await supabase
    .from("demands")
    .select("contractor_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return { error: "not_found" as const };
  }

  if (existing.contractor_id !== userId) {
    return { error: "forbidden" as const };
  }

  return { existing };
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
    const parsed = updateDemandRpcSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { id, ...updateData } = parsed.data;
    const supabase = getSupabaseAdmin();

    const ownership = await getOwnedDemand(supabase, id, auth.userId);
    if (ownership.error === "not_found") {
      return c.json({ error: "Demand not found" }, 404);
    }
    if (ownership.error === "forbidden") {
      return c.json({ error: "Forbidden", reason: "Only the demand creator can edit" }, 403);
    }

    if (ownership.existing.status === "encerrada" && !updateData.status) {
      return c.json({ error: "Cannot edit closed demand" }, 400);
    }

    const dbUpdate: Record<string, unknown> = {};
    if (updateData.serviceType !== undefined) dbUpdate.service_type = updateData.serviceType;
    if (updateData.description !== undefined) dbUpdate.description = updateData.description;
    if (updateData.municipality !== undefined) dbUpdate.municipality = updateData.municipality;
    if (updateData.urgency !== undefined) dbUpdate.urgency = updateData.urgency;
    if (updateData.visibilityRadius !== undefined) dbUpdate.visibility_radius = updateData.visibilityRadius;
    if (updateData.status !== undefined) dbUpdate.status = updateData.status;
    if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
      dbUpdate.location = `POINT(${updateData.longitude} ${updateData.latitude})`;
    }

    if (Object.keys(dbUpdate).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    const { data, error } = await supabase
      .from("demands")
      .update(dbUpdate)
      .eq("id", id)
      .eq("contractor_id", auth.userId)
      .select()
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json(mapDemandRow(data));
  },

  "demands.delete": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = deleteDemandSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { id } = parsed.data;
    const supabase = getSupabaseAdmin();

    const ownership = await getOwnedDemand(supabase, id, auth.userId);
    if (ownership.error === "not_found") {
      return c.json({ error: "Demand not found" }, 404);
    }
    if (ownership.error === "forbidden") {
      return c.json({ error: "Forbidden", reason: "Only the demand creator can delete" }, 403);
    }

    if (ownership.existing.status !== "encerrada") {
      return c.json({ error: "Cannot delete open demand", reason: "Close the demand before deleting" }, 400);
    }

    const { error } = await supabase
      .from("demands")
      .delete()
      .eq("id", id)
      .eq("contractor_id", auth.userId);

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({ deleted: true, id });
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
