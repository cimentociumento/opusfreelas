import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Opus Freelas</Text>

      <SignedOut>
        <Text style={styles.subtitle}>Você está desconectado. Faça login com OTP para continuar.</Text>
        <Link href="/sign-in" style={styles.link}>
          Ir para login
        </Link>
      </SignedOut>

      <SignedIn>
        <SignedInContent />
      </SignedIn>
    </View>
  );
}

function SignedInContent() {
  const { signOut } = useAuth();

  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>Sessão ativa com Clerk</Text>
      
      <View style={styles.menu}>
        <Text style={styles.menuTitle}>Contratante</Text>
        <Link href="/discovery" style={styles.menuItem}>
          <Text style={styles.menuText}>🔍 Encontrar Profissionais</Text>
        </Link>
        <Link href="/demands/create" style={styles.menuItemSecondary}>
          <Text style={styles.menuTextSecondary}>Publicar Nova Demanda</Text>
        </Link>
        <Link href="/demands" style={styles.menuItemSecondary}>
          <Text style={styles.menuTextSecondary}>Minhas Demandas</Text>
        </Link>

        <Text style={[styles.menuTitle, { marginTop: 20 }]}>Prestador</Text>
        <Link href="/profile/provider-setup" style={styles.menuItem}>
          <Text style={styles.menuText}>⚙️ Configurar Meu Perfil</Text>
        </Link>
      </View>

      <Text style={styles.link} onPress={() => signOut()}>
        Sair
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#116530",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 24,
  },
  card: {
    alignItems: "center",
    width: "100%",
  },
  menu: {
    width: "100%",
    marginBottom: 32,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: "#116530",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  menuText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  menuItemSecondary: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  menuTextSecondary: {
    color: "#444",
    fontWeight: "700",
    fontSize: 15,
  },
  link: {
    color: "#d32f2f",
    fontWeight: "700",
    fontSize: 16,
  },
});
