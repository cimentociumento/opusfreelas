import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Base URL da API Hono em desenvolvimento.
 * - Defina EXPO_PUBLIC_API_URL para sobrescrever (recomendado em CI/prod).
 * - Com Expo Go no celular, hostUri costuma ser o IP da máquina (mesmo host do Metro).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://127.0.0.1:3000";
}
