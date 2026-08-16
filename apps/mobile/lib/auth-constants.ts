export function isDemandOwner(
  demandContractorId: string,
  currentUserId: string | null | undefined
): boolean {
  return currentUserId != null && currentUserId === demandContractorId;
}