import { useRef, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { serviceCategories, ServiceCategory } from "@amauc/shared";
import { theme } from "../../../components";

export default function ProviderSetupScreen() {
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  const isSavingRef = useRef(false);

  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (cat: ServiceCategory) => {
    if (loading) return;
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;

    if (selectedCategories.length === 0) {
      Alert.alert("Erro", "Selecione pelo menos uma categoria.");
      return;
    }

    isSavingRef.current = true;
    setLoading(true);

    try {
      const latitude = -27.23;
      const longitude = -52.03;

      await callRpc("identity.updateRoles", {
        isContractor: true,
        isProvider: true,
      });

      await callRpc("identity.updateProviderProfile", {
        latitude,
        longitude,
        serviceCategories: selectedCategories,
      });

      Alert.alert("Sucesso", "Perfil atualizado! Agora você pode ser encontrado por contratantes.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      isSavingRef.current = false;
      setLoading(false);
      Alert.alert("Erro ao salvar", error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Configurar Perfil" }} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suas Categorias</Text>
        <Text style={styles.sectionSubtitle}>Selecione os serviços que você oferece</Text>

        <View style={styles.grid}>
          {serviceCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat as ServiceCategory);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleCategory(cat as ServiceCategory)}
                disabled={loading}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localização</Text>
        <Text style={styles.sectionSubtitle}>
          Sua localização atual será usada para mostrar você a contratantes próximos.
        </Text>
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>Concórdia, SC (Detectado)</Text>
        </View>
      </View>

      <View style={styles.footer} pointerEvents={loading ? "none" : "auto"}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar Perfil</Text>
          )}
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
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#fff",
  },
  locationBox: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  footer: {
    padding: 24,
    marginBottom: 40,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
