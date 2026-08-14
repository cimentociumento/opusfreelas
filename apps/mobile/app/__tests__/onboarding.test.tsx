import * as React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();
const mockCallRpc = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));
jest.mock("../../hooks/use-onboarding-status", () => ({
  useOnboardingStatus: () => ({ needsOnboarding: true, isReady: true }),
}));
jest.mock("../../hooks/use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));
<<<<<<< HEAD
=======
// `useToast` normalmente exige um <ToastProvider> (montado em app/_layout.tsx
// em runtime real). Isolamos o componente sob teste sem recriar essa árvore,
// mantendo Button/theme reais via requireActual.
>>>>>>> origin/feat/nativewind-piloto
jest.mock("../../components", () => ({
  ...jest.requireActual("../../components"),
  useToast: () => ({ showToast: jest.fn() }),
}));

import OnboardingScreen from "../onboarding";

describe("OnboardingScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockCallRpc.mockReset();
  });

<<<<<<< HEAD
  it("saves name + municipality and routes home for the contractor path", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "Maria Souza" });

    const { getByPlaceholderText, getByText } = await render(<OnboardingScreen />);
    await fireEvent.changeText(getByPlaceholderText("Seu nome"), "Maria Souza");
    await fireEvent.changeText(getByPlaceholderText("Sua cidade"), "Concórdia");
    await fireEvent.press(getByText("Continuar"));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateProfile", {
        displayName: "Maria Souza",
        municipality: "Concórdia",
      }),
    );

    await fireEvent.press(await waitFor(() => getByText("Quero contratar")));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateRoles", {
        isContractor: true,
        isProvider: false,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("routes to provider setup for the provider path", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "João" });

    const { getByPlaceholderText, getByText } = await render(<OnboardingScreen />);
    await fireEvent.changeText(getByPlaceholderText("Seu nome"), "João Pedro");
    await fireEvent.changeText(getByPlaceholderText("Sua cidade"), "Seara");
    await fireEvent.press(getByText("Continuar"));

    await fireEvent.press(await waitFor(() => getByText("Quero oferecer serviços")));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateRoles", {
        isContractor: true,
        isProvider: true,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/profile/provider-setup");
  });

  it("blocks submit when name or municipality is empty", async () => {
    const { getByText } = await render(<OnboardingScreen />);
    await fireEvent.press(getByText("Continuar"));
=======
  it("saves the name and navigates home when the user skips the provider step", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "Maria Souza" });

    const { getByPlaceholderText, getByText } = await render(<OnboardingScreen />);

    await fireEvent.changeText(getByPlaceholderText("Seu nome"), "Maria Souza");
    await fireEvent.press(getByText("Continuar"));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateProfile", { displayName: "Maria Souza" }),
    );

    await fireEvent.press(await waitFor(() => getByText("Agora não")));

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("navigates to provider setup when the user opts in", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "João Pedro" });

    const { getByPlaceholderText, getByText } = await render(<OnboardingScreen />);

    await fireEvent.changeText(getByPlaceholderText("Seu nome"), "João Pedro");
    await fireEvent.press(getByText("Continuar"));

    await fireEvent.press(await waitFor(() => getByText("Sim, quero oferecer serviços")));

    expect(mockReplace).toHaveBeenCalledWith("/profile/provider-setup");
  });

  it("blocks submit when the name is empty", async () => {
    const { getByText } = await render(<OnboardingScreen />);

    await fireEvent.press(getByText("Continuar"));

>>>>>>> origin/feat/nativewind-piloto
    expect(mockCallRpc).not.toHaveBeenCalled();
  });
});
