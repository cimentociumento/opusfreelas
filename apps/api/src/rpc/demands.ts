import {
  createDemandSchema,
  updateDemandRpcSchema,
  deleteDemandSchema,
  getDemandByIdSchema,
  listVisibleDemandsSchema,
} from "@amauc/shared";
import type { Context } from "hono";
import { getAuthUser } from "../middleware/clerk.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getContactWithClerkFallback, ensureProfileInDb } from "../lib/profile.js";
import { mapDemandRow } from "../lib/demands-mapper.js";

const CLOSED_DEMAND_STATUSES = new Set(["concluida", "cancelada", "encerrada"]);

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
    return { error: "forbidden" as const, reason: "Acesso negado: você não é o autor desta demanda" };
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

    // Sem onboarding obrigatório, este é o primeiro write de um contratante
    // novo — garante a linha em profiles antes do insert, senão a FK
    // demands_contractor_id_fkey rejeita (ver profiles vazio pra usuário
    // recém-logado).
    await ensureProfileInDb(auth.userId);

    const duplicateWindowStart = new Date(Date.now() - 5_000).toISOString();
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
      return c.json(
        {
          error: "Duplicate demand",
          reason: "A demand with the same content was created recently",
          id: recentDuplicate.id,
        },
        409
      );
    }

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

    return c.json(data.map((row: Parameters<typeof mapDemandRow>[0]) => mapDemandRow(row)));
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
      return c.json(
        {
          error: "Forbidden",
          reason: ownership.reason ?? "Only the demand creator can edit",
        },
        403
      );
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
      return c.json(
        {
          error: "Forbidden",
          reason: ownership.reason ?? "Only the demand creator can delete",
        },
        403
      );
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
    const parsed = listVisibleDemandsSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { latitude, longitude, municipality, category } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("get_visible_demands", {
      user_lat: latitude,
      user_lng: longitude,
      filter_municipality: municipality || null,
      exclude_contractor_id: auth.userId,
      filter_category: category || null
    });

    if (error) {
      console.error("Error fetching visible demands:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json(data.map((row: Parameters<typeof mapDemandRow>[0]) => mapDemandRow(row)));
  },

  "demands.getById": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = getDemandByIdSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: demand, error } = await supabase
      .from("demands")
      .select()
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (error) {
      console.error("[demands.getById] Database error:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }
    // Mesma regra da RLS "demands_select_all_active" (20260612000000_update_demand_status.sql):
    // demanda encerrada/concluída/cancelada só é visível pro próprio dono.
    if (!demand || (CLOSED_DEMAND_STATUSES.has(demand.status) && demand.contractor_id !== auth.userId)) {
      return c.json({ error: "Demand not found" }, 404);
    }

    const contractor = await getContactWithClerkFallback(supabase, demand.contractor_id);

    return c.json(
      mapDemandRow(demand, { display_name: contractor.displayName, phone: contractor.phone })
    );
  }
};
