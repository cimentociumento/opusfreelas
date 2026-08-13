import { z } from "zod";

export const profileRoleFlagsSchema = z.object({
  isContractor: z.boolean(),
  isProvider: z.boolean(),
});

export type ProfileRoleFlagsInput = z.infer<typeof profileRoleFlagsSchema>;

export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  municipality: z.string().trim().min(2).max(80),
});

export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileSchema>;

export const updateProviderSocialProfileSchema = z.object({
  bio: z.string().trim().min(40).max(1000),
  yearsExperience: z.number().int().min(0).max(60),
  portfolioUrls: z.array(z.string()).min(1).max(6),
});

export type UpdateProviderSocialProfileInput = z.infer<
  typeof updateProviderSocialProfileSchema
>;

export const uploadPortfolioImageSchema = z.object({
  imageBase64: z.string().min(1).max(2_800_000), // ~2MB decoded image ceiling
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export type UploadPortfolioImageInput = z.infer<typeof uploadPortfolioImageSchema>;
