import * as React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

function makeSignUp() {
  return {
    status: null as string | null,
    createdSessionId: null as string | null,
    missingFields: [] as string[],
    create: jest.fn(async () => undefined),
    preparePhoneNumberVerification: jest.fn(async () => undefined),
    attemptPhoneNumberVerification: jest.fn(),
    update: jest.fn(),
  };
}

let mockSignUp: ReturnType<typeof makeSignUp>;
const mockSetActive = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useClerk: () => ({ setActive: mockSetActive }),
  useSignIn: () => ({ signIn: null, isLoaded: true }),
  useSignUp: () => ({ signUp: mockSignUp, isLoaded: true }),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));

import SignUpScreen from "../sign-up";

describe("SignUpScreen", () => {
  beforeEach(() => {
    mockSignUp = makeSignUp();
    mockSetActive.mockClear();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it("submits registration with phone, username and password, then verifies OTP", async () => {
    const { getByPlaceholderText, getByText } = await render(<SignUpScreen />);

    await fireEvent.changeText(getByPlaceholderText("+55 49 99999-9999"), "49999999999");
    await fireEvent.changeText(getByPlaceholderText("seu_usuario"), "novousuario");
    await fireEvent.changeText(getByPlaceholderText("Sua senha"), "senhaSegura123");

    await fireEvent.press(getByText("Cadastrar e Enviar Código"));

    await waitFor(() => {
      expect(mockSignUp.create).toHaveBeenCalledWith({
        phoneNumber: "+5549999999999",
        username: "novousuario",
        password: "senhaSegura123",
        legalAccepted: true,
      });
      expect(mockSignUp.preparePhoneNumberVerification).toHaveBeenCalledWith({ strategy: "phone_code" });
    });

    await waitFor(() => expect(getByText(/Código de verificação SMS enviado/)).toBeTruthy());

    mockSignUp.attemptPhoneNumberVerification.mockImplementation(async () => {
      mockSignUp.status = "complete";
      mockSignUp.createdSessionId = "sess_456";
      return { status: "complete", createdSessionId: "sess_456" };
    });

    await fireEvent.changeText(getByPlaceholderText("Digite o código"), "123456");
    await fireEvent.press(getByText("Confirmar Código e Concluir"));

    await waitFor(() => {
      expect(mockSignUp.attemptPhoneNumberVerification).toHaveBeenCalledWith({ code: "123456" });
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_456" });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });
});
