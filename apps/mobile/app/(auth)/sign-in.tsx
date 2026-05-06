import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

function toBrazilE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) {
    return `+${digits}`;
  }
  return `+55${digits}`;
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = authLoaded && signInLoaded && signUpLoaded;

  if (authLoaded && isSignedIn) {
    return <Redirect href="/" />;
  }

  async function sendCode() {
    if (!loaded) return;
    setLoading(true);
    setError(null);

    const phone = toBrazilE164(phoneInput);

    try {
      await signIn.create({ identifier: phone });
      const phoneFactor = signIn.supportedFirstFactors?.find((f) => f.strategy === "phone_code");
      if (phoneFactor && "phoneNumberId" in phoneFactor && phoneFactor.phoneNumberId) {
        await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: phoneFactor.phoneNumberId,
        });
        setSent(true);
        return;
      }
      throw new Error("Fator telefone indisponivel apos create.");
    } catch {
      try {
        await signUp.create({ phoneNumber: phone });
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
        setSent(true);
      } catch (innerError) {
        setError((innerError as Error).message ?? "N\u00e3o foi poss\u00edvel enviar o c\u00f3digo.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!loaded || !sent) return;
    setLoading(true);
    setError(null);

    try {
      const signInResult = await signIn.attemptFirstFactor({
        strategy: "phone_code",
        code,
      });

      if (signInResult.status === "complete") {
        await setActive?.({ session: signInResult.createdSessionId });
        router.replace("/");
        return;
      }

      const signUpResult = await signUp.attemptPhoneNumberVerification({ code });
      if (signUpResult.status === "complete") {
        await setActive?.({ session: signUpResult.createdSessionId });
        router.replace("/");
        return;
      }

      setError("C\u00f3digo inv\u00e1lido ou expirado.");
    } catch (verifyError) {
      setError((verifyError as Error).message ?? "N\u00e3o foi poss\u00edvel validar o c\u00f3digo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar com telefone</Text>
      <Text style={styles.subtitle}>Use seu n\u00famero em formato brasileiro (+55).</Text>

      <TextInput
        value={phoneInput}
        onChangeText={setPhoneInput}
        placeholder="(49) 99999-9999"
        keyboardType="phone-pad"
        autoCapitalize="none"
        style={styles.input}
      />

      {!sent ? (
        <Pressable style={styles.button} onPress={sendCode} disabled={loading || !phoneInput.trim()}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Enviar c\u00f3digo</Text>}
        </Pressable>
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="C\u00f3digo OTP"
            keyboardType="number-pad"
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={verifyCode} disabled={loading || !code.trim()}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Confirmar c\u00f3digo</Text>}
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
  error: {
    color: "#b00020",
  },
});