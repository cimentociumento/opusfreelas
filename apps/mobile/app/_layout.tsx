import { ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Token cache usando AsyncStorage — compatível com Expo Go (sem build nativo).
// Em produção com EAS Build, substitua por:
//   import { tokenCache } from "@clerk/clerk-expo/token-cache";
const tokenCache = {
  async getToken(key: string) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  async clearToken(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const FALLBACK_KEY =
  "pk_test_aHVtYW5lLW1hbmF0ZWUtMzYuY2xlcmsuYWNjb3VudHMuZGV2JA";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || FALLBACK_KEY;

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
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
