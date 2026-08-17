import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { useLocation } from "../../../hooks/use-location";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { DemandResponse } from "@amauc/shared";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Text } from "../../../components/ui/text";
import { theme } from "../../../components/theme";

const URGENCY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente_hoje: "Urgente",
};

const URGENCY_BADGE_CLASS: Record<string, string> = {
  baixa: "bg-muted",
  media: "bg-secondary",
  alta: "bg-destructive/10",
  urgente_hoje: "bg-destructive/20",
};

const URGENCY_TEXT_CLASS: Record<string, string> = {
  baixa: "text-muted-foreground",
  media: "text-secondary-foreground",
  alta: "text-destructive",
  urgente_hoje: "text-destructive",
};

export default function AvailableDemandsScreen() {
  const router = useRouter();
  const { callRpc } = useRpc();
  const { location, loading: locationLoading } = useLocation();
  const { isReady: isAuthReady } = useEffectiveUserId();

  const [demands, setDemands] = useState<DemandResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDemands = async () => {
    if (!location) return;

    try {
      setError(null);
      setLoading(true);
      const data = await callRpc<DemandResponse[]>("demands.listVisible", {
        latitude: location.latitude,
        longitude: location.longitude,
        municipality: location.municipality !== "Concórdia" ? location.municipality : undefined,
      });
      setDemands(data || []);
    } catch (err) {
      console.error("[demands.available] fetchDemands falhou", err);
      setError("Não foi possível buscar as vagas da sua região.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Espera localização E modo dev/Clerk resolverem antes do primeiro RPC.
    if (!locationLoading && isAuthReady) {
      void fetchDemands();
    }
  }, [locationLoading, location, isAuthReady]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDemands();
  };

  const renderItem = ({ item }: { item: DemandResponse }) => (
    <Card className="mb-4 gap-3 p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-lg font-semibold">{item.serviceType}</Text>
        <View className="rounded-full bg-muted px-2 py-1">
          <Text className="text-xs text-muted-foreground">📍 {item.municipality}</Text>
        </View>
      </View>

      <Text numberOfLines={3} className="text-sm text-muted-foreground">
        {item.description}
      </Text>

      <View className="flex-row items-center justify-between">
        <View
          className={`rounded-md px-2 py-1 ${URGENCY_BADGE_CLASS[item.urgency] ?? "bg-muted"}`}
        >
          <Text
            className={`text-xs font-bold ${URGENCY_TEXT_CLASS[item.urgency] ?? "text-muted-foreground"}`}
          >
            {URGENCY_LABEL[item.urgency] ?? item.urgency}
          </Text>
        </View>

        <Button
          size="sm"
          onPress={() => router.push({ pathname: "/demands/[id]", params: { id: item.id } })}
        >
          <Text>Ver detalhes</Text>
        </Button>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: "Vagas na Região",
          headerBackTitle: "Voltar",
        }}
      />

      <View className="flex-row items-center border-b border-border bg-card p-4">
        <Text className="mr-2 text-sm text-muted-foreground">Buscando em:</Text>
        {locationLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text className="text-sm font-bold text-primary">
            {location.municipality} e raio próximo
          </Text>
        )}
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="text-muted-foreground">Buscando oportunidades...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <Card className="w-full items-center gap-3 p-6">
            <Text variant="h4">Não foi possível carregar</Text>
            <Text className="text-center text-muted-foreground">{error}</Text>
            <Button onPress={fetchDemands}>
              <Text>Tentar novamente</Text>
            </Button>
          </Card>
        </View>
      ) : (
        <FlatList
          data={demands}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.md }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <Card className="items-center gap-2 p-8">
              <Text className="text-center">Nenhuma vaga encontrada na sua região no momento.</Text>
              <Text className="text-center text-muted-foreground">
                Volte mais tarde ou tente mudar a localização.
              </Text>
            </Card>
          }
        />
      )}
    </View>
  );
}
