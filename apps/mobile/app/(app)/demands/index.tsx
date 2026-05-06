import { useEffect, useState, useCallback } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { Stack, Link, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { DemandResponse } from "@amauc/shared";

export default function MyDemandsScreen() {
  const router = useRouter();
  const { callRpc } = useRpc();
  
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

  const renderItem = ({ item }: { item: DemandResponse }) => (
    <TouchableOpacity 
      style={styles.demandCard}
      onPress={() => router.push({ pathname: "/demands/[id]", params: { id: item.id } })}
    >
      <View style={styles.demandHeader}>
        <Text style={styles.serviceType}>{item.serviceType}</Text>
        <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.demandFooter}>
        <Text style={styles.footerText}>{item.municipality}</Text>
        <Text style={styles.footerText}>•</Text>
        <Text style={styles.footerText}>{item.urgency}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: "Minhas Demandas",
        headerRight: () => (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/demands/create")}
            accessibilityRole="button"
            accessibilityLabel="Nova demanda"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )
      }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#116530" />
        </View>
      ) : (
        <FlatList
          data={demands}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Você ainda não publicou nenhuma demanda.</Text>
              <Link href="/demands/create" style={styles.emptyLink}>
                Publicar minha primeira demanda
              </Link>
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
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  demandCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  demandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: "700",
    color: "#116530",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  status_aberta: { backgroundColor: "#e8f5e9" },
  status_em_contato: { backgroundColor: "#fff3e0" },
  status_encerrada: { backgroundColor: "#f5f5f5" },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  demandFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textTransform: "capitalize",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#116530",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
  },
  emptyLink: {
    color: "#116530",
    fontWeight: "600",
  },
});
