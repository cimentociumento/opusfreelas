import { useState, useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { isDemandOwner } from "../../../lib/auth-constants";
import { DemandResponse } from "@amauc/shared";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Text } from "../../../components/ui/text";
import { useToast } from "../../../components/Toast";
import { theme } from "../../../components/theme";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_contato: "Em contato",
  concluida: "Concluída",
  cancelada: "Cancelada",
  encerrada: "Encerrada",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  aberta: "bg-primary/10",
  em_contato: "bg-secondary",
  concluida: "bg-primary/10",
  cancelada: "bg-destructive/10",
  encerrada: "bg-muted",
};

const STATUS_TEXT_CLASS: Record<string, string> = {
  aberta: "text-primary",
  em_contato: "text-secondary-foreground",
  concluida: "text-primary",
  cancelada: "text-destructive",
  encerrada: "text-muted-foreground",
};

const URGENCY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente_hoje: "Urgente",
};

export default function MyDemandsScreen() {
  const router = useRouter();
  const { callRpc } = useRpc();
  const { userId: currentUserId, isReady: isAuthReady } = useEffectiveUserId();
  const { showToast } = useToast();

  const [demands, setDemands] = useState<DemandResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDemands = useCallback(async () => {
    try {
      setError(null);
      const data = await callRpc<DemandResponse[]>("demands.listMyDemands");
      setDemands(data);
    } catch (err) {
      console.error("[demands.index] fetchDemands falhou", err);
      setError("Não foi possível carregar suas demandas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // callRpc de propósito fora do array — ver a mesma nota em
    // discovery/results.tsx e demands/[id].tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useFocusEffect (não useEffect) para recarregar toda vez que a tela
  // ganha foco — inclusive ao voltar de "Detalhes da Demanda" depois de
  // concluir/cancelar (excluir) uma demanda, senão a lista ficaria com o
  // item já excluído até um pull-to-refresh manual.
  useFocusEffect(
    useCallback(() => {
      // Espera o Clerk resolver a sessão antes da primeira chamada — senão
      // o RPC pode sair cedo demais sem um token válido.
      if (!isAuthReady) return;
      fetchDemands();
    }, [fetchDemands, isAuthReady])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDemands();
  };

  const renderItem = ({ item }: { item: DemandResponse }) => {
    const isOwner = isAuthReady && isDemandOwner(item.contractorId, currentUserId);

    return (
      <Card className="mb-4 gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-lg font-semibold text-primary">{item.serviceType}</Text>
          <View
            className={`rounded-md px-2 py-1 ${STATUS_BADGE_CLASS[item.status] ?? "bg-muted"}`}
          >
            <Text
              className={`text-xs font-bold ${STATUS_TEXT_CLASS[item.status] ?? "text-muted-foreground"}`}
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        <Text numberOfLines={2} className="text-sm text-muted-foreground">
          {item.description}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground">📍 {item.municipality}</Text>
          <Text className="text-xs text-muted-foreground">
            ⚡ {URGENCY_LABEL[item.urgency] ?? item.urgency}
          </Text>
        </View>

        <Button
          size="sm"
          onPress={() => router.push({ pathname: "/demands/[id]", params: { id: item.id } })}
        >
          <Text>Ver detalhes</Text>
        </Button>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: "Minhas Demandas",
          headerRight: () => (
            <Button size="sm" onPress={() => router.push("/demands/create")}>
              <Text>+</Text>
            </Button>
          ),
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="text-muted-foreground">Carregando demandas...</Text>
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
          contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <Card className="items-center gap-4 p-8">
              <Text variant="h4">📝 Nenhuma demanda publicada</Text>
              <Text className="text-center text-muted-foreground">
                Comece publicando sua primeira demanda para encontrar profissionais
              </Text>
              <Button size="lg" onPress={() => router.push("/demands/create")}>
                <Text>🚀 Publicar Primeira Demanda</Text>
              </Button>
            </Card>
          }
        />
      )}
    </View>
  );
}
