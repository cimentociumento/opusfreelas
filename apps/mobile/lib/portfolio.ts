const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
export type PortfolioContentType = (typeof ALLOWED)[number];

/** Maps an image asset's mime type to one of the API's accepted content types. */
export function resolvePortfolioContentType(mimeType?: string | null): PortfolioContentType {
  if (mimeType === "image/png" || mimeType === "image/webp") return mimeType;
  return "image/jpeg";
}

/** Mirrors the server-side visibility gate: bio >= 40 chars, years set, >= 1 photo. */
export function isProviderSocialProfileComplete(input: {
  bio: string;
  yearsExperience: number | null;
  photoCount: number;
}): boolean {
  return (
    input.bio.trim().length >= 40 &&
    input.yearsExperience !== null &&
    Number.isFinite(input.yearsExperience) &&
    input.photoCount >= 1
  );
}
