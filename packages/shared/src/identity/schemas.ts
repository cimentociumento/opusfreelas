import { z } from "zod";

export const profileRoleFlagsSchema = z.object({
  isContractor: z.boolean(),
  isProvider: z.boolean(),
});

export type ProfileRoleFlagsInput = z.infer<typeof profileRoleFlagsSchema>;
