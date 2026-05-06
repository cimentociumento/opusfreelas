import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { ProviderResult } from "@amauc/shared";

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function DiscoveryResultsScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const category = paramToString(params.category);
  const router = useRouter();
  const { callRpc } = useRpc();
  
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      // Mock location for AMAUC (Concórdia area) if geolocation is not yet implemented
      const latitude = -27.23;
      const longitude = -52.03;
      
      const data = await callRpc<ProviderResult[]>("discovery.searchProviders", {
        latitude,
        longitude,
        category: category?.trim() || undefined,
        radius: 50
      });
      setResults(data);
    } catch (error) {
      console.error("Error searching providers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, callRpc]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const renderItem = ({ item }: { item: ProviderResult }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.clerkUserId.substring(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.providerName}>Profissional</Text>
          <Text style={styles.distance}>
            A { (item.distanceMeters / 1000).toFixed(1) } km de você
          </Text>
        </View>
      </View>
      
      <View style={styles.categories}>
        {item.serviceCategories.map((cat) => (
          <View key={cat} style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{cat}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.profileBtn}
        onPress={() =>
          router.push({
            pathname: "/profile/provider-setup",
            params: { previewUserId: item.clerkUserId },
          })
        }
      >
        <Text style={styles.profileBtnText}>Ver Perfil Completo</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: category ? `${category}` : "Profissionais" }} />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#116530" />
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
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nenhum profissional encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Tente aumentar o raio de busca ou selecionar outra categoria.
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
    backgroundColor: "#f5f5f5",
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#116530",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  cardInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  distance: {
    fontSize: 14,
    color: "#666",
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryBadge: {
    backgroundColor: "#e8f5e9",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: "#116530",
    fontWeight: "600",
  },
  profileBtn: {
    backgroundColor: "#116530",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  profileBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
