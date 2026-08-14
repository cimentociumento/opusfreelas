import { renderHook, waitFor } from "@testing-library/react-native";
<<<<<<< HEAD
=======
import { useOnboardingStatus } from "../use-onboarding-status";
>>>>>>> origin/feat/nativewind-piloto

const mockCallRpc = jest.fn();

jest.mock("../use-effective-user-id", () => ({
  useEffectiveUserId: () => ({ userId: "user_test_123", isReady: true }),
}));
jest.mock("../use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));

<<<<<<< HEAD
import { useOnboardingStatus } from "../use-onboarding-status";

describe("useOnboardingStatus", () => {
  beforeEach(() => mockCallRpc.mockReset());

  it("needsOnboarding = true when displayName is empty", async () => {
    mockCallRpc.mockResolvedValue({ displayName: null });
    const { result } = await renderHook(() => useOnboardingStatus());
=======
describe("useOnboardingStatus", () => {
  beforeEach(() => {
    mockCallRpc.mockReset();
  });

  it("needsOnboarding is true when profile has no displayName", async () => {
    mockCallRpc.mockResolvedValue({ displayName: null });

    const { result } = await renderHook(() => useOnboardingStatus());

>>>>>>> origin/feat/nativewind-piloto
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });

<<<<<<< HEAD
  it("needsOnboarding = false when displayName is set", async () => {
    mockCallRpc.mockResolvedValue({ displayName: "Maria" });
    const { result } = await renderHook(() => useOnboardingStatus());
=======
  it("needsOnboarding is false when profile already has displayName", async () => {
    mockCallRpc.mockResolvedValue({ displayName: "Maria Souza" });

    const { result } = await renderHook(() => useOnboardingStatus());

>>>>>>> origin/feat/nativewind-piloto
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(false);
  });

<<<<<<< HEAD
  it("treats an RPC failure as needing onboarding", async () => {
    mockCallRpc.mockRejectedValue(new Error("network"));
    const { result } = await renderHook(() => useOnboardingStatus());
=======
  it("treats a failed profile fetch as needing onboarding", async () => {
    mockCallRpc.mockRejectedValue(new Error("network down"));

    const { result } = await renderHook(() => useOnboardingStatus());

>>>>>>> origin/feat/nativewind-piloto
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });
});
