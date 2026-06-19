import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useDevelopmentMode } from "../hooks/use-development-mode";
import { theme } from "./theme";

interface DevAuthWrapperProps {
  signedInComponent: React.ReactNode;
  signedOutComponent: React.ReactNode;
}

export function DevAuthWrapper({ signedInComponent, signedOutComponent }: DevAuthWrapperProps) {
  const { isDevMode, isLoading } = useDevelopmentMode();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (isDevMode) {
    return <>{signedInComponent}</>;
  }

  return (
    <>
      <SignedIn>{signedInComponent}</SignedIn>
      <SignedOut>{signedOutComponent}</SignedOut>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: theme.spacing.md,
    alignItems: "center",
  },
});
