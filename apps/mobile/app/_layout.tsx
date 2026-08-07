import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, Redirect } from "expo-router";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { ToastProvider } from "../components/Toast";

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
  const { isLoaded } = useAuth();

  // Enquanto carrega o Clerk
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  // A tela inicial (app/index.tsx) decide o que mostrar com base no estado de autenticação
  // (rotas protegidas no grupo (app) também possuem verificação no seu próprio _layout.tsx)
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
    <ToastProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <InitialLayout />
      </ClerkProvider>
    </ToastProvider>
  );
}