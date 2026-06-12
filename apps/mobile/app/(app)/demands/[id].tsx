import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  DemandResponse,
  demandUrgencySchema,
  updateDemandRpcSchema,
  type DemandUrgency,
} from "@amauc/shared";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { isDemandOwner } from "../../../lib/auth-constants";
import { Button, theme } from "../../../components";

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type EditForm = {
  serviceType: string;
  description: string;
  municipality: string;
  urgency: DemandUrgency;
  visibilityRadius: number;
  latitude: number;
  longitude: number;
};

function toEditForm(demand: DemandResponse): EditForm {
  return {
    serviceType: demand.serviceType,
    description: demand.description,
    municipality: demand.municipality,
    urgency: demand.urgency,
    visibilityRadius: demand.visibilityRadius,
    latitude: demand.latitude,
    longitude: demand.longitude,
  };
}

export default function DemandDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = paramToString(idParam);
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  const { userId: currentUserId, isReady: isAuthReady } = useEffectiveUserId();

  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const isDeletingRef = useRef(false);

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
          setEditForm(toEditForm(found));
        } else {
          Alert.alert("Erro", "Demanda nao encontrada.");
          router.back();
        }
      } catch {
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
  }, [id, callRpc, router]);

  const handleSave = async () => {
    if (!id || !editForm) return;

    const parsed = updateDemandRpcSchema.safeParse({ id, ...editForm });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      Alert.alert("Erro", firstIssue?.message ?? "Verifique os campos da demanda.");
      return;
    }

    setSaving(true);
    try {
      const updated = await callRpc<DemandResponse>("demands.update", parsed.data);
      setDemand(updated);
      setEditForm(toEditForm(updated));
      setIsEditing(false);
      Alert.alert("Sucesso", "Demanda atualizada!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar.";
      Alert.alert("Erro", message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = (newStatus: "concluida" | "cancelada") => {
    const title = newStatus === "concluida" ? "Concluir Demanda" : "Cancelar Demanda";
    const message = newStatus === "concluida" 
      ? "Parabens! O servico foi finalizado com sucesso?" 
      : "Tem certeza que deseja cancelar esta demanda?";

    Alert.alert(
      title,
      message,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: newStatus === "concluida" ? "Concluir" : "Confirmar Cancelamento",
          style: newStatus === "concluida" ? "default" : "destructive",
          onPress: async () => {
            if (!id) return;
            try {
              const updated = await callRpc<DemandResponse>("demands.update", {
                id,
                status: newStatus,
              });
              setDemand(updated);
              Alert.alert("Sucesso", `Demanda ${newStatus === "concluida" ? "concluida" : "cancelada"}.`);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
              Alert.alert("Erro", message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir Demanda",
      "Esta ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!id || isDeletingRef.current) return;
            isDeletingRef.current = true;
            setDeleting(true);
            try {
              await callRpc("demands.delete", { id });
              router.replace("/demands");
            } catch (error: unknown) {
              isDeletingRef.current = false;
              setDeleting(false);
              const message = error instanceof Error ? error.message : "Erro ao excluir.";
              Alert.alert("Erro", message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!demand || !editForm) return null;

  const isOwner = isAuthReady && isDemandOwner(demand.contractorId, currentUserId);
  const isClosed = ["concluida", "cancelada", "encerrada"].includes(demand.status);
  const canEdit = isOwner && !isClosed;
  const canDelete = isOwner && isClosed;

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
            <Text style={styles.label}>Tipo de Servico</Text>
            <TextInput
              style={styles.input}
              value={editForm.serviceType}
              onChangeText={(text) => setEditForm({ ...editForm, serviceType: text })}
              editable={!saving}
            />

            <Text style={styles.label}>Descricao</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
              editable={!saving}
            />
            <Text style={styles.helperText}>{editForm.description.length}/30 caracteres minimos</Text>

            <Text style={styles.label}>Municipio</Text>
            <TextInput
              style={styles.input}
              value={editForm.municipality}
              onChangeText={(text) => setEditForm({ ...editForm, municipality: text })}
              editable={!saving}
            />

            <Text style={styles.label}>Urgencia</Text>
            <View style={styles.chipRow}>
              {demandUrgencySchema.options.map((u) => (
                <Button
                  key={u}
                  title={u.replace("_", " ")}
                  variant={editForm.urgency === u ? "primary" : "outline"}
                  size="sm"
                  style={styles.chip}
                  onPress={() => setEditForm({ ...editForm, urgency: u })}
                  disabled={saving}
                />
              ))}
            </View>

            <Text style={styles.label}>Raio de busca: {editForm.visibilityRadius}km</Text>
            <View style={styles.chipRow}>
              {[5, 10, 20, 50].map((r) => (
                <Button
                  key={r}
                  title={`${r}km`}
                  variant={editForm.visibilityRadius === r ? "primary" : "outline"}
                  size="sm"
                  style={styles.chip}
                  onPress={() => setEditForm({ ...editForm, visibilityRadius: r })}
                  disabled={saving}
                />
              ))}
            </View>

            <View style={styles.editActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => {
                  setEditForm(toEditForm(demand));
                  setIsEditing(false);
                }}
                disabled={saving}
                style={styles.actionFlex}
              />
              <Button
                title={saving ? "Salvando..." : "Salvar"}
                variant="primary"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={styles.actionFlex}
              />
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.title}>{demand.serviceType}</Text>
            <Text style={styles.description}>{demand.description}</Text>

            <View style={styles.infoGrid}>
              <InfoItem label="Municipio" value={demand.municipality} />
              <InfoItem label="Urgencia" value={demand.urgency.replace("_", " ")} />
              <InfoItem label="Visibilidade" value={`${demand.visibilityRadius}km`} />
            </View>

            {canEdit && (
              <View style={styles.actions}>
                <Button
                  title="Editar"
                  variant="primary"
                  onPress={() => setIsEditing(true)}
                  style={styles.actionFlex}
                />
                <Button
                  title="Concluir"
                  variant="outline"
                  onPress={() => handleUpdateStatus("concluida")}
                  style={styles.actionFlex}
                />
                <Button
                  title="Cancelar"
                  variant="ghost"
                  onPress={() => handleUpdateStatus("cancelada")}
                  style={styles.actionFlex}
                  textStyle={{ color: theme.colors.error }}
                />
              </View>
            )}

            {canDelete && (
              <View style={styles.deleteSection}>
                <Button
                  title={deleting ? "Excluindo..." : "Excluir"}
                  variant="ghost"
                  onPress={handleDelete}
                  disabled={deleting}
                  loading={deleting}
                  textStyle={styles.deleteText}
                />
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
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
  },
  status_aberta: { backgroundColor: theme.colors.primaryLight },
  status_em_contato: { backgroundColor: theme.colors.secondaryLight },
  status_concluida: { backgroundColor: theme.colors.successLight || "#e6fffa" },
  status_cancelada: { backgroundColor: theme.colors.errorLight || "#fff5f5" },
  status_encerrada: { backgroundColor: theme.colors.border },
  statusText: {
    ...theme.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoItem: {
    width: "50%",
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  infoValue: {
    ...theme.typography.body2,
    fontWeight: "600",
    color: theme.colors.text,
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  actionFlex: {
    flex: 1,
  },
  deleteSection: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  deleteText: {
    color: theme.colors.error,
  },
  form: {
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.body2,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body1,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    minWidth: 72,
  },
  editActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
});
