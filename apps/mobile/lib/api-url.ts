import Constants from "expo-constants";
import { Platform } from "react-native";

function hostFromDebugger(debuggerHost: string | undefined): string | null {
  if (!debuggerHost) return null;
  const host = debuggerHost.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

/**
 * Base URL da API Hono em desenvolvimento.
 * - Defina EXPO_PUBLIC_API_URL com o IP da máquina no celular físico (Expo Go).
 * - Sem env: usa o mesmo host do Metro (hostUri / debuggerHost).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const hostFromUri = hostUri ? hostFromDebugger(hostUri) : null;
  if (hostFromUri) {
    return `http://${hostFromUri}:3000`;
  }

  const legacyHost = (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  const hostFromLegacy = hostFromDebugger(legacyHost);
  if (hostFromLegacy) {
    return `http://${hostFromLegacy}:3000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://127.0.0.1:3000";
}
