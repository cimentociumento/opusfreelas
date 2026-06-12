/** ID fixo usado no mock RPC quando o modo dev está ativo (sem sessão Clerk). */
export const DEV_MOCK_USER_ID = "current_user";

export function isDemandOwner(
  demandContractorId: string,
  currentUserId: string | null | undefined
): boolean {
  return currentUserId != null && currentUserId === demandContractorId;
}
