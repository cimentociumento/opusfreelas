import { z } from "zod";

export const serviceCategories = [
  "Roçada / Capina",
  "Diarista / Faxina",
  "Operador de Máquina Agrícola",
  "Serviços Gerais / Pequenos Reparos",
  "Pedreiro / Servente",
  "Pintura",
  "Eletricista / Encanador",
  "Cuidado com Animais",
] as const;

export const serviceCategorySchema = z.enum(serviceCategories);
export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

export const providerSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: serviceCategorySchema.optional(),
  municipality: z.string().trim().min(1).optional(),
  radius: z.number().int().min(1).max(200).default(50),
});

export type ProviderSearchInput = z.infer<typeof providerSearchSchema>;

export const providerResultSchema = z.object({
  clerkUserId: z.string(),
  isProvider: z.boolean(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable().optional(),
  municipality: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  yearsExperience: z.number().nullable().optional(),
  portfolioUrls: z.array(z.string()).default([]),
  serviceCategories: z.array(serviceCategorySchema),
  phone: z.string().nullable().optional(),
  completedServicesCount: z.number().default(0),
  ratingAverage: z.number().default(5.0),
  ratingCount: z.number().default(0),
  distanceMeters: z.number(),
});

export type ProviderResult = z.infer<typeof providerResultSchema>;

export const providerProfileSchema = providerResultSchema.omit({ distanceMeters: true });
export type ProviderProfile = z.infer<typeof providerProfileSchema>;

export const getProviderProfileSchema = z.object({
  clerkUserId: z.string(),
});

export type GetProviderProfileInput = z.infer<typeof getProviderProfileSchema>;

export const updateProviderProfileSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceCategories: z.array(serviceCategorySchema),
});

export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;
