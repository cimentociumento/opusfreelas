import {
  isClerkAPIResponseError,
  useAuth,
  useClerk,
  useSignUp,
} from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";

function formatE164(phone: string) {
  let trimmed = phone.trim();

  if (trimmed.startsWith("00")) {
    trimmed = "+" + trimmed.slice(2);
  }

  if (trimmed.startsWith("+")) {
    let digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("550")) {
      digits = "55" + digits.slice(3);
    }
    return `+${digits}`;
  }

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return "";

  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  const localPart = digits.slice(4);
  if (localPart.length === 8 && /^[6-9]/.test(localPart)) {
    const ddd = digits.slice(2, 4);
    digits = `55${ddd}9${localPart}`;
  }

  return `+${digits}`;
}

function normalizeOtpCode(code: string) {
  return code.replace(/\D/g, "").trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? fallback;
  }
  return fallback;
}

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { setActive: activateSession } = useClerk();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const [phoneInput, setPhoneInput] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  const loaded = authLoaded && signUpLoaded;

  if (authLoaded && isSignedIn) {
    return <Redirect href="/" />;
  }

  async function activateClerkSession(sessionId: string | null | undefined) {
    if (!sessionId) throw new Error("Sessão não foi criada. Tente novamente.");
    await activateSession({ session: sessionId });
    router.replace("/");
  }

  async function handleSignUpSubmit() {
    if (!loaded || !signUp) return;

    const trimmedPhone = phoneInput.trim();
    const trimmedUsername = username.trim();

    if (!trimmedPhone) {
      setError("Informe seu telefone com DDD.");
      return;
    }
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

    const phone = formatE164(trimmedPhone);

    try {
      await signUp.create({
        phoneNumber: phone,
        username: trimmedUsername,
        password,
        legalAccepted: true,
      });

      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível realizar o cadastro. Verifique os dados fornecidos."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!loaded || !signUp || !sent) return;
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    const normalizedCode = normalizeOtpCode(code);
    if (!normalizedCode) {
      setError("Informe o código recebido por SMS.");
      verifyingRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result = await signUp.attemptPhoneNumberVerification({ code: normalizedCode });

      if (result.status === "complete") {
        await activateClerkSession(result.createdSessionId);
        return;
      }

      if (result.status === "missing_requirements") {
        if (result.missingFields?.includes("legal_accepted")) {
          await signUp.update({ legalAccepted: true });
        }

        if (signUp.status === "complete") {
          await activateClerkSession(signUp.createdSessionId);
          return;
        }

        throw new Error(`Campos faltantes no cadastro: ${JSON.stringify(signUp.missingFields)}`);
      }

      throw new Error(`Cadastro incompleto (${result.status ?? "desconhecido"}).`);
    } catch (err) {
      setError(getErrorMessage(err, "Código inválido ou expirado."));
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!loaded || !signUp) return;

    setLoading(true);
    setError(null);
    setCode("");

    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível reenviar o código."));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSent(false);
    setCode("");
    setError(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Criar Conta</Text>
      <Text style={styles.subtitle}>
        Preencha os dados abaixo para se cadastrar na plataforma Opus Freelas.
      </Text>

      {!sent ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Telefone com DDD</Text>
            <TextInput
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+55 49 99999-9999"
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome de Usuário (Username)</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Seu nome de usuário"
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
              placeholder="Sua senha"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.button, (loading || !phoneInput.trim() || !username.trim() || !password) && styles.buttonDisabled]}
            onPress={handleSignUpSubmit}
            disabled={loading || !phoneInput.trim() || !username.trim() || !password}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Cadastrar e Enviar Código</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.hint}>Código de verificação SMS enviado para seu telefone.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Código OTP</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Digite o código"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.button, (loading || !code.trim()) && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading || !code.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Confirmar Código e Concluir</Text>}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleResendCode} disabled={loading}>
            <Text style={styles.secondaryButtonLabel}>Reenviar código SMS</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleReset} disabled={loading}>
            <Text style={styles.secondaryButtonLabel}>Alterar dados de cadastro</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.footerLinkContainer}>
        <Text style={styles.footerText}>Já possui uma conta?</Text>
        <Pressable onPress={() => router.push("/sign-in")}>
          <Text style={styles.linkText}> Entrar</Text>
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
  hint: {
    fontSize: 14,
    color: "#116530",
    fontWeight: "500",
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
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    color: "#116530",
    fontWeight: "600",
    fontSize: 14,
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
