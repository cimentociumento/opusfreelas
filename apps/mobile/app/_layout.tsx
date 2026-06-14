import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, Redirect } from "expo-router";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

// Token cache (mantido igual)
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

const FALLBACK_KEY = "pk_test_aHVtYW5lLW1hbmF0ZWUtMzYuY2xlcmsuYWNjb3VudHMuZGV2JA";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || FALLBACK_KEY;

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,   // ← Isso evita redirecionamento precoce para OTP
  });

  // Enquanto carrega o Clerk
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  // Se o usuário já estiver logado, vai direto para o app
  if (isSignedIn) {
    return <Redirect href="/(app)" />;
  }

  // Caso contrário, mostra as rotas de autenticação (sign-in, etc)
  return <Stack screenOptions={{ headerShown: false }} />;
}

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
      <InitialLayout />
    </ClerkProvider>
  );
}