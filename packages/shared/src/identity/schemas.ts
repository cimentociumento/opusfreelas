import { z } from "zod";

export const profileRoleFlagsSchema = z.object({
  isContractor: z.boolean(),
  isProvider: z.boolean(),
});

export type ProfileRoleFlagsInput = z.infer<typeof profileRoleFlagsSchema>;

export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  municipality: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional(),
});

export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileSchema>;

// Progressive/draft save: um prestador pode salvar bio ou fotos parciais sem
// perder o que já preencheu. A visibilidade na busca não depende mais de
// completude (ver search_providers na migration 20260816000000) — só a
// ownership dos paths de portfólio continua obrigatória (checada no handler).
export const updateProviderSocialProfileSchema = z.object({
  bio: z.string().trim().max(1000).default(""),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  portfolioUrls: z.array(z.string()).min(0).max(6).default([]),
});

export type UpdateProviderSocialProfileInput = z.infer<
  typeof updateProviderSocialProfileSchema
>;

export const uploadPortfolioImageSchema = z.object({
  imageBase64: z.string().min(1).max(2_800_000), // ~2MB decoded image ceiling
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export type UploadPortfolioImageInput = z.infer<typeof uploadPortfolioImageSchema>;
