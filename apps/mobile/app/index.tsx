import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter, useNavigation } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Text } from "../components/ui/text";
import { theme } from "../components/theme";

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="items-center bg-primary px-6 py-10">
        <Text variant="h1" className="text-center text-primary-foreground">
          Opus Freelas
        </Text>
        <Text className="mt-2 text-center text-primary-foreground/90">
          Conectando profissionais locais à quem precisa
        </Text>
      </View>

      {!isAuthLoaded ? (
        <View className="items-center p-4">
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : isSignedIn ? (
        <SignedInContent />
      ) : (
        <View className="mt-8 px-6">
          <Card className="items-center gap-4 p-6">
            <Text variant="h3" className="text-center">
              Bem-vindo ao Opus Freelas
            </Text>
            <Text className="text-center text-muted-foreground">
              Encontre os melhores profissionais para serviços manuais e rurais na região
            </Text>
            <Button size="lg" className="w-full" onPress={() => router.push("/sign-in")}>
              <Text>Entrar</Text>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onPress={() => router.push("/sign-up")}
            >
              <Text>Cadastrar-se</Text>
            </Button>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

function SignedInContent() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  return (
    <View className="gap-6 p-6">
      <Card className="items-center gap-2 p-6">
        <Text variant="h3" className="text-primary">
          Olá, {user?.firstName || user?.username || "usuário"}! 👋
        </Text>
        <Text className="text-muted-foreground">Encontre profissionais para seus serviços</Text>
      </Card>

      <View className="gap-3">
        <Text className="ml-1 text-lg font-semibold">🏠 Sou Contratante</Text>
        <Card className="gap-3 p-6">
          <Button size="lg" onPress={() => router.push("/discovery")}>
            <Text>🔍 Encontrar Profissionais</Text>
          </Button>
          <Button variant="secondary" onPress={() => router.push("/demands/create")}>
            <Text>📝 Publicar Demanda</Text>
          </Button>
          <Button variant="outline" onPress={() => router.push("/demands")}>
            <Text>📋 Minhas Demandas</Text>
          </Button>
        </Card>
      </View>

      <View className="gap-3">
        <Text className="ml-1 text-lg font-semibold">👨‍🔧 Sou Prestador</Text>
        <Card className="gap-3 p-6">
          <Button size="lg" onPress={() => router.push("/profile/provider-setup")}>
            <Text>⚙️ Configurar Meu Perfil</Text>
          </Button>
          <Button variant="secondary" size="lg" onPress={() => router.push("/demands/available")}>
            <Text>📋 Vagas na Região</Text>
          </Button>
        </Card>
      </View>

      <View className="items-center pt-4">
        <Button variant="ghost" size="sm" onPress={() => signOut()}>
          <Text>Sair</Text>
        </Button>
      </View>
    </View>
  );
}
