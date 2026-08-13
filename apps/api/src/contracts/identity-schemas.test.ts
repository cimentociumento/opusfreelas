import { describe, expect, it } from "vitest";
import {
  updateIdentityProfileSchema,
  updateProviderSocialProfileSchema,
} from "@amauc/shared";

describe("updateIdentityProfileSchema", () => {
  it("accepts a valid name and municipality", () => {
    const result = updateIdentityProfileSchema.safeParse({
      displayName: "Maria Souza",
      municipality: "Concórdia",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = updateIdentityProfileSchema.safeParse({
      displayName: " ",
      municipality: "Concórdia",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing municipality", () => {
    const result = updateIdentityProfileSchema.safeParse({ displayName: "Maria" });
    expect(result.success).toBe(false);
  });
});

describe("updateProviderSocialProfileSchema", () => {
  const validBio =
    "Trabalho com roçada e capina há vários anos na região de Concórdia.";

  it("accepts a complete social profile", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: 5,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bio shorter than 40 chars", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: "trabalho bem",
      yearsExperience: 5,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty portfolio", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: 5,
      portfolioUrls: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative years of experience", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: -1,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(false);
  });
});
