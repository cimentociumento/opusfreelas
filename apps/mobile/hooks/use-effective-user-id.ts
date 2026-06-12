import { useAuth } from "@clerk/clerk-expo";
import { DEV_MOCK_USER_ID } from "../lib/auth-constants";
import { useDevelopmentMode } from "./use-development-mode";

export type EffectiveUserId = {
  userId: string | null;
  /** false enquanto Clerk ou modo dev ainda carregam */
  isReady: boolean;
};

/**
 * Retorna o userId efetivo: Clerk em produção, ID mock no modo dev.
 */
export function useEffectiveUserId(): EffectiveUserId {
  const { userId, isLoaded } = useAuth();
  const { isDevMode, isLoading: isDevModeLoading } = useDevelopmentMode();

  if (isDevModeLoading) {
    return { userId: null, isReady: false };
  }

  if (isDevMode) {
    return { userId: DEV_MOCK_USER_ID, isReady: true };
  }

  if (!isLoaded) {
    return { userId: null, isReady: false };
  }

  return { userId: userId ?? null, isReady: true };
}
