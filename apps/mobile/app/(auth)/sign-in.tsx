import {
  isClerkAPIResponseError,
  useAuth,
  useClerk,
  useSignIn,
  useSignUp,
} from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

function toBrazilE164(phone: string) {
  let digits = phone.replace(/\D/g, "");

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  // Celular BR sem o nono digito: 55 + DDD(2) + 8 = 12 digitos.
  if (digits.length === 12) {
    const areaCode = digits.slice(2, 4);
    const localNumber = digits.slice(4);
    if (localNumber.length === 8 && /^[6-9]/.test(localNumber)) {
      digits = `55${areaCode}9${localNumber}`;
    }
  }

  return `+${digits}`;
}

function normalizeOtpCode(code: string) {
  return code.replace(/\D/g, "").trim();
}

function isSignUpIfMissingTransferError(error: unknown) {
  if (!isClerkAPIResponseError(error)) {
    return false;
  }

  return error.errors.some((entry) => entry.code === "sign_up_if_missing_transfer");
}

function isVerificationCodeError(error: unknown) {
  if (!isClerkAPIResponseError(error)) {
    return false;
  }

  return error.errors.some((entry) =>
    [
      "form_code_incorrect",
      "verification_expired",
      "verification_failed",
      "form_param_format_invalid",
    ].includes(entry.code ?? ""),
  );
}

function isSignInNotIdentifiedError(error: unknown) {
  if (!isClerkAPIResponseError(error)) {
    return false;
  }

  return error.errors.some((entry) => {
    const message = `${entry.message ?? ""} ${entry.longMessage ?? ""}`.toLowerCase();
    return (
      entry.code === "sign_in_attempt_not_identified" ||
      message.includes("not identified") ||
      message.includes("identify first")
    );
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? fallback;
  }

  return fallback;
}

function getPhoneCodeFactor(signIn: NonNullable<ReturnType<typeof useSignIn>["signIn"]>) {
  return signIn.supportedFirstFactors?.find((factor) => factor.strategy === "phone_code");
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { setActive: activateSession } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = authLoaded && signInLoaded && signUpLoaded;

  if (authLoaded && isSignedIn) {
    return <Redirect href="/" />;
  }

  function resetToIdentification(message?: string) {
    setSent(false);
    setPendingPhone(null);
    setCode("");
    setError(message ?? null);
  }

  async function activateClerkSession(sessionId: string | null | undefined) {
    if (!sessionId) {
      throw new Error("Sessao nao foi criada. Tente novamente.");
    }

    await activateSession({ session: sessionId });
    router.replace("/");
  }

  async function completeSignUpIfNeeded() {
    if (!signUp) {
      throw new Error("Cadastro indisponivel. Tente novamente.");
    }

    if (signUp.status === "complete") {
      await activateClerkSession(signUp.createdSessionId);
      return;
    }

    if (signUp.status !== "missing_requirements") {
      throw new Error(`Cadastro incompleto (${signUp.status ?? "desconhecido"}).`);
    }

    if (signUp.missingFields.includes("legal_accepted")) {
      await signUp.update({ legalAccepted: true });
    }

    const signUpStatus = signUp.status as string;
    if (signUpStatus === "complete") {
      await activateClerkSession(signUp.createdSessionId);
      return;
    }

    const pendingFields = signUp.missingFields.join(", ");
    throw new Error(
      pendingFields
        ? `Complete seu cadastro: ${pendingFields}.`
        : "Cadastro incompleto. Tente novamente.",
    );
  }

  async function transferToSignUp() {
    if (!signUp) {
      throw new Error("Cadastro indisponivel. Tente novamente.");
    }

    await signUp.create({ transfer: true });
    await completeSignUpIfNeeded();
  }

  async function sendCode() {
    if (!loaded || !signIn) return;

    setLoading(true);
    setError(null);
    setCode("");

    const phone = toBrazilE164(phoneInput);

    try {
      await signIn.create({
        identifier: phone,
        signUpIfMissing: true,
      } as Parameters<NonNullable<typeof signIn>["create"]>[0]);

      if (signIn.status === "needs_identifier") {
        throw new Error("Informe um telefone valido para continuar.");
      }

      if (signIn.status !== "needs_first_factor") {
        throw new Error(`Nao foi possivel iniciar a verificacao (${signIn.status ?? "desconhecido"}).`);
      }

      const phoneFactor = getPhoneCodeFactor(signIn);
      if (!phoneFactor || !("phoneNumberId" in phoneFactor) || !phoneFactor.phoneNumberId) {
        throw new Error("Verificacao por SMS indisponivel para este numero.");
      }

      await signIn.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: phoneFactor.phoneNumberId,
      });

      setPendingPhone(phone);
      setSent(true);
    } catch (sendError) {
      setError(getErrorMessage(sendError, "Nao foi possivel enviar o codigo."));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!loaded || !signIn || !pendingPhone) return;

    setLoading(true);
    setError(null);
    setCode("");

    try {
      const phoneFactor = getPhoneCodeFactor(signIn);
      if (!phoneFactor || !("phoneNumberId" in phoneFactor) || !phoneFactor.phoneNumberId) {
        throw new Error("Nao foi possivel reenviar o codigo.");
      }

      await signIn.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: phoneFactor.phoneNumberId,
      });
    } catch (resendError) {
      if (isSignInNotIdentifiedError(resendError) || signIn.status === "needs_identifier") {
        resetToIdentification("Sessao expirada. Informe seu telefone novamente.");
        return;
      }

      setError(getErrorMessage(resendError, "Nao foi possivel reenviar o codigo."));
    } finally {
      setLoading(false);
    }
  }

  async function finalizeVerifiedSignIn() {
    if (!signIn) {
      throw new Error("Autenticacao indisponivel. Tente novamente.");
    }

    if (signIn.status === "complete") {
      await activateClerkSession(signIn.createdSessionId);
      return;
    }

    if (signIn.status === "needs_second_factor") {
      throw new Error("Autenticacao adicional necessaria. Entre em contato com o suporte.");
    }

    const signInStatus = signIn.status as string;
    if (signInStatus === "needs_client_trust") {
      throw new Error("Verificacao adicional de seguranca necessaria no painel Clerk.");
    }

    const verificationStatus = signIn.firstFactorVerification?.status;
    if (verificationStatus === "failed" || verificationStatus === "expired") {
      throw new Error("Codigo invalido ou expirado. Solicite um novo codigo.");
    }

    throw new Error(`Verificacao incompleta (${signIn.status ?? "desconhecido"}).`);
  }

  async function verifyCode() {
    if (!loaded || !sent || !signIn) return;

    const normalizedCode = normalizeOtpCode(code);
    if (!normalizedCode) {
      setError("Informe o codigo recebido por SMS.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (signIn.status === "needs_identifier") {
        resetToIdentification("Sessao expirada. Informe seu telefone novamente.");
        return;
      }

      if (signIn.status !== "needs_first_factor") {
        resetToIdentification("Estado de autenticacao invalido. Envie o codigo novamente.");
        return;
      }

      try {
        await signIn.attemptFirstFactor({
          strategy: "phone_code",
          code: normalizedCode,
        });
        await finalizeVerifiedSignIn();
      } catch (verifyError) {
        if (isSignUpIfMissingTransferError(verifyError)) {
          await transferToSignUp();
          return;
        }

        if (isSignInNotIdentifiedError(verifyError)) {
          resetToIdentification("Sessao expirada. Informe seu telefone novamente.");
          return;
        }

        if (isVerificationCodeError(verifyError)) {
          setError(getErrorMessage(verifyError, "Codigo invalido ou expirado."));
          return;
        }

        throw verifyError;
      }
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, "Nao foi possivel validar o codigo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar com telefone</Text>
      <Text style={styles.subtitle}>Use seu numero em formato brasileiro (+55).</Text>

      <TextInput
        value={phoneInput}
        onChangeText={setPhoneInput}
        placeholder="(49) 99999-9999"
        keyboardType="phone-pad"
        autoCapitalize="none"
        editable={!sent}
        style={styles.input}
      />

      {!sent ? (
        <Pressable style={styles.button} onPress={sendCode} disabled={loading || !phoneInput.trim()}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Enviar codigo</Text>}
        </Pressable>
      ) : (
        <>
          <Text style={styles.hint}>Codigo enviado para {pendingPhone ?? "seu telefone"}.</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Codigo OTP"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={verifyCode} disabled={loading || !code.trim()}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Confirmar codigo</Text>}
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={resendCode} disabled={loading}>
            <Text style={styles.secondaryButtonLabel}>Reenviar codigo</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => resetToIdentification()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonLabel}>Usar outro telefone</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  hint: {
    fontSize: 13,
    opacity: 0.75,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#116530",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryButtonLabel: {
    color: "#116530",
    fontWeight: "600",
  },
  error: {
    color: "#b00020",
  },
});
