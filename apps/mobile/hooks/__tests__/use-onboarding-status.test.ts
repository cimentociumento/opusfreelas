import { renderHook, waitFor } from "@testing-library/react-native";
import { useOnboardingStatus } from "../use-onboarding-status";

const mockCallRpc = jest.fn();

jest.mock("../use-effective-user-id", () => ({
  useEffectiveUserId: () => ({ userId: "user_test_123", isReady: true }),
}));
jest.mock("../use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));

describe("useOnboardingStatus", () => {
  beforeEach(() => {
    mockCallRpc.mockReset();
  });

  it("needsOnboarding is true when profile has no displayName", async () => {
    mockCallRpc.mockResolvedValue({ displayName: null });

    const { result } = await renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });

  it("needsOnboarding is false when profile already has displayName", async () => {
    mockCallRpc.mockResolvedValue({ displayName: "Maria Souza" });

    const { result } = await renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(false);
  });

  it("treats a failed profile fetch as needing onboarding", async () => {
    mockCallRpc.mockRejectedValue(new Error("network down"));

    const { result } = await renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });
});
