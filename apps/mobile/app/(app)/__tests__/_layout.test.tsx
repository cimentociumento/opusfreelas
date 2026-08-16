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

describe("AppGroupLayout onboarding guard", () => {
  beforeEach(() => jest.resetModules());

  it("renders the stack when onboarding is complete", async () => {
    jest.doMock("../../../hooks/use-onboarding-status", () => ({
      useOnboardingStatus: () => ({ needsOnboarding: false, isReady: true }),
    }));
    const AppGroupLayout = require("../_layout").default;
    const { getByText } = await render(<AppGroupLayout />);
    expect(getByText("stack")).toBeTruthy();
  });

  it("redirects to /onboarding when the profile needs onboarding", async () => {
    jest.doMock("../../../hooks/use-onboarding-status", () => ({
      useOnboardingStatus: () => ({ needsOnboarding: true, isReady: true }),
    }));
    const AppGroupLayout = require("../_layout").default;
    const { getByText } = await render(<AppGroupLayout />);
    expect(getByText("redirect:/onboarding")).toBeTruthy();
  });
});
