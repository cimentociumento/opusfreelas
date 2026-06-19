import { useAuth } from "@clerk/clerk-expo";
import { useDevelopmentMode } from "./use-development-mode";

export function useAuthWithDevMode() {
  const { isDevMode } = useDevelopmentMode();
  const realAuth = useAuth();

  if (isDevMode) {
    // Modo DEV: Retorna autenticação mockada
    return {
      isSignedIn: true, // Sempre logado no modo DEV
      userId: "dev-user-id",
      signOut: () => console.log("🛠️ DEV MODE: Mock signOut"),
      getToken: () => Promise.resolve("dev-mock-token"),
      isLoaded: true,
    };
  }

  // Modo PROD: Retorna autenticação real do Clerk
  return realAuth;
}
