import {
  isClerkAPIResponseError,
  useAuth,
  useClerk,
  useSignUp,
} from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Text } from "../../components/ui/text";
import { theme } from "../../components/theme";

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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 14 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="h2">Criar Conta</Text>
      <Text className="mb-2 text-muted-foreground">
        Preencha os dados abaixo para se cadastrar na plataforma Opus Freelas.
      </Text>

      {!sent ? (
        <>
          <View className="gap-1">
            <Text className="text-sm font-semibold">Telefone com DDD</Text>
            <Input
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+55 49 99999-9999"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-semibold">Nome de Usuário (Username)</Text>
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Seu nome de usuário"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-semibold">Senha</Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Button
            className="mt-2"
            onPress={handleSignUpSubmit}
            disabled={loading || !phoneInput.trim() || !username.trim() || !password}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text>Cadastrar e Enviar Código</Text>
            )}
          </Button>
        </>
      ) : (
        <>
          <Text className="font-medium text-primary">
            Código de verificação SMS enviado para seu telefone.
          </Text>

          <View className="gap-1">
            <Text className="text-sm font-semibold">Código OTP</Text>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder="Digite o código"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
            />
          </View>

          <Button className="mt-2" onPress={handleVerifyCode} disabled={loading || !code.trim()}>
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text>Confirmar Código e Concluir</Text>
            )}
          </Button>

          <Button variant="ghost" onPress={handleResendCode} disabled={loading}>
            <Text>Reenviar código SMS</Text>
          </Button>

          <Button variant="ghost" onPress={handleReset} disabled={loading}>
            <Text>Alterar dados de cadastro</Text>
          </Button>
        </>
      )}

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="mt-5 flex-row items-center justify-center gap-1">
        <Text className="text-sm text-muted-foreground">Já possui uma conta?</Text>
        <Button variant="link" size="sm" onPress={() => router.push("/sign-in")}>
          <Text>Entrar</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
