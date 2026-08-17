import { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, FlatList, Linking, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { useLocation } from "../../../hooks/use-location";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { ProviderResult } from "@amauc/shared";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useToast } from "../../../components/Toast";
import { theme } from "../../../components/theme";

const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function DiscoveryResultsScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const category = paramToString(params.category);
  const router = useRouter();
  const { callRpc } = useRpc();
  const { isReady: isAuthReady } = useEffectiveUserId();
  const { showToast } = useToast();

  const [results, setResults] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [municipalityInput, setMunicipalityInput] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  const { location, loading: locationLoading } = useLocation();

  const fetchResults = useCallback(async () => {
    if (!location) return;

    try {
      setError(null);
      setLoading(true);
      const data = await callRpc<ProviderResult[]>("discovery.searchProviders", {
        latitude: location.latitude,
        longitude: location.longitude,
        category: category ? category : undefined,
        municipality: municipalityFilter ? municipalityFilter : undefined,
        radius: radiusKm,
      });

      setResults(data || []);
    } catch (err) {
      console.error("[discovery.results] fetchResults falhou", err);
      setError("Não foi possível buscar profissionais.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // callRpc de propósito fora do array: sua identidade não é garantidamente
    // estável entre renders, e reincluí-la aqui — combinado com o
    // setLoading(true) acima — gera um loop de re-render (mesma causa raiz
    // corrigida em demands/[id].tsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, location, municipalityFilter, radiusKm]);

  const applyMunicipalityFilter = () => setMunicipalityFilter(municipalityInput.trim());

  const expandRadius = () => {
    const next = RADIUS_OPTIONS.find((option) => option > radiusKm);
    if (next) setRadiusKm(next);
  };

  // Load results whenever location ou categoria mudam — espera também o
  // modo dev/Clerk resolverem antes do primeiro RPC.
  useEffect(() => {
    if (!locationLoading && isAuthReady) {
      void fetchResults();
    }
  }, [fetchResults, locationLoading, isAuthReady]);

  const handleContact = (item: ProviderResult) => {
    if (!item.phone) {
      showToast("Este profissional ainda não cadastrou telefone de contato.", "info");
      return;
    }
    const digits = item.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá${item.displayName ? " " + item.displayName : ""}, encontrei seu perfil no Opus Freelas e tenho interesse nos seus serviços.`
    );
    Linking.openURL(`https://wa.me/55${digits}?text=${message}`).catch(() => {
      showToast("Não foi possível abrir o WhatsApp.", "error");
    });
  };

  const renderItem = ({ item }: { item: ProviderResult }) => (
    <Card className="mb-4 gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Text className="text-2xl">👤</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-lg font-semibold">{item.displayName || "Profissional"}</Text>
          <Text className="text-sm font-bold text-primary">
            📍 A {(item.distanceMeters / 1000).toFixed(1)} km de você
          </Text>
          <Text className="text-xs text-muted-foreground">
            ⭐ {item.ratingAverage.toFixed(1)} ({item.ratingCount} avaliações) · 🔨{" "}
            {item.completedServicesCount} serviços
          </Text>
          {item.yearsExperience != null && (
            <Text className="text-xs text-muted-foreground">
              ⏱️ {item.yearsExperience} anos de experiência
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {item.serviceCategories.map((cat) => (
          <View key={cat} className="rounded-md bg-primary/10 px-2 py-1">
            <Text className="text-xs font-bold text-primary">{cat}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Button
          size="sm"
          className="flex-1"
          onPress={() =>
            router.push({
              pathname: "/profile/[providerId]",
              params: { providerId: item.clerkUserId },
            })
          }
        >
          <Text>Ver perfil</Text>
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onPress={() => handleContact(item)}>
          <Text>Contatar</Text>
        </Button>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: category ? `${category}` : "Profissionais" }} />

      <View className="gap-3 border-b border-border bg-card p-4">
        <View className="flex-row gap-2">
          <Input
            className="flex-1"
            value={municipalityInput}
            onChangeText={setMunicipalityInput}
            placeholder="Filtrar por município (opcional)"
            autoCapitalize="words"
            onSubmitEditing={applyMunicipalityFilter}
          />
          <Button size="sm" variant="outline" onPress={applyMunicipalityFilter}>
            <Text>Aplicar</Text>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {RADIUS_OPTIONS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={radiusKm === option ? "default" : "outline"}
              onPress={() => setRadiusKm(option)}
            >
              <Text>{option}km</Text>
            </Button>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="text-muted-foreground">Buscando profissionais...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <Card className="w-full items-center gap-3 p-6">
            <Text variant="h4">Não foi possível carregar</Text>
            <Text className="text-center text-muted-foreground">{error}</Text>
            <Button onPress={fetchResults}>
              <Text>Tentar novamente</Text>
            </Button>
          </Card>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.clerkUserId}
          contentContainerStyle={{ padding: theme.spacing.md }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchResults();
          }}
          ListEmptyComponent={
            <Card className="items-center gap-3 p-8">
              <Text variant="h4">Nenhum profissional encontrado</Text>
              <Text className="text-center text-muted-foreground">
                {municipalityFilter
                  ? `Ninguém em ${municipalityFilter} dentro de ${radiusKm}km. Tente aumentar o raio ou remover o filtro de município.`
                  : `Ninguém dentro de ${radiusKm}km no momento. Tente aumentar o raio de busca.`}
              </Text>
              <View className="flex-row gap-2">
                {radiusKm < RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1] ? (
                  <Button onPress={expandRadius}>
                    <Text>Aumentar raio</Text>
                  </Button>
                ) : null}
                <Button variant="outline" onPress={() => router.back()}>
                  <Text>Voltar</Text>
                </Button>
              </View>
            </Card>
          }
        />
      )}
    </View>
  );
}
