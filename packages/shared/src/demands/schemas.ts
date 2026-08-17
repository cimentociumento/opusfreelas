import { z } from "zod";
import { serviceCategories } from "../discovery/schemas";

export const demandStatusSchema = z.enum(["aberta", "em_contato", "concluida", "cancelada", "encerrada"]);
export type DemandStatus = z.infer<typeof demandStatusSchema>;

// serviceType da demanda é texto livre (sem enum no banco) — este array só
// alimenta os pickers de chip em create.tsx/[id].tsx. "Outros serviços" fica
// aqui, não em serviceCategories, para não afetar filtros/categorias do
// lado prestador que reaproveitam aquele array.
export const demandServiceTypeOptions = [...serviceCategories, "Outros serviços"] as const;

export const demandUrgencySchema = z.enum(["baixa", "media", "alta", "urgente_hoje"]);
export type DemandUrgency = z.infer<typeof demandUrgencySchema>;

export const createDemandSchema = z.object({
  serviceType: z.string().min(2).max(100),
  description: z.string().min(30).max(1000),
  municipality: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  urgency: demandUrgencySchema.default("media"),
  visibilityRadius: z.number().int().min(1).max(100).default(10),
});

export type CreateDemandInput = z.infer<typeof createDemandSchema>;

export const updateDemandSchema = createDemandSchema.partial().extend({
  status: demandStatusSchema.optional(),
});

export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;

export const updateDemandRpcSchema = updateDemandSchema.extend({
  id: z.string().uuid(),
});

export type UpdateDemandRpcInput = z.infer<typeof updateDemandRpcSchema>;

export const deleteDemandSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteDemandInput = z.infer<typeof deleteDemandSchema>;

export const getDemandByIdSchema = z.object({
  id: z.string().uuid(),
});

export type GetDemandByIdInput = z.infer<typeof getDemandByIdSchema>;

export const listVisibleDemandsSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  municipality: z.string().optional(),
  category: z.string().optional(),
});

export type ListVisibleDemandsInput = z.infer<typeof listVisibleDemandsSchema>;

export const demandResponseSchema = z.object({
  id: z.string().uuid(),
  contractorId: z.string(),
  serviceType: z.string(),
  description: z.string(),
  municipality: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  urgency: demandUrgencySchema,
  visibilityRadius: z.number(),
  status: demandStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  // Só preenchidos por demands.getById, para o card de contato do prestador.
  contractorName: z.string().nullable().optional(),
  contractorPhone: z.string().nullable().optional(),
});

export type DemandResponse = z.infer<typeof demandResponseSchema>;
