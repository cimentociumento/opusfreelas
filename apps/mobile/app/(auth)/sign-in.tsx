import {
  isClerkAPIResponseError,
  useAuth,
  useClerk,
  useSignIn,
} from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Text } from "../../components/ui/text";
import { theme } from "../../components/theme";

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
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<string | null>(null);

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

      if (result.status === "needs_second_factor") {
        const factor = result.supportedSecondFactors?.[0] as any;
        if (factor) {
          if (factor.strategy === "phone_code") {
            await signIn.prepareSecondFactor({
              strategy: "phone_code",
              phoneNumberId: factor.phoneNumberId,
            });
          }
          setSecondFactorStrategy(factor.strategy);
          setNeedsSecondFactor(true);
          return;
        }
      }

      throw new Error(`Login incompleto (${result.status ?? "desconhecido"}).`);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível realizar o login. Verifique suas credenciais."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySecondFactor() {
    if (!loaded || !signIn || !secondFactorStrategy) return;

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError("Informe o código de verificação.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy as any,
        code: trimmedCode,
      });

      if (result.status === "complete") {
        await activateClerkSession(result.createdSessionId);
        return;
      }

      throw new Error(`Login incompleto (${result.status ?? "desconhecido"}).`);
    } catch (err) {
      setError(getErrorMessage(err, "Código inválido ou expirado."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 14 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="h2">Entrar na Conta</Text>
      {!needsSecondFactor ? (
        <Text className="mb-2 text-muted-foreground">
          Informe seu nome de usuário e senha para acessar o Opus Freelas.
        </Text>
      ) : (
        <Text className="mb-2 text-muted-foreground">
          {secondFactorStrategy === "phone_code"
            ? "Um código de verificação foi enviado para o seu telefone."
            : "Digite o código de verificação do seu aplicativo ou SMS."}
        </Text>
      )}

      {!needsSecondFactor ? (
        <>
          <View className="gap-1">
            <Text className="text-sm font-semibold">Nome de Usuário (Username)</Text>
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Digite seu nome de usuário"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-semibold">Senha</Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Button
            className="mt-2"
            onPress={handleSignIn}
            disabled={loading || !username.trim() || !password}
          >
            {loading ? <ActivityIndicator color={theme.colors.surface} /> : <Text>Entrar</Text>}
          </Button>
        </>
      ) : (
        <>
          <View className="gap-1">
            <Text className="text-sm font-semibold">Código de Verificação</Text>
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

          <Button className="mt-2" onPress={handleVerifySecondFactor} disabled={loading || !code.trim()}>
            {loading ? <ActivityIndicator color={theme.colors.surface} /> : <Text>Confirmar Código</Text>}
          </Button>

          <Button
            variant="ghost"
            onPress={() => {
              setNeedsSecondFactor(false);
              setCode("");
              setError(null);
            }}
            disabled={loading}
          >
            <Text>Voltar</Text>
          </Button>
        </>
      )}

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      {!needsSecondFactor && (
        <View className="mt-5 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-muted-foreground">Não tem uma conta?</Text>
          <Button variant="link" size="sm" onPress={() => router.push("/sign-up")}>
            <Text>Cadastre-se</Text>
          </Button>
        </View>
      )}
    </ScrollView>
  );
}
