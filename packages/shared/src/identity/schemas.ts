import { z } from "zod";

export const profileRoleFlagsSchema = z.object({
  isContractor: z.boolean(),
  isProvider: z.boolean(),
});

export type ProfileRoleFlagsInput = z.infer<typeof profileRoleFlagsSchema>;

export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileSchema>;
