import { Platform, Alert } from "react-native";

type AlertAction = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export function useCrossAlert() {
  const showAlert = (title: string, message: string, buttons?: AlertAction[]) => {
    // Mobile nativo (iOS/Android) - usa Alert nativo
    if (Platform.OS !== "web") {
      const buttons_ = buttons || [{ text: "OK" }];
      Alert.alert(title, message, buttons_);
      return;
    }

    // Web - usa window.alert como fallback simples
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    // Web com múltiplos botões - cria uma estrutura visual
    const buttonTexts = buttons.map((b) => b.text).join(" / ");
    const response = window.prompt(`${title}\n\n${message}\n\n(${buttonTexts})`);

    // Simples - usa o primeiro botão que não é cancel
    if (response !== null) {
      const confirmButton = buttons.find(
        (b) => b.style !== "cancel" && b.style !== "destructive"
      ) || buttons[0];
      confirmButton?.onPress?.();
    } else {
      const cancelButton = buttons.find((b) => b.style === "cancel");
      cancelButton?.onPress?.();
    }
  };

  return { showAlert };
}
