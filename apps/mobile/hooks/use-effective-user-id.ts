import { useAuth } from "@clerk/clerk-expo";

export type EffectiveUserId = {
  userId: string | null;
  /** false enquanto o Clerk ainda carrega */
  isReady: boolean;
};

/**
 * Retorna o userId efetivo do usuário autenticado via Clerk.
 */
export function useEffectiveUserId(): EffectiveUserId {
  const { userId, isLoaded } = useAuth();

  if (!isLoaded) {
    return { userId: null, isReady: false };
  }

  return { userId: userId ?? null, isReady: true };
}
