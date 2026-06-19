import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
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
import { Button, theme, useToast } from "../../../components";

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
  const { showToast } = useToast();

  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) {
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
  }, [id, callRpc, router]);

  const handleUpdateStatus = async (newStatus: "concluida" | "cancelada") => {
    if (!id) return;

    setUpdatingStatus(true);
    try {
      const updated = await callRpc<DemandResponse>("demands.update", {
        id,
        status: newStatus,
      });
      setDemand(updated);
      const statusLabel = newStatus === "concluida" ? "concluída" : "cancelada";
      showToast(`Demanda marcada como ${statusLabel}`, "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
      showToast(message, "error");
    } finally {
      setUpdatingStatus(false);
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
          <Text style={styles.title}>{demand.serviceType}</Text>
          <Text style={styles.description}>{demand.description}</Text>

          <View style={styles.infoGrid}>
            <InfoItem label="Municipio" value={demand.municipality} />
            <InfoItem label="Urgencia" value={demand.urgency.replace("_", " ")} />
            <InfoItem label="Visibilidade" value={`${demand.visibilityRadius}km`} />
          </View>

          {isOwner && (
            <View style={styles.actions}>
              <Button
                title={updatingStatus ? "Atualizando..." : "Concluir"}
                variant="outline"
                onPress={() => handleUpdateStatus("concluida")}
                style={styles.actionFlex}
                disabled={updatingStatus}
                loading={updatingStatus}
              />
              <Button
                title={updatingStatus ? "Atualizando..." : "Cancelar"}
                variant="ghost"
                onPress={() => handleUpdateStatus("cancelada")}
                style={styles.actionFlex}
                disabled={updatingStatus}
                textStyle={{ color: theme.colors.error }}
              />
            </View>
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
});
