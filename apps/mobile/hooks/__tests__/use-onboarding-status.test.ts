import { renderHook, waitFor } from "@testing-library/react-native";
import { useOnboardingStatus } from "../use-onboarding-status";

const mockCallRpc = jest.fn();

jest.mock("../use-effective-user-id", () => ({
  useEffectiveUserId: () => ({ userId: "user_test_123", isReady: true }),
}));
jest.mock("../use-rpc", () => ({
  useRpc: () => ({ callRpc: mockCallRpc }),
}));

describe("useOnboardingStatus", () => {
  beforeEach(() => mockCallRpc.mockReset());

  it("needsOnboarding = true when displayName is empty", async () => {
    mockCallRpc.mockResolvedValue({ displayName: null });
    const { result } = await renderHook(() => useOnboardingStatus());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });

  it("needsOnboarding = false when displayName is set", async () => {
    mockCallRpc.mockResolvedValue({ displayName: "Maria" });
    const { result } = await renderHook(() => useOnboardingStatus());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(false);
  });

  it("treats an RPC failure as needing onboarding", async () => {
    mockCallRpc.mockRejectedValue(new Error("network"));
    const { result } = await renderHook(() => useOnboardingStatus());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });
});
