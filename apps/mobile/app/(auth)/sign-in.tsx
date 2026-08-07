import {
  isClerkAPIResponseError,
  useAuth,
  useClerk,
  useSignIn,
} from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (isClerkAPIResponseError(error)) {
    const firstErr = error.errors[0];
    if (firstErr) {
      if (firstErr.code === "form_identifier_not_found") {
        return "Usuário não encontrado. Verifique o nome de usuário digitado.";
      }
      if (firstErr.code === "form_password_incorrect") {
        return "Senha incorreta. Tente novamente.";
      }
      return firstErr.longMessage ?? firstErr.message ?? fallback;
    }
  }
  return fallback;
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { setActive: activateSession } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = authLoaded && signInLoaded;

  if (authLoaded && isSignedIn) {
    return <Redirect href="/" />;
  }

  async function activateClerkSession(sessionId: string | null | undefined) {
    if (!sessionId) throw new Error("Sessão não foi criada. Tente novamente.");
    await activateSession({ session: sessionId });
    router.replace("/");
  }

  async function handleSignIn() {
    if (!loaded || !signIn) return;

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError("Informe seu nome de usuário.");
      return;
    }
    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: trimmedUsername,
        password,
      });

      if (result.status === "complete") {
        await activateClerkSession(result.createdSessionId);
        return;
      }

      throw new Error(`Login incompleto (${result.status ?? "desconhecido"}).`);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível realizar o login. Verifique suas credenciais."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Entrar na Conta</Text>
      <Text style={styles.subtitle}>
        Informe seu nome de usuário e senha para acessar o Opus Freelas.
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Nome de Usuário (Username)</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Digite seu nome de usuário"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Digite sua senha"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      <Pressable
        style={[styles.button, (loading || !username.trim() || !password) && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={loading || !username.trim() || !password}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Entrar</Text>}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.footerLinkContainer}>
        <Text style={styles.footerText}>Não tem uma conta?</Text>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text style={styles.linkText}> Cadastre-se</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  button: {
    backgroundColor: "#116530",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    color: "#b00020",
    fontSize: 14,
    marginTop: 4,
  },
  footerLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#116530",
  },
});
