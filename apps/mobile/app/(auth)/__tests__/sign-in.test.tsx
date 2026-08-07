import * as React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

function makeSignIn() {
  return {
    status: "needs_identifier" as string | null,
    createdSessionId: null as string | null,
    create: jest.fn(),
  };
}

let mockSignIn: ReturnType<typeof makeSignIn>;
const mockSetActive = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useClerk: () => ({ setActive: mockSetActive }),
  useSignIn: () => ({ signIn: mockSignIn, isLoaded: true }),
  useSignUp: () => ({ signUp: null, isLoaded: true }),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));

import SignInScreen from "../sign-in";

describe("SignInScreen", () => {
  beforeEach(() => {
    mockSignIn = makeSignIn();
    mockSetActive.mockClear();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it("calls signIn.create with username and password and activates session on complete", async () => {
    mockSignIn.create.mockImplementation(async () => {
      mockSignIn.status = "complete";
      mockSignIn.createdSessionId = "sess_123";
      return { status: "complete", createdSessionId: "sess_123" };
    });

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    await fireEvent.changeText(getByPlaceholderText("seu_usuario"), "joaosilva");
    await fireEvent.changeText(getByPlaceholderText("Sua senha"), "senha123");
    await fireEvent.press(getByText("Entrar"));

    await waitFor(() => {
      expect(mockSignIn.create).toHaveBeenCalledWith({
        identifier: "joaosilva",
        password: "senha123",
      });
    });

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_123" });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("shows error message when login credentials fail", async () => {
    mockSignIn.create.mockRejectedValue({
      clerkError: true,
      errors: [{ code: "form_identifier_not_found", message: "User not found" }],
    });

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    await fireEvent.changeText(getByPlaceholderText("seu_usuario"), "usuario_inexistente");
    await fireEvent.changeText(getByPlaceholderText("Sua senha"), "senha123");
    await fireEvent.press(getByText("Entrar"));

    await waitFor(() => {
      expect(getByText(/Usuário não encontrado/)).toBeTruthy();
    });
  });
});
