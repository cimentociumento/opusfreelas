import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";
import { useOnboardingStatus } from "../hooks/use-onboarding-status";
import { useRpc } from "../hooks/use-rpc";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";

type Step = "identity" | "role";

export default function OnboardingScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { needsOnboarding, isReady } = useOnboardingStatus();
  const { callRpc } = useRpc();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (isReady && !needsOnboarding) return <Redirect href="/" />;

  async function handleContinue() {
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
    } finally {
      setSaving(false);
    }
  }

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
      </View>
    );
  }

  return (
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
