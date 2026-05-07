import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useDevelopmentMode } from "../../hooks/use-development-mode";

/**
 * Rotas autenticadas: demandas, descoberta, perfil.
 * Evita o padrão SignedIn/SignedOut com dois Stacks no root (quebrava rotas no Expo Router).
 */
export default function AppGroupLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isDevMode, isLoading: devModeLoading } = useDevelopmentMode();

  console.log(`🛠️ AppGroupLayout: isDevMode = ${isDevMode}, isSignedIn = ${isSignedIn}, devModeLoading = ${devModeLoading}`);

  // Enquanto carrega qualquer estado, mostra loading
  if (!isLoaded || devModeLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  // No modo DEV, permite acesso mesmo sem login
  if (isDevMode) {
    console.log('🛠️ DEV MODE: Permitindo acesso sem autenticação');
    return <Stack screenOptions={{ headerShown: true }} />;
  }

  // No modo PROD, exige login
  if (!isSignedIn) {
    console.log('📱 PROD MODE: Redirecionando para login');
    return <Redirect href="/sign-in" />;
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
