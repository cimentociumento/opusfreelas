import { renderHook } from "@testing-library/react-native";
import { useRpcWithDevMode } from "../use-rpc-with-dev-mode";

jest.mock("../use-development-mode", () => ({
  useDevelopmentMode: () => ({ isDevMode: true }),
}));
jest.mock("../use-rpc", () => ({
  useRpc: () => ({ callRpc: jest.fn() }),
}));
jest.mock("../../lib/api-url", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

describe("useRpcWithDevMode bypass token build gate", () => {
  const originalDev = (global as any).__DEV__;
  const originalFetch = global.fetch;

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN;
  });

  it("never sends the bypass token when __DEV__ is false, even if the env var leaked into the bundle", async () => {
    process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN = "leaked-secret";
    (global as any).__DEV__ = false;

    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const { result } = await renderHook(() => useRpcWithDevMode());

    await expect(result.current.callRpc("identity.getProfile")).rejects.toThrow(/não configurado/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the bypass token normally when __DEV__ is true", async () => {
    process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN = "dev-secret";
    (global as any).__DEV__ = true;

    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    }));
    global.fetch = fetchMock as any;

    const { result } = await renderHook(() => useRpcWithDevMode());

    await result.current.callRpc("identity.getProfile");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/rpc",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer dev-secret" }),
      }),
    );
  });
});
