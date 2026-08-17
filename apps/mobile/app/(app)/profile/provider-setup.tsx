import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useRpc } from "../../../hooks/use-rpc";
import { useLocation } from "../../../hooks/use-location";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { serviceCategories, ServiceCategory } from "@amauc/shared";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import { useToast } from "../../../components/Toast";
import { theme } from "../../../components/theme";
import { resolvePortfolioContentType } from "../../../lib/portfolio";

export default function ProviderSetupScreen() {
  const router = useRouter();
  const { callRpc } = useRpc();
  const { isReady: isAuthReady } = useEffectiveUserId();
  const { showToast } = useToast();
  const isSavingRef = useRef(false);
  const providerRoleEnsuredRef = useRef(false);

  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { location, loading: locationLoading } = useLocation();

  const [municipality, setMunicipality] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [portfolioPaths, setPortfolioPaths] = useState<string[]>([]);
  // Paralelo a portfolioPaths (mesma ordem/índice) — path é o que volta pro
  // servidor ao salvar (gate anti-fraude exige "{clerk_user_id}/..."),
  // previewUrl é só pra exibir a imagem de verdade em vez do placeholder.
  const [portfolioPreviewUrls, setPortfolioPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Espera o Clerk resolver a sessão antes do primeiro RPC.
    if (!isAuthReady) return;

    let mounted = true;
    const loadProfile = async () => {
      try {
        const profile = await callRpc<{
          serviceCategories?: ServiceCategory[];
          displayName?: string | null;
          municipality?: string | null;
          phone?: string | null;
          bio?: string | null;
          yearsExperience?: number | null;
          portfolioUrls?: string[];
          portfolioPublicUrls?: string[];
        }>("identity.getProfile");
        if (mounted && profile) {
          if (profile.serviceCategories) setSelectedCategories(profile.serviceCategories);
          if (profile.displayName) setDisplayName(profile.displayName);
          if (profile.municipality) setMunicipality(profile.municipality);
          if (profile.phone) setPhone(profile.phone);
          if (profile.bio) setBio(profile.bio);
          if (profile.yearsExperience != null) setYearsExperience(String(profile.yearsExperience));
          if (profile.portfolioUrls) setPortfolioPaths(profile.portfolioUrls);
          if (profile.portfolioPublicUrls) setPortfolioPreviewUrls(profile.portfolioPublicUrls);
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      mounted = false;
    };
    // callRpc de propósito fora do array — ver a mesma nota em
    // discovery/results.tsx e demands/[id].tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady]);

  const toggleCategory = (cat: ServiceCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  async function ensureProviderRole() {
    if (providerRoleEnsuredRef.current) return;
    await callRpc("identity.updateRoles", { isContractor: true, isProvider: true });
    providerRoleEnsuredRef.current = true;
  }

  const addPhoto = async () => {
    if (portfolioPaths.length >= 6) {
      showToast("Máximo de 6 fotos.", "error");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast("Precisamos de acesso às fotos para o portfólio.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      // Entrar nesta tela e adicionar foto é intenção provider inequívoca — promove
      // o papel antes do upload para não bater no gate 403 da API (contratante que
      // chega pelo botão "Configurar Meu Perfil" ainda não tem is_provider=true).
      await ensureProviderRole();
      const { path, publicUrl } = await callRpc<{ path: string; publicUrl: string }>(
        "identity.uploadPortfolioImage",
        {
          imageBase64: asset.base64,
          contentType: resolvePortfolioContentType(asset.mimeType) }
      );
      setPortfolioPaths((prev) => [...prev, path]);
      setPortfolioPreviewUrls((prev) => [...prev, publicUrl]);
    } catch (error: any) {
      // Rede rural intermitente: não trava o formulário; o gate de visibilidade
      // cobre portfólio vazio. Ver spec §Erros.
      showToast(error.message ?? "Não foi possível enviar a foto.", "error");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const path = portfolioPaths[index];
    setPortfolioPaths((prev) => prev.filter((_, i) => i !== index));
    setPortfolioPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    // Some da lista imediatamente; a exclusão no storage é best-effort — se
    // falhar (rede rural), a foto só fica órfã no bucket, não volta a
    // aparecer pro usuário nem é referenciada ao salvar o perfil.
    callRpc("identity.deletePortfolioImage", { path }).catch((error) => {
      console.error("[provider-setup.removePhoto] falha ao excluir do storage:", error);
    });
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;

    if (selectedCategories.length === 0) {
      showToast("Selecione pelo menos uma categoria.", "error");
      return;
    }

    if (!location) {
      showToast("Aguardando localização...", "error");
      return;
    }

    isSavingRef.current = true;
    setLoading(true);

    // Cada etapa é envolvida com o nome da chamada que a originou: se uma
    // delas falhar no meio da sequência (ex.: categorias não persistem),
    // o toast e o log já apontam qual RPC especificamente falhou, em vez de
    // um "não foi possível salvar" genérico.
    const step = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        console.error(`[provider-setup.handleSave] falha em ${name}:`, error);
        throw new Error(`${name}: ${error?.message ?? "erro desconhecido"}`);
      }
    };

    try {
      await step("identity.updateRoles", () =>
        callRpc("identity.updateRoles", { isContractor: true, isProvider: true })
      );

      await step("identity.updateProviderProfile", () =>
        callRpc("identity.updateProviderProfile", {
          latitude: location.latitude,
          longitude: location.longitude,
          serviceCategories: selectedCategories,
        })
      );

      const trimmedCity = municipality.trim();
      if (trimmedCity && displayName.trim()) {
        // updateProfile writes displayName + municipality + phone together;
        // reuse the rehydrated displayName so we don't blank it out.
        await step("identity.updateProfile", () =>
          callRpc("identity.updateProfile", {
            displayName: displayName.trim(),
            municipality: trimmedCity,
            ...(phone.trim() ? { phone: phone.trim() } : {}),
          })
        );
      }

      // Rascunho progressivo: salva o que o usuário preencheu (bio, anos,
      // fotos) mesmo incompleto — a busca não exige mais completude para
      // listar o prestador (ver migration 20260816000000).
      const years = Number(yearsExperience);
      await step("identity.updateProviderSocialProfile", () =>
        callRpc("identity.updateProviderSocialProfile", {
          bio: bio.trim(),
          ...(yearsExperience.trim() && Number.isFinite(years)
            ? { yearsExperience: Math.max(0, Math.min(60, Math.trunc(years))) }
            : {}),
          portfolioUrls: portfolioPaths,
        })
      );

      showToast("Perfil salvo com sucesso!", "success");
      router.replace("/");
    } catch (error: any) {
      isSavingRef.current = false;
      setLoading(false);
      showToast(error.message, "error");
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Configurar Perfil" }} />

      <View className="border-b border-border p-6">
        <Text variant="h4" className="mb-1">
          Suas Categorias
        </Text>
        <Text className="mb-5 text-muted-foreground">Selecione os serviços que você oferece</Text>

        <View className="flex-row flex-wrap gap-2">
          {serviceCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat as ServiceCategory);
            return (
              <Button
                key={cat}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onPress={() => toggleCategory(cat as ServiceCategory)}
              >
                <Text>{cat}</Text>
              </Button>
            );
          })}
        </View>
      </View>

      <View className="border-b border-border p-6">
        <Text variant="h4" className="mb-1">
          Seus dados
        </Text>
        <Text className="mb-5 text-muted-foreground">
          Nome e telefone usados por contratantes para entrar em contato.
        </Text>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Seu nome"
          autoCapitalize="words"
          className="mb-4"
        />
        <Input
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefone / WhatsApp"
          keyboardType="phone-pad"
        />
      </View>

      <View className="border-b border-border p-6">
        <Text variant="h4" className="mb-1">
          Localização
        </Text>
        <Text className="mb-5 text-muted-foreground">
          Informe a cidade onde você atende os contratantes.
        </Text>
        <Input
          value={municipality}
          onChangeText={setMunicipality}
          placeholder="Sua cidade"
          autoCapitalize="words"
        />
      </View>

      <View className="border-b border-border p-6">
        <Text variant="h4" className="mb-1">
          Sobre você
        </Text>
        <Text className="mb-5 text-muted-foreground">
          Conte sua experiência para contratantes conhecerem seu trabalho.
        </Text>
        <Input
          value={bio}
          onChangeText={setBio}
          placeholder="Conte sua experiência (mínimo 40 caracteres)"
          multiline
          numberOfLines={4}
          className="h-24"
          textAlignVertical="top"
        />
      </View>

      <View className="border-b border-border p-6">
        <Text variant="h4" className="mb-1">
          Anos de experiência
        </Text>
        <Input
          value={yearsExperience}
          onChangeText={setYearsExperience}
          placeholder="Ex: 5"
          keyboardType="number-pad"
        />
      </View>

      <View className="border-b border-border p-6">
        <Text variant="h4" className="mb-1">
          Portfólio
        </Text>
        <Text className="mb-5 text-muted-foreground">
          Adicione fotos de trabalhos já realizados ({portfolioPaths.length}/6).
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {portfolioPaths.map((path, index) => (
            <View key={path} className="h-16 w-16">
              <Image
                source={{ uri: portfolioPreviewUrls[index] }}
                className="h-16 w-16 rounded-md border border-border bg-muted"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remover foto"
                onPress={() => removePhoto(index)}
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-destructive"
              >
                <Text className="text-xs font-bold text-destructive-foreground">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Button
          variant="outline"
          className="mt-4"
          onPress={addPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text>Adicionar foto</Text>
          )}
        </Button>
      </View>

      <View className="mb-10 p-6" pointerEvents={loading ? "none" : "auto"}>
        <Button size="lg" onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.colors.surface} /> : <Text>Salvar Perfil</Text>}
        </Button>
      </View>
    </ScrollView>
  );
}
