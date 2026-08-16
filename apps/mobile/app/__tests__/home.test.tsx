import * as React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false, signOut: jest.fn() }),
  useUser: () => ({ user: null }),
}));

import HomeScreen from "../index";

describe("HomeScreen", () => {
  it("renders HomeScreen without errors in signed out state", async () => {
    const { getByText } = await render(<HomeScreen />);
    expect(getByText("Opus Freelas")).toBeTruthy();
    expect(getByText("Entrar")).toBeTruthy();
    expect(getByText("Cadastrar-se")).toBeTruthy();
  });
});

