import { useEffect, useState } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { useLocation } from "../../../hooks/use-location";
import { DemandResponse } from "@amauc/shared";
import { Card, theme } from "../../../components";

export default function AvailableDemandsScreen() {
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  const { location, loading: locationLoading } = useLocation();

  const [demands, setDemands] = useState<DemandResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDemands = async () => {
    if (!location) return;

    try {
      setLoading(true);
      const data = await callRpc<DemandResponse[]>("demands.listVisible", {
        latitude: location.latitude,
        longitude: location.longitude,
        municipality: location.municipality !== "Concórdia" ? location.municipality : undefined,
      });
      setDemands(data || []);
    } catch (error) {
      console.error("Failed to fetch available demands:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!locationLoading) {
      void fetchDemands();
    }
  }, [locationLoading, location]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDemands();
  };

  const renderItem = ({ item }: { item: DemandResponse }) => (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.serviceType}>{item.serviceType}</Text>
        <Text style={styles.municipality}>📍 {item.municipality}</Text>
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.tagsRow}>
          <View style={[styles.urgencyTag, (styles as any)[`urgency_${item.urgency}`]]}>
            <Text style={styles.urgencyText}>{item.urgency.toUpperCase()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            // TODO: Navigate to detail view if needed
            // router.push(`/demands/${item.id}`);
            alert(`Demand ID: ${item.id}`);
          }}
        >
          <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Vagas na Região",
          headerBackTitle: "Voltar",
        }}
      />

      <View style={styles.locationHeader}>
        <Text style={styles.locationLabel}>Buscando em:</Text>
        {locationLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.locationValue}>
            {location.municipality} e raio próximo
          </Text>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Buscando oportunidades...</Text>
        </View>
      ) : (
        <FlatList
          data={demands}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhuma vaga encontrada na sua região no momento.
              </Text>
              <Text style={styles.emptySubText}>
                Volte mais tarde ou tente mudar a localização.
              </Text>
            </View>
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
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  locationLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  locationValue: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  serviceType: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  municipality: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  description: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  urgencyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  urgency_baixa: { backgroundColor: theme.colors.success + "20" },
  urgency_media: { backgroundColor: theme.colors.warning + "20" },
  urgency_alta: { backgroundColor: theme.colors.error + "20" },
  urgency_urgente_hoje: { backgroundColor: theme.colors.error + "40" },
  urgencyText: {
    ...theme.typography.caption,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  detailsButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
  },
  detailsButtonText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...theme.typography.body1,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  emptySubText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
