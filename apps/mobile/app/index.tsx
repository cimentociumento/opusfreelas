import { useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { Button, Card, DevModeToggle, DevAuthWrapper, theme } from "../components";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View testID="nativewind-gate1-probe" className="bg-red-500 h-10" />
      <ScrollView style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Opus Freelas</Text>
          <Text style={styles.tagline}>Conectando profissionais locais à quem precisa</Text>
        </View>

        <DevAuthWrapper
          signedOutComponent={
            <View style={styles.authSection}>
              <Card style={styles.authCard}>
                <Text style={styles.authTitle}>Bem-vindo ao Opus Freelas</Text>
                <Text style={styles.authSubtitle}>
                  Encontre os melhores profissionais para serviços manuais e rurais na região da AMAUC
                </Text>
                <Button
                  title="Entrar e Começar"
                  variant="primary"
                  size="lg"
                  onPress={() => router.push("/sign-in")}
                />
              </Card>
            </View>
          }
          signedInComponent={<SignedInContent />}
        />

        {/* Development Mode Toggle */}
        <View style={styles.devToggleContainer}>
          <DevModeToggle />
        </View>
      </ScrollView>
    </>
  );
}

function SignedInContent() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.content}>
      <View style={styles.welcomeSection}>
        <Card style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Olá! 👋</Text>
          <Text style={styles.welcomeSubtitle}>
            Encontre profissionais para seus serviços
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏠 Sou Contratante</Text>
        <Card variant="elevated" style={styles.actionCard}>
          <Button
            title="🔍 Encontrar Profissionais"
            variant="primary"
            size="lg"
            style={styles.actionButton}
            onPress={() => router.push("/discovery")}
          />
          <Button
            title="📝 Publicar Demanda"
            variant="secondary"
            size="md"
            style={styles.actionButton}
            onPress={() => router.push("/demands/create")}
          />
          <Button
            title="📋 Minhas Demandas"
            variant="outline"
            size="md"
            style={styles.actionButton}
            onPress={() => router.push("/demands")}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍🔧 Sou Prestador</Text>
        <Card variant="elevated" style={styles.actionCard}>
          <Button
            title="⚙️ Configurar Meu Perfil"
            variant="primary"
            size="lg"
            style={styles.actionButton}
            onPress={() => router.push("/profile/provider-setup")}
          />
          <Button
            title="📋 Vagas na Região"
            variant="secondary"
            size="lg"
            style={styles.actionButton}
            onPress={() => router.push("/demands/available")}
          />
        </Card>
      </View>

      <View style={styles.logoutSection}>
        <Button
          title="Sair"
          variant="ghost"
          size="sm"
          onPress={() => signOut()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  title: {
    ...theme.typography.h1,
    color: "#fff",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    ...theme.typography.body1,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  content: {
    padding: theme.spacing.lg,
  },
  authSection: {
    marginTop: theme.spacing.xl,
  },
  authCard: {
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  authTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  authSubtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
  },
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  welcomeCard: {
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  welcomeTitle: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  welcomeSubtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.sm,
  },
  actionCard: {
    padding: theme.spacing.lg,
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
  logoutSection: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
  },
  devToggleContainer: {
    position: "absolute",
    top: theme.spacing.lg,
    right: theme.spacing.md,
    zIndex: 1000,
  },
});
