import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useDevelopmentMode } from "../../hooks/use-development-mode";
import { useOnboardingStatus } from "../../hooks/use-onboarding-status";

export default function AppGroupLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isDevMode, isLoading: devModeLoading } = useDevelopmentMode();
  const { needsOnboarding, isReady: onboardingReady } = useOnboardingStatus();

  if (!isLoaded || devModeLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  if (isDevMode) {
    return <Stack screenOptions={{ headerShown: true }} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (!onboardingReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Stack screenOptions={{ headerShown: true }} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
