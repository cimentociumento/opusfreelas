import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useMemo } from "react";
import { getApiBaseUrl } from "../lib/api-url";

export function useRpc() {
  const { getToken } = useAuth();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const callRpc = useCallback(async <T = unknown>(procedure: string, input?: unknown): Promise<T> => {
    const token = await getToken();
    if (!token) {
      throw new Error("Sessao invalida: faca login novamente.");
    }

    const response = await fetch(`${apiBaseUrl}/rpc`, {
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

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Resposta invalida da API (${response.status}): ${text.slice(0, 120)}`);
    }

    if (!response.ok) {
      const err = data as { error?: string; details?: unknown };
      const detail =
        err?.details && typeof err.details === "object"
          ? JSON.stringify(err.details)
          : err?.details != null
            ? String(err.details)
            : "";
      throw new Error([err?.error ?? "RPC call failed", detail].filter(Boolean).join(" — "));
    }

    return data as T;
  }, [apiBaseUrl, getToken]);

  return { callRpc, apiBaseUrl };
}
