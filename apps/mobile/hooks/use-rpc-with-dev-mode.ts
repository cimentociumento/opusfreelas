import { useCallback, useMemo } from "react";
import { useDevelopmentMode } from "./use-development-mode";
import { useRpc } from "./use-rpc";
import { getApiBaseUrl } from "../lib/api-url";

const DEV_BYPASS_TOKEN = process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN ?? "";

function useDevRpc() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const callRpc = useCallback(
    async <T = unknown>(procedure: string, input?: unknown): Promise<T> => {
      if (!DEV_BYPASS_TOKEN) {
        throw new Error(
          "EXPO_PUBLIC_DEV_BYPASS_TOKEN não definido no .env do mobile."
        );
      }

      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl}/rpc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEV_BYPASS_TOKEN}`,
          },
          body: JSON.stringify({ procedure, input: input ?? {} }),
        });
      } catch {
        throw new Error(
          `Não foi possível conectar na API (${apiBaseUrl}). ` +
            `Verifique se a API está rodando e se EXPO_PUBLIC_API_URL está correto.`
        );
      }

      const text = await response.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Resposta inválida da API (${response.status}): ${text.slice(0, 120)}`
        );
      }

      if (!response.ok) {
        const err = data as { error?: string; details?: unknown };
        const detail =
          err?.details && typeof err.details === "object"
            ? JSON.stringify(err.details)
            : err?.details != null
              ? String(err.details)
              : "";
        throw new Error(
          [err?.error ?? "RPC call failed", detail].filter(Boolean).join(" — ")
        );
      }

      return data as T;
    },
    [apiBaseUrl]
  );

  return { callRpc };
}

export function useRpcWithDevMode() {
  const { isDevMode } = useDevelopmentMode();
  const devRpc = useDevRpc();
  const realRpc = useRpc();

  const callRpc = useCallback(
    async <T = unknown>(procedure: string, input?: unknown): Promise<T> => {
      if (isDevMode) {
        console.log(`🛠️ [DEV] RPC → Supabase real: ${procedure}`);
        return devRpc.callRpc<T>(procedure, input);
      }
      console.log(`📱 [PROD] RPC → Clerk + Supabase: ${procedure}`);
      return realRpc.callRpc<T>(procedure, input);
    },
    [isDevMode, devRpc, realRpc]
  );

  return { callRpc, isDevMode };
}