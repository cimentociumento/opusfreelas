import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  DemandResponse,
  demandUrgencySchema,
  demandServiceTypeOptions,
  type DemandUrgency } from "@amauc/shared";
import { useRpc } from "../../../hooks/use-rpc";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { isDemandOwner } from "../../../lib/auth-constants";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useToast } from "../../../components/Toast";
import { theme } from "../../../components/theme";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_contato: "Em contato",
  concluida: "Concluída",
  cancelada: "Cancelada",
  encerrada: "Encerrada",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  aberta: "bg-primary/10",
  em_contato: "bg-secondary",
  concluida: "bg-primary/10",
  cancelada: "bg-destructive/10",
  encerrada: "bg-muted",
};

const STATUS_TEXT_CLASS: Record<string, string> = {
  aberta: "text-primary",
  em_contato: "text-secondary-foreground",
  concluida: "text-primary",
  cancelada: "text-destructive",
  encerrada: "text-muted-foreground",
};

function isDemandOpenForActions(status: string): boolean {
  return status === "aberta" || status === "em_contato";
}

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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

    // Espera o Clerk resolver a sessão — senão o RPC dispara sem token válido
    // e esta tela manda o usuário de volta por engano.
    if (!isAuthReady) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const loadDemand = async () => {
      try {
        const found = await callRpc<DemandResponse>("demands.getById", { id });
        if (cancelled) return;
        setDemand(found);
      } catch (err) {
        if (!cancelled) {
          console.error("[demands.detail] loadDemand falhou", err);
          setLoadError("Não foi possível carregar esta demanda.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDemand();
    return () => {
      cancelled = true;
    };
    // callRpc/router de propósito fora do array: sua identidade não é
    // garantidamente estável entre renders, e reincluí-los aqui — combinado
    // com o setLoading(true) acima — reabre o loop de re-render que este
    // efeito existe para evitar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthReady, reloadKey]);

  const retryLoad = useCallback(() => setReloadKey((key) => key + 1), []);

  const handleUpdateStatus = async (newStatus: "em_contato" | "concluida" | "cancelada") => {
    if (!id) return;

    setUpdatingStatus(true);
    try {
      // Atualiza o status em vez de excluir: preserva o registro para
      // histórico em "Minhas Demandas" e para uma futura avaliação
      // pós-conclusão (Etapa 4). "Excluir" continua sendo uma ação separada
      // para quem realmente quer remover a demanda.
      const updated = await callRpc<DemandResponse>("demands.update", { id, status: newStatus });
      setDemand(updated);
      showToast(`Demanda marcada como ${(STATUS_LABEL[newStatus] ?? newStatus).toLowerCase()}`, "success");
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

  const handleWhatsApp = () => {
    if (!demand?.contractorPhone) return;
    const digits = demand.contractorPhone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá${demand.contractorName ? " " + demand.contractorName : ""}, vi sua demanda "${demand.serviceType}" no Opus Freelas e tenho interesse.`
    );
    Linking.openURL(`https://wa.me/55${digits}?text=${message}`).catch(() => {
      showToast("Não foi possível abrir o WhatsApp.", "error");
    });
  };

  const handleCall = () => {
    if (!demand?.contractorPhone) return;
    Linking.openURL(`tel:${demand.contractorPhone.replace(/\D/g, "")}`).catch(() => {
      showToast("Não foi possível iniciar a ligação.", "error");
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Card className="w-full items-center gap-3 p-6">
          <Text variant="h4">Não foi possível carregar</Text>
          <Text className="text-center text-muted-foreground">{loadError}</Text>
          <Button onPress={retryLoad}>
            <Text>Tentar novamente</Text>
          </Button>
        </Card>
      </View>
    );
  }

  if (!demand) return null;

  const isOwner = isAuthReady && isDemandOwner(demand.contractorId, currentUserId);

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Detalhes da Demanda" }} />

      <Card className="m-4 gap-4 p-6">
        <View className="flex-row items-center justify-between">
          <View className={`rounded-md px-2.5 py-1 ${STATUS_BADGE_CLASS[demand.status] ?? "bg-muted"}`}>
            <Text
              className={`text-xs font-bold uppercase ${STATUS_TEXT_CLASS[demand.status] ?? "text-muted-foreground"}`}
            >
              {STATUS_LABEL[demand.status] ?? demand.status}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {new Date(demand.createdAt).toLocaleDateString("pt-BR")}
          </Text>
        </View>

        {isEditing && editForm ? (
          <View className="gap-4">
            <Text className="text-sm font-bold">🛠️ Tipo de Serviço</Text>
            <View className="flex-row flex-wrap gap-2">
              {demandServiceTypeOptions.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={editForm.serviceType === cat ? "default" : "outline"}
                  onPress={() => setEditForm({ ...editForm, serviceType: cat })}
                  disabled={isSaving}
                >
                  <Text>{cat}</Text>
                </Button>
              ))}
            </View>

            <Text className="text-sm font-bold">📝 Descrição do serviço</Text>
            <Input
              className="h-20"
              textAlignVertical="top"
              multiline
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
              editable={!isSaving}
            />

            <Text className="text-sm font-bold">📍 Município</Text>
            <Input
              value={editForm.municipality}
              onChangeText={(text) => setEditForm({ ...editForm, municipality: text })}
              editable={!isSaving}
            />

            <Text className="text-sm font-bold">⚡ Nível de Urgência</Text>
            <View className="flex-row flex-wrap gap-2">
              {demandUrgencySchema.options.map((u) => (
                <Button
                  key={u}
                  variant={editForm.urgency === u ? "default" : "outline"}
                  size="sm"
                  className="min-w-20 flex-1"
                  onPress={() => setEditForm({ ...editForm, urgency: u })}
                  disabled={isSaving}
                >
                  <Text className="capitalize">{u.replace("_", " ")}</Text>
                </Button>
              ))}
            </View>

            <Text className="text-sm font-bold">📏 Raio de Busca: {editForm.visibilityRadius}km</Text>
            <View className="flex-row flex-wrap gap-2">
              {[5, 10, 20, 50].map((r) => (
                <Button
                  key={r}
                  variant={editForm.visibilityRadius === r ? "default" : "outline"}
                  size="sm"
                  className="min-w-16 flex-1"
                  onPress={() => setEditForm({ ...editForm, visibilityRadius: r })}
                  disabled={isSaving}
                >
                  <Text>{r}km</Text>
                </Button>
              ))}
            </View>

            <View className="flex-row gap-2">
              <Button className="flex-1" onPress={handleSaveEdit} disabled={isSaving}>
                <Text>{isSaving ? "Salvando..." : "Salvar Edição"}</Text>
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onPress={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <Text>Cancelar</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View>
            <Text className="mb-2 text-2xl font-bold text-primary">{demand.serviceType}</Text>
            <Text className="mb-6 text-base leading-6 text-muted-foreground">
              {demand.description}
            </Text>

            <View className="mb-6 flex-row flex-wrap border-y border-border py-4">
              <InfoItem label="Município" value={demand.municipality} />
              <InfoItem label="Urgência" value={demand.urgency.replace("_", " ")} />
              <InfoItem label="Visibilidade" value={`${demand.visibilityRadius}km`} />
            </View>

            {isOwner && (
              <View className="border-t border-border pt-4">
                <Text className="mb-4 text-xs font-bold uppercase text-muted-foreground">
                  Ações da Demanda
                </Text>

                {isDemandOpenForActions(demand.status) ? (
                  <>
                    {demand.status === "aberta" ? (
                      <View className="mb-3">
                        <Button
                          variant="outline"
                          onPress={() => handleUpdateStatus("em_contato")}
                          disabled={updatingStatus || isDeleting}
                        >
                          <Text>Marcar como Em Contato</Text>
                        </Button>
                      </View>
                    ) : null}

                    <View className="mb-3 flex-row gap-2">
                      <Button
                        className="flex-1"
                        onPress={() => handleUpdateStatus("concluida")}
                        disabled={updatingStatus || isDeleting}
                      >
                        <Text>Concluir</Text>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onPress={() => {
                          setEditForm(toEditForm(demand));
                          setIsEditing(true);
                        }}
                        disabled={updatingStatus || isDeleting}
                      >
                        <Text>Editar</Text>
                      </Button>
                    </View>
                    <View className="flex-row gap-2">
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onPress={() => handleUpdateStatus("cancelada")}
                        disabled={updatingStatus || isDeleting}
                      >
                        <Text className="text-destructive">Cancelar Demanda</Text>
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onPress={handleDelete}
                        disabled={updatingStatus || isDeleting}
                      >
                        <Text className="text-destructive">
                          {isDeleting ? "Excluindo..." : "Excluir"}
                        </Text>
                      </Button>
                    </View>
                  </>
                ) : (
                  <Button variant="ghost" onPress={handleDelete} disabled={isDeleting}>
                    <Text className="text-destructive">
                      {isDeleting ? "Excluindo..." : "Excluir"}
                    </Text>
                  </Button>
                )}
              </View>
            )}

            {!isOwner && (
              <View className="border-t border-border pt-4">
                <Text className="mb-4 text-xs font-bold uppercase text-muted-foreground">
                  Contato
                </Text>
                <Text className="mb-4 text-xl font-semibold">
                  {demand.contractorName ?? "Contratante"}
                </Text>
                {demand.contractorPhone ? (
                  <View className="flex-row gap-2">
                    <Button className="flex-1" onPress={handleWhatsApp}>
                      <Text>Falar no WhatsApp</Text>
                    </Button>
                    <Button variant="outline" className="flex-1" onPress={handleCall}>
                      <Text>Ligar</Text>
                    </Button>
                  </View>
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    Este contratante ainda não cadastrou um telefone de contato.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 w-1/2">
      <Text className="mb-0.5 text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold capitalize">{value}</Text>
    </View>
  );
}
