// apps/web/hooks/use-rpc.ts
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useMemo } from "react";
import { getApiBaseUrl } from "../lib/api-url";

export function useRpc() {
  const { getToken } = useAuth();

  const apiBaseUrl = useMemo(() => {
    return getApiBaseUrl();
  }, []);

  const callRpc = useCallback(async <T = unknown>(
    procedure: string, 
    input?: unknown
  ): Promise<T> => {
    const token = await getToken();
    if (!token) {
      throw new Error("Sessão inválida: faça login novamente.");
    }

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          procedure,
          input: input ?? {},
        }),
      });
    } catch (err) {
      console.error("Fetch error:", err);
      throw new Error(`Não foi possível conectar na API (${apiBaseUrl}). Verifique se o backend está rodando.`);
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Resposta inválida da API (${response.status})`);
    }

    if (!response.ok) {
      const err = data as { error?: string; details?: unknown; reason?: string };
      const message = err?.reason || err?.error || "Erro ao executar operação";
      throw new Error(message);
    }

    return data as T;
  }, [apiBaseUrl, getToken]);

  return { callRpc };
}