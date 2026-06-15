import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme } from "./theme";

interface AlertAction {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertAction[];
}

const alertState: AlertState = {
  visible: false,
  title: "",
  message: "",
  buttons: [],
};

let showAlertCallback: ((state: AlertState) => void) | null = null;

export function useAlert() {
  const [, setTrigger] = useState(0);

  const showAlert = (title: string, message: string, buttons: AlertAction[] = []) => {
    alertState.visible = true;
    alertState.title = title;
    alertState.message = message;
    alertState.buttons =
      buttons.length > 0
        ? buttons
        : [{ text: "OK", style: "default" }];
    setTrigger((v) => v + 1);
    if (showAlertCallback) {
      showAlertCallback(alertState);
    }
  };

  return { showAlert };
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertState_, setAlertState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  React.useEffect(() => {
    showAlertCallback = setAlertState;
  }, []);

  const handleButtonPress = (button: AlertAction) => {
    button.onPress?.();
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  const getButtonStyle = (style?: string): ViewStyle => {
    switch (style) {
      case "destructive":
        return {
          backgroundColor: theme.colors.error,
          flex: 1,
        };
      case "cancel":
        return {
          backgroundColor: theme.colors.border,
          flex: 1,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          flex: 1,
        };
    }
  };

  const getButtonTextStyle = (style?: string): TextStyle => {
    switch (style) {
      case "destructive":
        return { color: "#fff" };
      case "cancel":
        return { color: theme.colors.text };
      default:
        return { color: "#fff" };
    }
  };

  return (
    <>
      {children}
      <Modal
        visible={alertState_.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setAlertState((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            {alertState_.title && (
              <Text style={styles.title}>{alertState_.title}</Text>
            )}
            <Text style={styles.message}>{alertState_.message}</Text>

            <View style={styles.buttonContainer}>
              {alertState_.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    getButtonStyle(button.style),
                    index > 0 && { marginLeft: theme.spacing.sm },
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      getButtonTextStyle(button.style),
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    minWidth: 280,
    maxWidth: "90%",
    ...theme.shadows.lg,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    fontWeight: "700",
  },
  message: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
  },
  button: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  buttonText: {
    ...theme.typography.body2,
    fontWeight: "700",
  },
});
