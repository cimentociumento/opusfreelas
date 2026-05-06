import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { serviceCategories } from "@amauc/shared";

export default function DiscoveryScreen() {
  const router = useRouter();

  const handleCategorySelect = (category: string) => {
    router.push({
      pathname: "/discovery/results",
      params: { category }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "O que você precisa?" }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Encontre profissionais perto de você</Text>
        <Text style={styles.subtitle}>Selecione uma categoria para começar</Text>
      </View>

      <View style={styles.grid}>
        {serviceCategories.map((item) => (
          <TouchableOpacity 
            key={item} 
            style={styles.card}
            onPress={() => handleCategorySelect(item)}
          >
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>{item[0]}</Text>
            </View>
            <Text style={styles.cardText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.allBtn}
          onPress={() => handleCategorySelect("")}
        >
          <Text style={styles.allBtnText}>Ver todos os profissionais</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 24,
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#116530",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  iconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#116530",
  },
  cardText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  footer: {
    padding: 24,
    marginBottom: 40,
  },
  allBtn: {
    backgroundColor: "#f5f5f5",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  allBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
});
