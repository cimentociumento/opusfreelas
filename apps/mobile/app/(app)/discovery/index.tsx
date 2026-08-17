import { Pressable, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { serviceCategories } from "@amauc/shared";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";

const CATEGORY_ICON: Record<string, string> = {
  "Roçada / Capina": "🌱",
  "Diarista / Faxina": "🧹",
  "Operador de Máquina Agrícola": "🚜",
  "Serviços Gerais / Pequenos Reparos": "🔧",
  "Pedreiro / Servente": "🧱",
  Pintura: "🎨",
  "Eletricista / Encanador": "⚡",
  "Cuidado com Animais": "🐕",
};

export default function DiscoveryScreen() {
  const router = useRouter();

  const handleCategorySelect = (category: string) => {
    router.push({
      pathname: "/discovery/results",
      params: { category },
    });
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "O que você precisa?" }} />

      <View className="border-b border-border bg-card p-6">
        <Text variant="h2" className="mb-2 text-primary">
          Encontre profissionais
        </Text>
        <Text className="text-muted-foreground">Escolha o serviço que você precisa</Text>
      </View>

      <View className="flex-row flex-wrap gap-4 p-4">
        {serviceCategories.map((item) => (
          <Card key={item} className="w-[47%] min-h-36 items-center p-6">
            <Pressable
              className="w-full items-center"
              onPress={() => handleCategorySelect(item)}
              accessibilityRole="button"
            >
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-3xl">{CATEGORY_ICON[item] ?? "📋"}</Text>
              </View>
              <Text className="mb-1 text-center text-sm font-bold">{item}</Text>
              <Text className="text-center text-xs text-muted-foreground">Ver profissionais</Text>
            </Pressable>
          </Card>
        ))}
      </View>

      <View className="mb-8 p-6">
        <Card className="p-6">
          <Button variant="outline" size="lg" onPress={() => handleCategorySelect("")}>
            <Text>Ver todos os profissionais</Text>
          </Button>
        </Card>
      </View>
    </ScrollView>
  );
}
