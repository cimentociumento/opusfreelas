import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useOnboardingStatus } from "../hooks/use-onboarding-status";
import { useRpcWithDevMode } from "../hooks/use-rpc-with-dev-mode";
import { Button, theme, useToast } from "../components";

type Step = "name" | "role";

export default function OnboardingScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { needsOnboarding, isReady } = useOnboardingStatus();
  const { callRpc } = useRpcWithDevMode();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (isReady && !needsOnboarding) return <Redirect href="/" />;

  async function handleContinue() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showToast("Digite seu nome (mínimo 2 letras).", "error");
      return;
    }

    setSaving(true);
    try {
      await callRpc("identity.updateProfile", { displayName: trimmed });
      setStep("role");
    } catch (error: any) {
      showToast(error.message ?? "Não foi possível salvar seu nome.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (step === "role") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Quer também oferecer serviços?</Text>
        <Text style={styles.subtitle}>
          Você pode ativar isso a qualquer momento no seu perfil.
        </Text>
        <Button
          title="Sim, quero oferecer serviços"
          variant="primary"
          size="lg"
          onPress={() => router.replace("/profile/provider-setup")}
        />
        <Button
          title="Agora não"
          variant="ghost"
          size="md"
          onPress={() => router.replace("/")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Como você quer ser chamado?</Text>
      <Text style={styles.subtitle}>
        Esse nome aparece pra quem você contratar ou pra quem contratar você.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        autoCapitalize="words"
        style={styles.input}
      />
      <Button title="Continuar" variant="primary" size="lg" loading={saving} onPress={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
  },
});
