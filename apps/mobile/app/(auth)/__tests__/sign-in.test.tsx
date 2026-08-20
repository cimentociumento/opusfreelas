import * as React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

function makeSignIn() {
  return {
    status: "needs_identifier" as string | null,
    supportedSecondFactors: null as Array<{ strategy: string; phoneNumberId?: string }> | null,
    createdSessionId: null as string | null,
    create: jest.fn(),
    prepareSecondFactor: jest.fn(async () => undefined),
    attemptSecondFactor: jest.fn(),
  };
}

let mockSignIn: ReturnType<typeof makeSignIn>;
const mockSetActive = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useClerk: () => ({ setActive: mockSetActive }),
  useSignIn: () => ({ signIn: mockSignIn, isLoaded: true }),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));

import SignInScreen from "../sign-in";

describe("SignInScreen", () => {
  jest.setTimeout(15000);

  beforeEach(() => {
    mockSignIn = makeSignIn();
    mockSetActive.mockClear();
    mockReplace.mockClear();
  });

  it("signs in with username and password when credentials are valid", async () => {
    mockSignIn.create.mockResolvedValue({
      status: "complete",
      createdSessionId: "sess_123",
    });

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    await fireEvent.changeText(getByPlaceholderText("Digite seu nome de usuário"), "joaopedro");
    await fireEvent.changeText(getByPlaceholderText("Digite sua senha"), "senha123");
    await fireEvent.press(getByText("Entrar"));

    await waitFor(() => expect(mockSignIn.create).toHaveBeenCalledTimes(1));
    expect(mockSignIn.create).toHaveBeenCalledWith({
      identifier: "joaopedro",
      password: "senha123",
    });
    await waitFor(() => expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_123" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows an error when the username is not found", async () => {
    mockSignIn.create.mockImplementation(async () => {
      throw {
        clerkError: true,
        errors: [{ code: "form_identifier_not_found" }],
      };
    });

    const { getByPlaceholderText, getByText, findByText } = await render(<SignInScreen />);

    await fireEvent.changeText(getByPlaceholderText("Digite seu nome de usuário"), "inexistente");
    await fireEvent.changeText(getByPlaceholderText("Digite sua senha"), "senha123");
    await fireEvent.press(getByText("Entrar"));

    expect(await findByText("Usuário não encontrado. Verifique o nome de usuário digitado.")).toBeTruthy();
  });
});
