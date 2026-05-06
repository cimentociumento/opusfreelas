import { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { CreateDemandInput, DemandResponse, demandUrgencySchema } from "@amauc/shared";

export default function CreateDemandScreen() {
  const router = useRouter();
  const { callRpc } = useRpc();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateDemandInput>({
    serviceType: "",
    description: "",
    municipality: "Concórdia", // Default for AMAUC
    latitude: -27.23, // Default coords for Concórdia
    longitude: -52.02,
    urgency: "media",
    visibilityRadius: 10,
  });

  const handleSubmit = async () => {
    if (form.description.length < 30) {
      Alert.alert("Erro", "A descrição deve ter pelo menos 30 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await callRpc<DemandResponse>("demands.create", form);
      Alert.alert("Sucesso", "Demanda publicada com sucesso!", [
        { text: "OK", onPress: () => router.replace("/demands") }
      ]);
    } catch (error: any) {
      Alert.alert("Erro ao publicar", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Publicar Demanda" }} />
      
      <View style={styles.form}>
        <Text style={styles.label}>Tipo de Serviço</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Capina, Pintura, Diarista"
          value={form.serviceType}
          onChangeText={(text) => setForm({ ...form, serviceType: text })}
        />

        <Text style={styles.label}>Descrição (Mínimo 30 caracteres)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva o que você precisa com detalhes..."
          multiline
          numberOfLines={4}
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
        />

        <Text style={styles.label}>Município</Text>
        <TextInput
          style={styles.input}
          value={form.municipality}
          onChangeText={(text) => setForm({ ...form, municipality: text })}
        />

        <Text style={styles.label}>Urgência</Text>
        <View style={styles.row}>
          {demandUrgencySchema.options.map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.chip, form.urgency === u && styles.chipActive]}
              onPress={() => setForm({ ...form, urgency: u })}
            >
              <Text style={[styles.chipText, form.urgency === u && styles.chipTextActive]}>
                {u.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Raio de Visibilidade: {form.visibilityRadius}km</Text>
        {/* Simplified radius selection for now */}
        <View style={styles.row}>
          {[5, 10, 20, 50].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, form.visibilityRadius === r && styles.chipActive]}
              onPress={() => setForm({ ...form, visibilityRadius: r })}
            >
              <Text style={[styles.chipText, form.visibilityRadius === r && styles.chipTextActive]}>
                {r}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Publicar Demanda</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#116530",
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: "#116530",
  },
  chipText: {
    color: "#116530",
    fontSize: 12,
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#116530",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
