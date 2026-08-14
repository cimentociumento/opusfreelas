import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
<<<<<<< HEAD
import { View } from "react-native";
import { useOnboardingStatus } from "../hooks/use-onboarding-status";
import { useRpcWithDevMode } from "../hooks/use-rpc-with-dev-mode";
import { useToast } from "../components";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";

type Step = "identity" | "role";
=======
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useOnboardingStatus } from "../hooks/use-onboarding-status";
import { useRpcWithDevMode } from "../hooks/use-rpc-with-dev-mode";
import { Button, theme, useToast } from "../components";

type Step = "name" | "role";
>>>>>>> origin/feat/nativewind-piloto

export default function OnboardingScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { needsOnboarding, isReady } = useOnboardingStatus();
  const { callRpc } = useRpcWithDevMode();
  const { showToast } = useToast();

<<<<<<< HEAD
  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [municipality, setMunicipality] = useState("");
=======
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
>>>>>>> origin/feat/nativewind-piloto
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (isReady && !needsOnboarding) return <Redirect href="/" />;

  async function handleContinue() {
<<<<<<< HEAD
    const trimmedName = name.trim();
    const trimmedCity = municipality.trim();
    if (trimmedName.length < 2) {
      showToast("Digite seu nome (mínimo 2 letras).", "error");
      return;
    }
    if (trimmedCity.length < 2) {
      showToast("Informe sua cidade.", "error");
      return;
    }

    setSaving(true);
    try {
      await callRpc("identity.updateProfile", {
        displayName: trimmedName,
        municipality: trimmedCity,
      });
      setStep("role");
    } catch (error: any) {
      showToast(error.message ?? "Não foi possível salvar seus dados.", "error");
=======
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
>>>>>>> origin/feat/nativewind-piloto
    } finally {
      setSaving(false);
    }
  }

<<<<<<< HEAD
  async function chooseRole(isProvider: boolean) {
    setSaving(true);
    try {
      await callRpc("identity.updateRoles", { isContractor: true, isProvider });
      router.replace(isProvider ? "/profile/provider-setup" : "/");
    } catch (error: any) {
      showToast(error.message ?? "Não foi possível salvar sua escolha.", "error");
      setSaving(false);
    }
  }

  if (step === "role") {
    return (
      <View className="flex-1 justify-center gap-4 bg-background p-6">
        <Text className="text-2xl font-bold text-foreground">
          Como você quer usar o Opus Freelas?
        </Text>
        <Text className="text-base text-muted-foreground">
          Você pode ativar o outro papel a qualquer momento no seu perfil.
        </Text>
        <Button size="lg" disabled={saving} onPress={() => chooseRole(false)}>
          <Text>Quero contratar</Text>
        </Button>
        <Button size="lg" variant="secondary" disabled={saving} onPress={() => chooseRole(true)}>
          <Text>Quero oferecer serviços</Text>
        </Button>
=======
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
>>>>>>> origin/feat/nativewind-piloto
      </View>
    );
  }

  return (
<<<<<<< HEAD
    <View className="flex-1 justify-center gap-4 bg-background p-6">
      <Text className="text-2xl font-bold text-foreground">Bem-vindo!</Text>
      <Text className="text-base text-muted-foreground">
        Esses dados aparecem pra quem você contratar ou pra quem contratar você.
      </Text>
      <Input placeholder="Seu nome" autoCapitalize="words" value={name} onChangeText={setName} />
      <Input
        placeholder="Sua cidade"
        autoCapitalize="words"
        value={municipality}
        onChangeText={setMunicipality}
      />
      <Button size="lg" disabled={saving} onPress={handleContinue}>
        <Text>Continuar</Text>
      </Button>
    </View>
  );
}
=======
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
>>>>>>> origin/feat/nativewind-piloto
