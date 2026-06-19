export const DEV_MOCK_USER_ID =
  process.env.EXPO_PUBLIC_DEV_BYPASS_USER_ID ?? "dev-user-local";

export function isDemandOwner(
  demandContractorId: string,
  currentUserId: string | null | undefined
): boolean {
  return currentUserId != null && currentUserId === demandContractorId;
}