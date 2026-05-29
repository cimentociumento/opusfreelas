import { useEffect, useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { DemandResponse, demandUrgencySchema, demandStatusSchema } from "@amauc/shared";

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function DemandDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = paramToString(idParam);
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  
  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      Alert.alert("Erro", "ID da demanda invalido.");
      router.back();
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDemand = async () => {
      try {
        const demands = await callRpc<DemandResponse[]>("demands.listMyDemands");
        if (cancelled) return;
        const found = demands.find((d) => d.id === id);
        if (found) {
          setDemand(found);
          setEditForm(found);
        } else {
          Alert.alert("Erro", "Demanda nao encontrada.");
          router.back();
        }
      } catch (error) {
        console.error("Error loading demand:", error);
        if (!cancelled) {
          Alert.alert("Erro", "Nao foi possivel carregar a demanda.");
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDemand();
    return () => {
      cancelled = true;
    };
  }, [id, callRpc]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await callRpc<DemandResponse>("demands.update", {
        id,
        ...editForm
      });
      setDemand(updated);
      setIsEditing(false);
      Alert.alert("Sucesso", "Demanda atualizada!");
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDemand = () => {
    Alert.alert(
      "Encerrar Demanda",
      "Tem certeza que deseja encerrar esta demanda? Ela não será mais visível para prestadores.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Encerrar", 
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            try {
              const updated = await callRpc<DemandResponse>("demands.update", { id, status: "encerrada" });
              setDemand(updated);
              Alert.alert("Sucesso", "Demanda encerrada.");
            } catch (error: any) {
              Alert.alert("Erro", error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  if (!demand) return null;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: isEditing ? "Editar Demanda" : "Detalhes da Demanda" }} />
      
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.statusBadge, styles[`status_${demand.status}`]]}>
            <Text style={styles.statusText}>{demand.status}</Text>
          </View>
          <Text style={styles.date}>{new Date(demand.createdAt).toLocaleDateString("pt-BR")}</Text>
        </View>

        {isEditing ? (
          <View style={styles.form}>
            <Text style={styles.label}>Tipo de Serviço</Text>
            <TextInput
              style={styles.input}
              value={editForm.serviceType}
              onChangeText={(text) => setEditForm({ ...editForm, serviceType: text })}
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
            />

            <View style={styles.editActions}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.title}>{demand.serviceType}</Text>
            <Text style={styles.description}>{demand.description}</Text>
            
            <View style={styles.infoGrid}>
              <InfoItem label="Município" value={demand.municipality} />
              <InfoItem label="Urgência" value={demand.urgency} />
              <InfoItem label="Visibilidade" value={`${demand.visibilityRadius}km`} />
            </View>

            {demand.status !== "encerrada" && (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.actionBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.closeBtn]}
                  onPress={handleCloseDemand}
                >
                  <Text style={[styles.actionBtnText, { color: "#d32f2f" }]}>Encerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  status_aberta: { backgroundColor: "#e8f5e9" },
  status_em_contato: { backgroundColor: "#fff3e0" },
  status_encerrada: { backgroundColor: "#f5f5f5" },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#116530",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 16,
    marginBottom: 24,
  },
  infoItem: {
    width: "50%",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: "#116530",
    borderColor: "#116530",
  },
  closeBtn: {
    backgroundColor: "#fff",
    borderColor: "#d32f2f",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#999",
  },
  saveButton: {
    backgroundColor: "#116530",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
