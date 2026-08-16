import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TextInput } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  DemandResponse,
  demandUrgencySchema,
  updateDemandRpcSchema,
  type DemandUrgency } from "@amauc/shared";
import { useRpc } from "../../../hooks/use-rpc";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { isDemandOwner } from "../../../lib/auth-constants";
import { Button } from "../../../components/Button";
import { useToast } from "../../../components/Toast";
import { theme } from "../../../components/theme";

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
    longitude: demand.longitude };
}

export default function DemandDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = paramToString(idParam);
  const router = useRouter();
  const { callRpc } = useRpc();
  const { userId: currentUserId, isReady: isAuthReady } = useEffectiveUserId();
  const { showToast } = useToast();

  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      router.back();
      setLoading(false);
      return;
    }

    // Espera o modo dev/Clerk resolverem — senão o RPC dispara com o
    // isDevMode inicial (falso) e cai no caminho Clerk sem sessão real,
    // o que faz esta tela mandar o usuário de volta por engano.
    if (!isAuthReady) {
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
        } else {
          router.back();
        }
      } catch {
        if (!cancelled) {
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
  }, [id, callRpc, router, isAuthReady]);

  const handleUpdateStatus = async (newStatus: "concluida" | "cancelada") => {
    if (!id) return;

    setUpdatingStatus(true);
    try {
      // Concluir/cancelar encerra o ciclo de vida da demanda: ela é excluída
      // (não só marcada) e some da lista de "Minhas Demandas" ao voltar.
      await callRpc<{ deleted: boolean; id: string }>("demands.delete", { id });
      const statusLabel = newStatus === "concluida" ? "concluída" : "cancelada";
      showToast(`Demanda marcada como ${statusLabel} e removida da lista`, "success");
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
      showToast(message, "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm) return;
    
    if (!editForm.serviceType.trim() || !editForm.description.trim() || !editForm.municipality.trim()) {
      showToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await callRpc<DemandResponse>("demands.update", {
        id,
        ...editForm });
      setDemand(updated);
      setIsEditing(false);
      showToast("Demanda atualizada com sucesso", "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar demanda.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await callRpc("demands.delete", { id });
      showToast("Demanda excluída", "success");
      router.replace("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir demanda.";
      showToast(message, "error");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!demand) return null;

  const isOwner = isAuthReady && isDemandOwner(demand.contractorId, currentUserId);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Detalhes da Demanda" }} />

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.statusBadge, styles[`status_${demand.status}`]]}>
            <Text style={styles.statusText}>{demand.status}</Text>
          </View>
          <Text style={styles.date}>{new Date(demand.createdAt).toLocaleDateString("pt-BR")}</Text>
        </View>

        <View>
          {isEditing && editForm ? (
            <View style={{ gap: theme.spacing.md }}>
              <Text style={styles.label}>🛠️ Tipo de Serviço</Text>
              <TextInput
                style={styles.input}
                value={editForm.serviceType}
                onChangeText={(text) => setEditForm({ ...editForm, serviceType: text })}
                editable={!isSaving}
              />

              <Text style={styles.label}>📝 Descrição do serviço</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                multiline
                value={editForm.description}
                onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                editable={!isSaving}
              />

              <Text style={styles.label}>📍 Município</Text>
              <TextInput
                style={styles.input}
                value={editForm.municipality}
                onChangeText={(text) => setEditForm({ ...editForm, municipality: text })}
                editable={!isSaving}
              />

              <Text style={styles.label}>⚡ Nível de Urgência</Text>
              <View style={styles.chipRow}>
                {demandUrgencySchema.options.map((u) => (
                  <Button
                    key={u}
                    title={u.replace("_", " ")}
                    variant={editForm.urgency === u ? "primary" : "outline"}
                    size="sm"
                    style={styles.urgencyChip}
                    onPress={() => setEditForm({ ...editForm, urgency: u })}
                    disabled={isSaving}
                  />
                ))}
              </View>

              <Text style={styles.label}>📏 Raio de Busca: {editForm.visibilityRadius}km</Text>
              <View style={styles.chipRow}>
                {[5, 10, 20, 50].map((r) => (
                  <Button
                    key={r}
                    title={`${r}km`}
                    variant={editForm.visibilityRadius === r ? "primary" : "outline"}
                    size="sm"
                    style={styles.radiusChip}
                    onPress={() => setEditForm({ ...editForm, visibilityRadius: r })}
                    disabled={isSaving}
                  />
                ))}
              </View>

              <View style={styles.actions}>
                <Button
                  title={isSaving ? "Salvando..." : "Salvar Edição"}
                  variant="primary"
                  onPress={handleSaveEdit}
                  style={styles.actionFlex}
                  disabled={isSaving}
                  loading={isSaving}
                />
                <Button
                  title="Cancelar"
                  variant="ghost"
                  onPress={() => setIsEditing(false)}
                  style={styles.actionFlex}
                  disabled={isSaving}
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{demand.serviceType}</Text>
              <Text style={styles.description}>{demand.description}</Text>

              <View style={styles.infoGrid}>
                <InfoItem label="Municipio" value={demand.municipality} />
                <InfoItem label="Urgencia" value={demand.urgency.replace("_", " ")} />
                <InfoItem label="Visibilidade" value={`${demand.visibilityRadius}km`} />
              </View>

              {isOwner && (
                <View style={styles.ownerPanel}>
                  <Text style={styles.panelTitle}>Ações da Demanda</Text>
                  <View style={styles.actions}>
                    <Button
                      title="Concluir"
                      variant="primary"
                      onPress={() => handleUpdateStatus("concluida")}
                      style={styles.actionFlex}
                      disabled={updatingStatus || isDeleting}
                      loading={updatingStatus}
                    />
                    <Button
                      title="Editar"
                      variant="outline"
                      onPress={() => {
                        setEditForm(toEditForm(demand));
                        setIsEditing(true);
                      }}
                      style={styles.actionFlex}
                      disabled={updatingStatus || isDeleting}
                    />
                  </View>
                  <View style={styles.actions}>
                    <Button
                      title={updatingStatus ? "Cancelando..." : "Cancelar Demanda"}
                      variant="ghost"
                      onPress={() => handleUpdateStatus("cancelada")}
                      style={styles.actionFlex}
                      disabled={updatingStatus || isDeleting}
                      textStyle={{ color: theme.colors.error }}
                    />
                    <Button
                      title={isDeleting ? "Excluindo..." : "Excluir"}
                      variant="ghost"
                      onPress={handleDelete}
                      style={styles.actionFlex}
                      disabled={updatingStatus || isDeleting}
                      textStyle={{ color: theme.colors.error }}
                      loading={isDeleting}
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
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
    backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center" },
  card: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm },
  status_aberta: { backgroundColor: theme.colors.primaryLight },
  status_em_contato: { backgroundColor: theme.colors.secondaryLight },
  status_concluida: { backgroundColor: theme.colors.successLight || "#e6fffa" },
  status_cancelada: { backgroundColor: theme.colors.errorLight || "#fff5f5" },
  status_encerrada: { backgroundColor: theme.colors.border },
  statusText: {
    ...theme.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase" },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textLight },
  title: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm },
  description: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: theme.spacing.lg },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg },
  infoItem: {
    width: "50%",
    marginBottom: theme.spacing.sm },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: 2 },
  infoValue: {
    ...theme.typography.body2,
    fontWeight: "600",
    color: theme.colors.text,
    textTransform: "capitalize" },
  label: {
    ...theme.typography.body2,
    color: theme.colors.text,
    fontWeight: "700" },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body1 },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md },
  actionFlex: {
    flex: 1 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm },
  urgencyChip: {
    flex: 1,
    minWidth: 80 },
  radiusChip: {
    flex: 1,
    minWidth: 60 },
  ownerPanel: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border },
  panelTitle: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
    textTransform: "uppercase",
    fontWeight: "700" } });
