import { useCallback, useEffect, useRef, useState } from "react";
import { useRpc } from "./use-rpc";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erro desconhecido. Tente novamente.";
}

export function useRpcQuery<T>(procedure: string, input?: unknown, enabled = true) {
  const { callRpc } = useRpc();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await callRpc<T>(procedure, input);
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [callRpc, enabled, input, procedure]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
