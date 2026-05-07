import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";
import { serviceCategories } from "@amauc/shared";
import { Card, Button, theme } from "../../../components";
import { useDevelopmentMode } from "../../../hooks/use-development-mode";

export default function DiscoveryScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const { isDevMode } = useDevelopmentMode();

  console.log(`🛠️ DiscoveryScreen: isDevMode = ${isDevMode}`);

  const handleCategorySelect = (category: string) => {
    router.push({
      pathname: "/discovery/results",
      params: { category }
    });
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      "Roçada / Capina": "🌱",
      "Diarista / Faxina": "🧹",
      "Operador de Máquina Agrícola": "🚜",
      "Serviços Gerais / Pequenos Reparos": "🔧",
      "Pedreiro / Servente": "🧱",
      "Pintura": "🎨",
      "Eletricista / Encanador": "⚡",
      "Cuidado com Animais": "🐕",
    };
    return icons[category] || "📋";
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "O que você precisa?" }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Encontre profissionais</Text>
        <Text style={styles.subtitle}>Escolha o serviço que você precisa</Text>
      </View>

      <View style={styles.grid}>
        {serviceCategories.map((item) => (
          <Card 
            key={item} 
            variant="elevated"
            style={styles.categoryCard}
          >
            <TouchableOpacity onPress={() => handleCategorySelect(item)}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>{getCategoryIcon(item)}</Text>
              </View>
              <Text style={styles.categoryText}>{item}</Text>
              <Text style={styles.categorySubtext}>Ver profissionais</Text>
            </TouchableOpacity>
          </Card>
        ))}
      </View>

      <View style={styles.footer}>
        <Card style={styles.allCard}>
          <Button 
            title="🔍 Ver todos os profissionais" 
            variant="outline" 
            size="lg"
            onPress={() => handleCategorySelect("")}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  categoryCard: {
    width: "47%",
    alignItems: "center",
    padding: theme.spacing.lg,
    minHeight: 140,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  categoryText: {
    ...theme.typography.body2,
    color: theme.colors.text,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  categorySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  footer: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  allCard: {
    padding: theme.spacing.lg,
  },
});
