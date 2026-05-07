import { useCallback } from 'react';
import { useDevelopmentMode } from './use-development-mode';
import { useMockRpc } from './use-mock-rpc';
import { useRpc } from './use-rpc';

export function useRpcWithDevMode() {
  const { isDevMode } = useDevelopmentMode();
  const mockRpc = useMockRpc();
  const realRpc = useRpc();

  const callRpc = useCallback(async <T = unknown>(procedure: string, input?: unknown): Promise<T> => {
    if (isDevMode) {
      console.log(`🛠️ [DEV MODE] Using mock for RPC: ${procedure}`);
      return mockRpc.callRpc<T>(procedure, input);
    } else {
      console.log(`📱 [PROD MODE] Using real RPC: ${procedure}`);
      return realRpc.callRpc<T>(procedure, input);
    }
  }, [isDevMode, mockRpc, realRpc]);

  return { callRpc, isDevMode };
}
