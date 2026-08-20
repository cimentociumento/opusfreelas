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

  it("accepts an optional phone alongside name and municipality", () => {
    const result = updateIdentityProfileSchema.safeParse({
      displayName: "Maria Souza",
      municipality: "Concórdia",
      phone: "49999998888",
    });
    expect(result.success).toBe(true);
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

  // Rascunho progressivo (migration 20260816000000): a busca não exige mais
  // perfil completo para listar o prestador, então o schema aceita salvar
  // bio curta, sem fotos ou sem anos de experiência sem travar o formulário.
  it("accepts a bio shorter than 40 chars (progressive draft save)", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: "trabalho bem",
      yearsExperience: 5,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty portfolio (progressive draft save)", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: 5,
      portfolioUrls: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an entirely blank draft with all fields omitted", () => {
    const result = updateProviderSocialProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe("");
      expect(result.data.portfolioUrls).toEqual([]);
      expect(result.data.yearsExperience).toBeUndefined();
    }
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
