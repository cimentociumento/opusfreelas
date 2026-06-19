import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { useLocation } from "../../../hooks/use-location";
import { ProviderResult } from "@amauc/shared";
import { Card, Button, theme } from "../../../components";

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function DiscoveryResultsScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const category = paramToString(params.category);
  const router = useRouter();
  const { callRpc, isDevMode } = useRpcWithDevMode();
  
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { location, loading: locationLoading } = useLocation();

  const fetchResults = useCallback(async () => {
    if (!location) return;

    try {
      setLoading(true);
      const data = await callRpc<ProviderResult[]>("discovery.searchProviders", {
        latitude: location.latitude,
        longitude: location.longitude,
        category: category !== "Todas" ? category : undefined,
        radius: 50,
      });

      setResults(data || []);
    } catch (error) {
      console.error("Failed to search providers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, callRpc, location]);

  // Load results whenever location or category changes
  useEffect(() => {
    if (!locationLoading) {
      void fetchResults();
    }
  }, [fetchResults, locationLoading]);

  const renderItem = ({ item }: { item: ProviderResult }) => (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.providerName}>Profissional Local</Text>
          <Text style={styles.distance}>
            📍 A { (item.distanceMeters / 1000).toFixed(1) } km de você
          </Text>
          <Text style={styles.availability}>Disponível para trabalhos</Text>
        </View>
      </View>
      
      <View style={styles.categories}>
        {item.serviceCategories.map((cat) => (
          <View key={cat} style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{cat}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button 
          title="Ver Perfil" 
          variant="primary" 
          size="sm"
          style={styles.actionBtn}
          onPress={() =>
            router.push({
              pathname: "/profile/provider-setup",
              params: { previewUserId: item.clerkUserId },
            })
          }
        />
        <Button 
          title="Contatar" 
          variant="secondary" 
          size="sm"
          style={styles.actionBtn}
          onPress={() => {}}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: category ? `${category}` : "Profissionais"
        }} 
      />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Buscando profissionais...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.clerkUserId}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchResults();
          }}
          ListEmptyComponent={
            <Card style={styles.empty}>
              <Text style={styles.emptyTitle}>😔 Nenhum profissional encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Tente aumentar o raio de busca ou selecionar outra categoria.
              </Text>
              <Button 
                title="Voltar" 
                variant="outline" 
                size="md"
                onPress={() => router.back()}
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
    marginTop: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  providerName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  distance: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  availability: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  categoryBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  categoryText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  empty: {
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
