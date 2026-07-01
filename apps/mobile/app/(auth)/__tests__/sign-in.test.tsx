import * as React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace }),
}));

function makeSignIn() {
  return {
    status: "needs_identifier" as string | null,
    supportedFirstFactors: null as Array<{ strategy: string; phoneNumberId?: string }> | null,
    firstFactorVerification: null,
    createdSessionId: null as string | null,
    create: jest.fn(),
    prepareFirstFactor: jest.fn(async () => undefined),
    attemptFirstFactor: jest.fn(),
  };
}

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

let mockSignIn: ReturnType<typeof makeSignIn>;
let mockSignUp: ReturnType<typeof makeSignUp>;
const mockSetActive = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useClerk: () => ({ setActive: mockSetActive }),
  useSignIn: () => ({ signIn: mockSignIn, isLoaded: true }),
  useSignUp: () => ({ signUp: mockSignUp, isLoaded: true }),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));

import SignInScreen from "../sign-in";

describe("SignInScreen sendCode", () => {
  beforeEach(() => {
    mockSignIn = makeSignIn();
    mockSignUp = makeSignUp();
    mockSetActive.mockClear();
    mockReplace.mockClear();
  });

  it("tries signIn.create() first for a phone that already has an account", async () => {
    mockSignIn.create.mockImplementation(async () => {
      mockSignIn.status = "needs_first_factor";
      mockSignIn.supportedFirstFactors = [{ strategy: "phone_code", phoneNumberId: "phone_1" }];
    });

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    await fireEvent.changeText(getByPlaceholderText("+55 49 99999-9999"), "49999999999");
    await fireEvent.press(getByText("Enviar codigo"));

    await waitFor(() => expect(mockSignIn.create).toHaveBeenCalledTimes(1));

    expect(mockSignIn.create).toHaveBeenCalledWith({ identifier: "+5549999999999" });
    expect(mockSignIn.prepareFirstFactor).toHaveBeenCalledWith({
      strategy: "phone_code",
      phoneNumberId: "phone_1",
    });
    expect(mockSignUp.create).not.toHaveBeenCalled();
    await waitFor(() => expect(getByText(/Codigo enviado/)).toBeTruthy());
  });

  it("falls back to signUp.create() only when signIn reports the identifier is unknown", async () => {
    mockSignIn.create.mockImplementation(async () => {
      const error = {
        clerkError: true,
        errors: [{ code: "form_identifier_not_found" }],
      };
      throw error;
    });

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    await fireEvent.changeText(getByPlaceholderText("+55 49 99999-9999"), "49999999999");
    await fireEvent.press(getByText("Enviar codigo"));

    await waitFor(() => expect(mockSignUp.create).toHaveBeenCalledTimes(1));

    expect(mockSignIn.create).toHaveBeenCalledWith({ identifier: "+5549999999999" });
    expect(mockSignUp.create).toHaveBeenCalledWith({
      phoneNumber: "+5549999999999",
      legalAccepted: true,
    });
    expect(mockSignUp.preparePhoneNumberVerification).toHaveBeenCalledWith({ strategy: "phone_code" });
    await waitFor(() => expect(getByText(/Codigo enviado/)).toBeTruthy());
  });
});
