import { useEffect, useState } from "react";
import { useEffectiveUserId } from "./use-effective-user-id";
import { useRpcWithDevMode } from "./use-rpc-with-dev-mode";

export type OnboardingStatus = {
  /** null enquanto ainda não sabemos (RPC em andamento) */
  needsOnboarding: boolean | null;
  isReady: boolean;
};

/**
 * Consumido por (app)/_layout.tsx (bloqueia rotas logadas) e por
 * app/onboarding.tsx (evita reexibir a tela pra quem já preencheu o nome).
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { userId, isReady: authReady } = useEffectiveUserId();
  const { callRpc } = useRpcWithDevMode();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authReady || !userId) return;

    let cancelled = false;
    callRpc<{ displayName?: string | null }>("identity.getProfile")
      .then((profile) => {
        if (!cancelled) setNeedsOnboarding(!profile.displayName);
      })
      .catch((error) => {
        console.error("[use-onboarding-status.check] Failed to load profile", error);
        if (!cancelled) setNeedsOnboarding(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, callRpc]);

  return { needsOnboarding, isReady: authReady && needsOnboarding !== null };
}
