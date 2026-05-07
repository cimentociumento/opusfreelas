import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack } from "expo-router";
import { Text, View } from "react-native";

// Fallback key for development when .env is not configured
const FALLBACK_KEY = "pk_test_aHVtYW5lLW1hbmF0ZWUtMzYuY2xlcmsuYWNjb3VudHMuZGV2JA";
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || FALLBACK_KEY;

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text>Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkProvider>
  );
}
