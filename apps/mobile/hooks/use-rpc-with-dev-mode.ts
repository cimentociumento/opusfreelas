import { useCallback, useMemo } from "react";
import { useDevelopmentMode } from "./use-development-mode";
import { useRpc } from "./use-rpc";
import { getApiBaseUrl } from "../lib/api-url";

function getDevBypassToken() {
  // __DEV__ é substituído por um literal em build time; isso permite que o
  // minificador elimine este branch (e o token) do bundle de produção.
  if (!__DEV__) return "";
  return process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN ?? "";
}

function useDevRpc() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const callRpc = useCallback(async <T = unknown>(procedure: string, input?: unknown): Promise<T> => {
    const devBypassToken = getDevBypassToken();
    if (!devBypassToken) {
      throw new Error("EXPO_PUBLIC_DEV_BYPASS_TOKEN não configurado.");
    }

    try {
      const response = await fetch(`${apiBaseUrl}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devBypassToken}`,
        },
        body: JSON.stringify({ procedure, input: input ?? {} }),
      });

      const text = await response.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Resposta inválida da API (${response.status})`);
      }

      if (!response.ok) {
        const err = data as any;
        throw new Error(err?.reason || err?.error || "Erro ao executar operação");
      }

      return data as T;
    } catch (err: any) {
      console.error(`[DEV RPC] Erro em ${procedure}:`, err);
      throw err;
    }
  }, [apiBaseUrl]);

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