import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useRpcWithDevMode } from "../../../hooks/use-rpc-with-dev-mode";
import { useLocation } from "../../../hooks/use-location";
import { useEffectiveUserId } from "../../../hooks/use-effective-user-id";
import { serviceCategories, ServiceCategory } from "@amauc/shared";
import { theme, useToast } from "../../../components";
import { resolvePortfolioContentType, isProviderSocialProfileComplete } from "../../../lib/portfolio";

export default function ProviderSetupScreen() {
  const router = useRouter();
  const { callRpc } = useRpcWithDevMode();
  const { isReady: isAuthReady } = useEffectiveUserId();
  const { showToast } = useToast();
  const isSavingRef = useRef(false);
  const providerRoleEnsuredRef = useRef(false);

  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { location, loading: locationLoading } = useLocation();

  const [municipality, setMunicipality] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [portfolioPaths, setPortfolioPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Espera o modo dev/Clerk resolverem — senão o RPC dispara com o
    // isDevMode inicial (falso) e cai no caminho Clerk sem sessão real.
    if (!isAuthReady) return;

    let mounted = true;
    const loadProfile = async () => {
      try {
        const profile = await callRpc<{
          serviceCategories?: ServiceCategory[];
          displayName?: string | null;
          municipality?: string | null;
          bio?: string | null;
          yearsExperience?: number | null;
          portfolioUrls?: string[];
        }>("identity.getProfile");
        if (mounted && profile) {
          if (profile.serviceCategories) setSelectedCategories(profile.serviceCategories);
          if (profile.displayName) setDisplayName(profile.displayName);
          if (profile.municipality) setMunicipality(profile.municipality);
          if (profile.bio) setBio(profile.bio);
          if (profile.yearsExperience != null) setYearsExperience(String(profile.yearsExperience));
          if (profile.portfolioUrls) setPortfolioPaths(profile.portfolioUrls);
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
  }, [callRpc, isAuthReady]);

  const toggleCategory = (cat: ServiceCategory) => {
    if (loading) return;
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
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      // Entrar nesta tela e adicionar foto é intenção provider inequívoca — promove
      // o papel antes do upload para não bater no gate 403 da API (contratante que
      // chega pelo botão "Configurar Meu Perfil" ainda não tem is_provider=true).
      await ensureProviderRole();
      const { path } = await callRpc<{ path: string }>("identity.uploadPortfolioImage", {
        imageBase64: asset.base64,
        contentType: resolvePortfolioContentType(asset.mimeType),
      });
      setPortfolioPaths((prev) => [...prev, path]);
    } catch (error: any) {
      // Rede rural intermitente: não trava o formulário; o gate de visibilidade
      // cobre portfólio vazio. Ver spec §Erros.
      showToast(error.message ?? "Não foi possível enviar a foto.", "error");
    } finally {
      setUploading(false);
    }
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

    try {
      await callRpc("identity.updateRoles", {
        isContractor: true,
        isProvider: true,
      });

      await callRpc("identity.updateProviderProfile", {
        latitude: location.latitude,
        longitude: location.longitude,
        serviceCategories: selectedCategories,
      });

      const trimmedCity = municipality.trim();
      if (trimmedCity && displayName.trim()) {
        // updateProfile writes displayName + municipality together; reuse the
        // reidrated displayName so we don't blank it out.
        await callRpc("identity.updateProfile", {
          displayName: displayName.trim(),
          municipality: trimmedCity,
        });
      }

      const years = Number(yearsExperience);
      const isComplete = isProviderSocialProfileComplete({
        bio,
        yearsExperience: Number.isFinite(years) ? years : null,
        photoCount: portfolioPaths.length,
      });

      if (isComplete) {
        await callRpc("identity.updateProviderSocialProfile", {
          bio: bio.trim(),
          yearsExperience: Math.max(0, Math.min(60, Math.trunc(years))),
          portfolioUrls: portfolioPaths,
        });
      }

      // Only claim search visibility when the completeness gate actually
      // passed — skipping updateProviderSocialProfile above leaves the
      // provider hidden from search, and the message must not lie about that.
      if (isComplete) {
        showToast("Perfil atualizado! Agora você pode ser encontrado por contratantes.", "success");
      } else {
        showToast(
          "Perfil salvo. Complete sua bio (mín. 40 caracteres), anos de experiência e ao menos 1 foto para aparecer nas buscas.",
          "info"
        );
      }
      router.replace("/");
    } catch (error: any) {
      isSavingRef.current = false;
      setLoading(false);
      showToast(error.message, "error");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Configurar Perfil" }} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suas Categorias</Text>
        <Text style={styles.sectionSubtitle}>Selecione os serviços que você oferece</Text>

        <View style={styles.grid}>
          {serviceCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat as ServiceCategory);
            return (
              <Pressable
                key={cat}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleCategory(cat as ServiceCategory)}
                disabled={loading}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localização</Text>
        <Text style={styles.sectionSubtitle}>
          Informe a cidade onde você atende os contratantes.
        </Text>
        <TextInput
          value={municipality}
          onChangeText={setMunicipality}
          placeholder="Sua cidade"
          autoCapitalize="words"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre você</Text>
        <Text style={styles.sectionSubtitle}>
          Conte sua experiência para contratantes conhecerem seu trabalho.
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Conte sua experiência (mínimo 40 caracteres)"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anos de experiência</Text>
        <TextInput
          value={yearsExperience}
          onChangeText={setYearsExperience}
          placeholder="Ex: 5"
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portfólio</Text>
        <Text style={styles.sectionSubtitle}>
          Adicione fotos de trabalhos já realizados ({portfolioPaths.length}/6).
        </Text>
        <View style={styles.grid}>
          {portfolioPaths.map((path) => (
            // portfolioPaths guarda o caminho de storage (não a URL pública ainda,
            // ver spec §Portfólio) — placeholder até existir endpoint de leitura assinado.
            <View key={path} style={styles.photoThumb}>
              <Text style={styles.photoThumbText}>Foto</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.addPhotoBtn, uploading && styles.addPhotoBtnDisabled]}
          onPress={addPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={styles.addPhotoBtnText}>Adicionar foto</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer} pointerEvents={loading ? "none" : "auto"}>
        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar Perfil</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#eee",
  },
  photoThumbText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  addPhotoBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addPhotoBtnDisabled: {
    opacity: 0.6,
  },
  addPhotoBtnText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    padding: 24,
    marginBottom: 40,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
