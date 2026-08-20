import * as React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require("react-native");
    return <Text>redirect:{href}</Text>;
  },
  Stack: () => {
    const { Text } = require("react-native");
    return <Text>stack</Text>;
  },
}));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

describe("AppGroupLayout auth guard", () => {
  beforeEach(() => jest.resetModules());

  it("renders the stack when signed in", async () => {
    jest.doMock("@clerk/clerk-expo", () => ({
      useAuth: () => ({ isLoaded: true, isSignedIn: true }),
    }));
    const AppGroupLayout = require("../_layout").default;
    const { getByText } = await render(<AppGroupLayout />);
    expect(getByText("stack")).toBeTruthy();
  });

  it("redirects to /sign-in when signed out", async () => {
    jest.doMock("@clerk/clerk-expo", () => ({
      useAuth: () => ({ isLoaded: true, isSignedIn: false }),
    }));
    const AppGroupLayout = require("../_layout").default;
    const { getByText } = await render(<AppGroupLayout />);
    expect(getByText("redirect:/sign-in")).toBeTruthy();
  });
});
