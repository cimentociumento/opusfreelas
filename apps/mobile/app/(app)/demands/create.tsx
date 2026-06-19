import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import {
  CreateDemandInput,
  DemandResponse,
  createDemandSchema,
  demandUrgencySchema,
} from "@amauc/shared";
import { Card, Button, theme, useToast } from "../../../components";

export default function CreateDemandScreen() {
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  const { showToast } = useToast();
  const isSubmittingRef = useRef(false);
  
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
    if (isSubmittingRef.current) return;

    const parsed = createDemandSchema.safeParse(form);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      showToast(firstIssue?.message ?? "Preencha todos os campos corretamente.", "error");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      await callRpc<DemandResponse>("demands.create", parsed.data);
      showToast("Demanda publicada com sucesso!", "success");
      router.replace("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      const isDuplicate =
        message.toLowerCase().includes("duplicate") ||
        message.toLowerCase().includes("duplicat");

      if (isDuplicate) {
        showToast("Demanda duplicada. Você já publicou essa demanda recentemente.", "warning");
        router.replace("/");
        return;
      }

      isSubmittingRef.current = false;
      setLoading(false);
      showToast(message, "error");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: "Publicar Demanda"
        }} 
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Publique sua demanda</Text>
        <Text style={styles.subtitle}>Encontre o profissional ideal para o seu serviço</Text>
      </View>

      <View style={styles.form}>
        <Card style={styles.formCard}>
          <Text style={styles.label}>🛠️ Tipo de Serviço</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Capina, Pintura, Diarista"
            value={form.serviceType}
            onChangeText={(text) => setForm({ ...form, serviceType: text })}
            editable={!loading}
          />

          <Text style={styles.label}>📝 Descrição do serviço</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descreva detalhadamente o que você precisa..."
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            editable={!loading}
          />
          <Text style={styles.helperText}>
            {form.description.length}/30 caracteres mínimos
          </Text>

          <Text style={styles.label}>📍 Município</Text>
          <TextInput
            style={styles.input}
            value={form.municipality}
            onChangeText={(text) => setForm({ ...form, municipality: text })}
            editable={!loading}
          />

          <Text style={styles.label}>⚡ Nível de Urgência</Text>
          <View style={styles.chipRow}>
            {demandUrgencySchema.options.map((u) => (
              <Button
                key={u}
                title={u.replace("_", " ")}
                variant={form.urgency === u ? "primary" : "outline"}
                size="sm"
                style={styles.urgencyChip}
                onPress={() => setForm({ ...form, urgency: u })}
                disabled={loading}
              />
            ))}
          </View>

          <Text style={styles.label}>📏 Raio de Busca: {form.visibilityRadius}km</Text>
          <View style={styles.chipRow}>
            {[5, 10, 20, 50].map((r) => (
              <Button
                key={r}
                title={`${r}km`}
                variant={form.visibilityRadius === r ? "primary" : "outline"}
                size="sm"
                style={styles.radiusChip}
                onPress={() => setForm({ ...form, visibilityRadius: r })}
                disabled={loading}
              />
            ))}
          </View>
        </Card>

        <View style={styles.actionArea}>
          <Button
            title={loading ? "Publicando…" : "🚀 Publicar Demanda"}
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  title: {
    ...theme.typography.h2,
    color: "#fff",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body1,
    color: "rgba(255, 255, 255, 0.9)",
  },
  form: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  formCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  label: {
    ...theme.typography.body2,
    color: theme.colors.text,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body1,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  urgencyChip: {
    flex: 1,
    minWidth: 80,
  },
  radiusChip: {
    flex: 1,
    minWidth: 60,
  },
  actionArea: {
    marginTop: theme.spacing.lg,
  },
});
