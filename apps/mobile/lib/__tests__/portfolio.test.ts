import { resolvePortfolioContentType, isProviderSocialProfileComplete } from "../portfolio";

describe("resolvePortfolioContentType", () => {
  it("passes through png and webp", () => {
    expect(resolvePortfolioContentType("image/png")).toBe("image/png");
    expect(resolvePortfolioContentType("image/webp")).toBe("image/webp");
  });
  it("defaults unknown or missing types to jpeg", () => {
    expect(resolvePortfolioContentType("image/gif")).toBe("image/jpeg");
    expect(resolvePortfolioContentType(undefined)).toBe("image/jpeg");
    expect(resolvePortfolioContentType(null)).toBe("image/jpeg");
  });
});

describe("isProviderSocialProfileComplete", () => {
  const longBio = "Trabalho com roçada e capina há muitos anos na região.";
  it("is true when bio >= 40 chars, years set, and >= 1 photo", () => {
    expect(isProviderSocialProfileComplete({ bio: longBio, yearsExperience: 5, photoCount: 1 })).toBe(true);
  });
  it("is false when bio is too short", () => {
    expect(isProviderSocialProfileComplete({ bio: "trabalho bem", yearsExperience: 5, photoCount: 1 })).toBe(false);
  });
  it("is false when there are no photos", () => {
    expect(isProviderSocialProfileComplete({ bio: longBio, yearsExperience: 5, photoCount: 0 })).toBe(false);
  });
  it("is false when years is null", () => {
    expect(isProviderSocialProfileComplete({ bio: longBio, yearsExperience: null, photoCount: 1 })).toBe(false);
  });
});
