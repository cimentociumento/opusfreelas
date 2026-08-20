import { useState, useEffect } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ProviderProfile } from "@amauc/shared";
import { useRpc } from "../../../hooks/use-rpc";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Text } from "../../../components/ui/text";
import { useToast } from "../../../components/Toast";
import { theme } from "../../../components/theme";

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function ProviderProfileScreen() {
  const { providerId: providerIdParam } = useLocalSearchParams<{
    providerId?: string | string[];
  }>();
  const providerId = paramToString(providerIdParam);
  const router = useRouter();
  const { callRpc } = useRpc();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!providerId) {
      router.back();
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const loadProfile = async () => {
      try {
        const found = await callRpc<ProviderProfile>("discovery.getProviderProfile", {
          clerkUserId: providerId,
        });
        if (cancelled) return;
        setProfile(found);
      } catch (err) {
        if (!cancelled) {
          console.error("[profile.provider] loadProfile falhou", err);
          setLoadError("Não foi possível carregar este perfil.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
    // providerId/reloadKey são os únicos gatilhos intencionais de recarga —
    // ver o mesmo cuidado em demands/[id].tsx sobre por que callRpc/router
    // ficam de fora do array de dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, reloadKey]);

  const handleWhatsApp = () => {
    if (!profile?.phone) return;
    const digits = profile.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá${profile.displayName ? " " + profile.displayName : ""}, encontrei seu perfil no Opus Freelas e tenho interesse nos seus serviços.`
    );
    Linking.openURL(`https://wa.me/55${digits}?text=${message}`).catch(() => {
      showToast("Não foi possível abrir o WhatsApp.", "error");
    });
  };

  const handleCall = () => {
    if (!profile?.phone) return;
    Linking.openURL(`tel:${profile.phone.replace(/\D/g, "")}`).catch(() => {
      showToast("Não foi possível iniciar a ligação.", "error");
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Card className="w-full items-center gap-3 p-6">
          <Text variant="h4">Não foi possível carregar</Text>
          <Text className="text-center text-muted-foreground">{loadError}</Text>
          <Button onPress={() => setReloadKey((key) => key + 1)}>
            <Text>Tentar novamente</Text>
          </Button>
        </Card>
      </View>
    );
  }

  if (!profile) return null;

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: profile.displayName ?? "Perfil do prestador" }} />

      <Card className="m-4 items-center gap-2 p-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-muted" />
        <Text variant="h3" className="text-center">
          {profile.displayName ?? "Profissional"}
        </Text>
        {profile.municipality ? (
          <Text className="text-sm text-muted-foreground">{profile.municipality}</Text>
        ) : null}

        <View className="mt-2 flex-row gap-4">
          <Text className="text-sm text-muted-foreground">
            {profile.ratingAverage.toFixed(1)} ({profile.ratingCount})
          </Text>
          <Text className="text-sm text-muted-foreground">
            {profile.completedServicesCount} serviços
          </Text>
        </View>
        {profile.yearsExperience != null ? (
          <Text className="text-sm text-muted-foreground">
            {profile.yearsExperience} anos de experiência
          </Text>
        ) : null}
      </Card>

      <Card className="mx-4 mb-4 gap-3 p-4">
        <Text variant="h4">Categorias</Text>
        <View className="flex-row flex-wrap gap-2">
          {profile.serviceCategories.map((cat) => (
            <View key={cat} className="rounded-md bg-primary/10 px-2.5 py-1">
              <Text className="text-xs font-bold text-primary">{cat}</Text>
            </View>
          ))}
        </View>
      </Card>

      {profile.bio ? (
        <Card className="mx-4 mb-4 gap-2 p-4">
          <Text variant="h4">Sobre</Text>
          <Text className="text-sm text-muted-foreground">{profile.bio}</Text>
        </Card>
      ) : null}

      {profile.portfolioUrls.length > 0 ? (
        <Card className="mx-4 mb-4 gap-3 p-4">
          <Text variant="h4">Portfólio</Text>
          <View className="flex-row flex-wrap gap-2">
            {profile.portfolioUrls.map((url) => (
              <Image key={url} source={{ uri: url }} className="h-16 w-16 rounded-md bg-muted" />
            ))}
          </View>
        </Card>
      ) : null}

      <Card className="mx-4 mb-8 gap-3 p-4">
        <Text variant="h4">Contato</Text>
        {profile.phone ? (
          <View className="flex-row gap-2">
            <Button className="flex-1" onPress={handleWhatsApp}>
              <Text>Falar no WhatsApp</Text>
            </Button>
            <Button variant="outline" className="flex-1" onPress={handleCall}>
              <Text>Ligar</Text>
            </Button>
          </View>
        ) : (
          <Text className="text-sm text-muted-foreground">
            Este profissional ainda não cadastrou um telefone de contato.
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}
