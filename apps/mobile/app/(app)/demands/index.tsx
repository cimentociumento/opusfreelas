import { useEffect, useState, useCallback } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { isDemandOwner } from "../../../lib/auth-constants";
import { DemandResponse } from "@amauc/shared";
import { Card, Button, theme } from "../../../components";

export default function MyDemandsScreen() {
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  const { userId: currentUserId, isReady: isAuthReady } = useEffectiveUserId();
  
  const [demands, setDemands] = useState<DemandResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDemands = useCallback(async () => {
    try {
      const data = await callRpc<DemandResponse[]>("demands.listMyDemands");
      setDemands(data);
    } catch (error) {
      console.error("Error fetching demands:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [callRpc]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDemands();
  };

  const confirmDelete = (demandId: string) => {
    Alert.alert(
      "Excluir Demanda",
      "Esta ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await callRpc("demands.delete", { id: demandId });
              setDemands((prev) => prev.filter((d) => d.id !== demandId));
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Erro ao excluir demanda.";
              Alert.alert("Erro", message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: DemandResponse }) => {
    const isOwner = isAuthReady && isDemandOwner(item.contractorId, currentUserId);

    return (
    <Card variant="elevated" style={styles.demandCard}>
      <View style={styles.demandHeader}>
        <Text style={styles.serviceType}>{item.serviceType}</Text>
        <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
          <Text style={styles.statusText}>{getStatusDisplay(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.demandFooter}>
        <Text style={styles.footerText}>📍 {item.municipality}</Text>
        <Text style={styles.footerText}>⚡ {getUrgencyDisplay(item.urgency)}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Ver Detalhes"
          variant="primary"
          size="sm"
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: "/demands/[id]", params: { id: item.id } })}
        />
        {isOwner && item.status !== "encerrada" && (
          <Button
            title="Editar"
            variant="outline"
            size="sm"
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: "/demands/[id]", params: { id: item.id } })}
          />
        )}
        {isOwner && item.status === "encerrada" && (
          <Button
            title="Excluir"
            variant="outline"
            size="sm"
            style={styles.actionBtn}
            onPress={() => confirmDelete(item.id)}
            textStyle={styles.deleteText}
          />
        )}
      </View>
    </Card>
    );
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "aberta": "🟢 Aberta",
      "em_contato": "🟡 Em Contato", 
      "encerrada": "🔴 Encerrada"
    };
    return statusMap[status] || status;
  };

  const getUrgencyDisplay = (urgency: string) => {
    const urgencyMap: { [key: string]: string } = {
      "baixa": "Baixa",
      "media": "Média",
      "alta": "Alta", 
      "urgente_hoje": "Urgente"
    };
    return urgencyMap[urgency] || urgency;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: "Minhas Demandas",
        headerRight: () => (
          <Button
            title="+"
            variant="primary"
            size="sm"
            onPress={() => router.push("/demands/create")}
          />
        )
      }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando demandas...</Text>
        </View>
      ) : (
        <FlatList
          data={demands}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyState}>
              <Text style={styles.emptyTitle}>📝 Nenhuma demanda publicada</Text>
              <Text style={styles.emptySubtitle}>
                Comece publicando sua primeira demanda para encontrar profissionais
              </Text>
              <Button
                title="🚀 Publicar Primeira Demanda"
                variant="primary"
                size="lg"
                onPress={() => router.push("/demands/create")}
              />
            </Card>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  demandCard: {
    marginBottom: theme.spacing.md,
  },
  demandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  serviceType: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  status_aberta: { backgroundColor: theme.colors.primaryLight },
  status_em_contato: { backgroundColor: theme.colors.secondaryLight },
  status_encerrada: { backgroundColor: theme.colors.border },
  statusText: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.text,
  },
  description: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  demandFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  deleteText: {
    color: theme.colors.error,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
});
